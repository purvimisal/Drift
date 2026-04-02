import cron from "node-cron";
import webpush from "web-push";
import { db, pushSubscriptionsTable, goalsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { logger } from "./logger";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:drift@replit.app";

function setupWebPush() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn("VAPID keys not configured — push notifications disabled");
    return false;
  }
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

function getCurrentHHMM(timezone: string): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  } catch {
    const now = new Date();
    return `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  }
}

const REMINDER_MESSAGES = [
  { title: "Time for today's intention ✨", body: "Your goal is waiting. Even 5 minutes counts." },
  { title: "A gentle nudge 🌿", body: "No pressure — just a small step today." },
  { title: "Drift reminder", body: "Today's task is ready for you. You've got this." },
  { title: "One small thing 🍃", body: "Open Drift and check in with your intention." },
];

async function sendDueReminders() {
  const ready = setupWebPush();
  if (!ready) return;

  let allSubs: { id: number; endpoint: string; p256dh: string; auth: string; reminderTime: string; timezone: string; userId: string | null; sessionId: string | null }[] = [];
  try {
    allSubs = await db.select().from(pushSubscriptionsTable);
  } catch (err) {
    logger.error({ err }, "Failed to fetch push subscriptions");
    return;
  }

  const due = allSubs.filter((sub) => {
    const current = getCurrentHHMM(sub.timezone);
    return current === sub.reminderTime;
  });

  if (due.length === 0) return;
  logger.info({ count: due.length }, "Sending due push reminders");

  for (const sub of due) {
    const msg = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
    const payload = JSON.stringify({ title: msg.title, body: msg.body, url: "/" });

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 3600 }
      );
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, sub.id));
        logger.info({ subId: sub.id }, "Removed expired push subscription");
      } else {
        logger.warn({ err, subId: sub.id }, "Failed to send push notification");
      }
    }
  }
}

export function startScheduler() {
  cron.schedule("* * * * *", () => {
    sendDueReminders().catch((err) => logger.error({ err }, "Scheduler error"));
  });
  logger.info("Push notification scheduler started");
}
