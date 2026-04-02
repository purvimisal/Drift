import { Router, type IRouter, type Request, type Response } from "express";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod/v4";

const router: IRouter = Router();

function getOwnerFilter(req: Request) {
  const sessionId = (req.headers["x-drift-session"] as string) || null;
  const userId = req.user?.id ?? null;
  if (userId && sessionId) return or(eq(pushSubscriptionsTable.userId, userId), eq(pushSubscriptionsTable.sessionId, sessionId));
  if (userId) return eq(pushSubscriptionsTable.userId, userId);
  if (sessionId) return eq(pushSubscriptionsTable.sessionId, sessionId);
  return undefined;
}

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  timezone: z.string().default("UTC"),
});

const updateSchema = z.object({
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().default("UTC"),
});

router.get("/notifications/settings", async (req: Request, res: Response) => {
  const filter = getOwnerFilter(req);
  if (!filter) {
    return res.json({ subscribed: false, reminderTime: null });
  }
  const [sub] = await db.select().from(pushSubscriptionsTable).where(filter).limit(1);
  if (!sub) {
    return res.json({ subscribed: false, reminderTime: null, timezone: "UTC" });
  }
  return res.json({
    subscribed: true,
    reminderTime: sub.reminderTime,
    timezone: sub.timezone,
    endpoint: sub.endpoint,
  });
});

router.post("/notifications/subscribe", async (req: Request, res: Response) => {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid subscription data" });
  }
  const { endpoint, keys, reminderTime, timezone } = parsed.data;
  const sessionId = (req.headers["x-drift-session"] as string) || null;
  const userId = req.user?.id ?? null;

  if (!sessionId && !userId) {
    return res.status(400).json({ error: "No session or user" });
  }

  const filter = getOwnerFilter(req);
  const existing = filter ? await db.select().from(pushSubscriptionsTable).where(filter).limit(1) : [];

  if (existing.length > 0) {
    await db.update(pushSubscriptionsTable)
      .set({ endpoint, p256dh: keys.p256dh, auth: keys.auth, reminderTime, timezone, updatedAt: new Date() })
      .where(eq(pushSubscriptionsTable.id, existing[0].id));
  } else {
    await db.insert(pushSubscriptionsTable).values({
      sessionId,
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      reminderTime,
      timezone,
    });
  }

  return res.json({ success: true });
});

router.patch("/notifications/settings", async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid data" });
  }
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(400).json({ error: "No session or user" });

  await db.update(pushSubscriptionsTable)
    .set({ reminderTime: parsed.data.reminderTime, timezone: parsed.data.timezone, updatedAt: new Date() })
    .where(filter);

  return res.json({ success: true });
});

router.delete("/notifications/unsubscribe", async (req: Request, res: Response) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(400).json({ error: "No session or user" });
  await db.delete(pushSubscriptionsTable).where(filter);
  return res.json({ success: true });
});

export const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";

router.get("/notifications/vapid-public-key", (_req: Request, res: Response) => {
  res.json({ key: vapidPublicKey });
});

export default router;
