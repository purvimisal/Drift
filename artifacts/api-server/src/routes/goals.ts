import { Router, type IRouter, type Request } from "express";
import { db, goalsTable, tasksTable, type GoalState } from "@workspace/db";
import { eq, and, isNull, or } from "drizzle-orm";
import { z } from "zod/v4";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function getRequestSessionId(req: Request): string | null {
  return (req.headers["x-drift-session"] as string) || null;
}

function goalOwnerFilter(req: Request) {
  const sessionId = getRequestSessionId(req);
  const userId = req.user?.id ?? null;

  if (userId && sessionId) {
    return or(eq(goalsTable.userId, userId), eq(goalsTable.sessionId, sessionId));
  }
  if (userId) return eq(goalsTable.userId, userId);
  if (sessionId) return eq(goalsTable.sessionId, sessionId);
  return undefined;
}

const STATE_MESSAGES: Record<GoalState, string[]> = {
  ON_TRACK: [
    "You're doing it.",
    "Keep going. One day at a time.",
    "Today counts.",
    "You showed up. That's everything.",
  ],
  DRIFTING: [
    "Missed today. Happens.",
    "A missed day is just a missed day. Nothing more.",
    "It's fine. Really.",
    "You'll get back to it.",
  ],
  DISENGAGING: [
    "Let's make it easier.",
    "Smaller steps, same destination.",
    "You don't have to do it all. Just a little.",
    "This version is gentler. That's okay.",
  ],
  AT_RISK: [
    "No pressure. Just start small.",
    "Two minutes. That's all.",
    "The smallest step still counts.",
    "You're still here. That's something.",
  ],
  RETURNING: [
    "Good to have you back.",
    "Hey, you came back. That matters.",
    "Welcome back. No explanation needed.",
    "You returned. That's the whole game.",
  ],
};

function getStateMessage(state: GoalState): string {
  const messages = STATE_MESSAGES[state];
  return messages[Math.floor(Math.random() * messages.length)];
}

type GoalForState = {
  missedCount: number;
  tooMuchFlag: boolean;
  tooMuchCount: number;
  consecutiveSkips: number;
  lastOpenedAt: Date | null;
  state: GoalState;
};

type StateResult = {
  newState: GoalState;
  newMissedCount: number;
  newTooMuchFlag: boolean;
  newTooMuchCount: number;
  newConsecutiveSkips: number;
  newMultiplier: number;
  shouldAdapt: boolean;
};

function computeNewState(goal: GoalForState, action: "done" | "skip" | "too_much"): StateResult {
  let newMissedCount = goal.missedCount;
  let newTooMuchFlag = goal.tooMuchFlag;
  let newTooMuchCount = goal.tooMuchCount;
  let newConsecutiveSkips = goal.consecutiveSkips;
  let newState: GoalState = goal.state;
  let newMultiplier = 1.0;
  let shouldAdapt = false;

  if (action === "done") {
    // Reset all signals — a completion wipes the slate clean
    newMissedCount = 0;
    newTooMuchFlag = false;
    newTooMuchCount = 0;
    newConsecutiveSkips = 0;
    newMultiplier = goal.state === "ON_TRACK" || goal.state === "RETURNING" ? 1.15 : 0.69;
    newState = goal.state === "ON_TRACK" || goal.state === "RETURNING" ? "ON_TRACK" : "RETURNING";

  } else if (action === "skip") {
    newMissedCount = goal.missedCount + 1;
    newConsecutiveSkips = goal.consecutiveSkips + 1;

    // Pattern: 3 consecutive skips = clear disengagement signal → adapt
    if (newConsecutiveSkips >= 3) {
      shouldAdapt = true;
      newConsecutiveSkips = 0; // reset after adapting
      newState = "AT_RISK";
      newMultiplier = 0.3;
    } else if (newConsecutiveSkips === 2) {
      newState = "DISENGAGING";
      newMultiplier = 0.6;
    } else {
      newState = "DRIFTING";
      newMultiplier = 1.0;
    }

  } else if (action === "too_much") {
    // "Too much" after declining even the mini task — this is a genuine signal
    newTooMuchFlag = true;
    newTooMuchCount = goal.tooMuchCount + 1;
    newMissedCount = goal.missedCount + 1;

    // Pattern: 2nd "too much" signal = the plan is genuinely too hard → adapt
    if (newTooMuchCount >= 2) {
      shouldAdapt = true;
      newTooMuchCount = 0; // reset after adapting
      newState = "AT_RISK";
      newMultiplier = 0.3;
    } else {
      newState = "DISENGAGING";
      newMultiplier = 0.6;
    }
  }

  return { newState, newMissedCount, newTooMuchFlag, newTooMuchCount, newConsecutiveSkips, newMultiplier, shouldAdapt };
}

// Regenerate remaining pending tasks at a lower difficulty level
async function adaptRemainingTasks(goalId: number, goal: typeof goalsTable.$inferSelect): Promise<number> {
  const pendingTasks = await db.select().from(tasksTable)
    .where(and(
      eq(tasksTable.goalId, goalId),
      isNull(tasksTable.completedAt),
      isNull(tasksTable.skippedAt),
      isNull(tasksTable.tooMuchAt),
    ));

  if (pendingTasks.length === 0) return 0;

  // Delete pending tasks
  for (const task of pendingTasks) {
    await db.delete(tasksTable).where(eq(tasksTable.id, task.id));
  }

  const count = pendingTasks.length;
  const startDay = pendingTasks[0].dayNumber;

  const daysRemaining = goal.durationDays - startDay + 1;
  const contextLine = goal.context ? `User's original starting point: "${goal.context}"` : "";

  const prompt = `You are a warm, intelligent coach recalibrating a plan inside Drift — a non-judgmental motivation app.

The user has been struggling with their tasks. Your job is NOT just to make things easier — it's to recalculate what's still achievable and keep them pointed at their goal. Think of it as a mid-course correction, not giving up.

Goal: "${goal.title}"
Total plan duration: ${goal.durationDays} days
Current position: day ${startDay} of ${goal.durationDays} (${daysRemaining} days remaining)
${contextLine ? `${contextLine}\n` : ""}
═══════════════════════════════════════════
STEP 1 — RE-TRAJECTORY ANALYSIS (do this first, silently)
═══════════════════════════════════════════
A. ENDPOINT: What is the concrete, measurable endpoint of this goal?
   Use your knowledge of the domain (e.g. a named book's page count, a race distance, etc.) if the user didn't state it.

B. WHAT'S STILL ACHIEVABLE: Given ${daysRemaining} days remain and the user needs gentler tasks, what modified endpoint or reduced rate is still realistic?
   - If the full goal is no longer achievable at a reduced pace, aim for the closest meaningful milestone instead.
   - Example: can't finish the full 288-page book? Aim for completing part 1 (chapters 1–12) or reaching page 150 — still meaningful.

C. REDUCED PROGRESSION CURVE: Design a gentler ramp across the ${daysRemaining} remaining days.
   - Start with tasks that feel almost too easy — this is intentional. Momentum > volume right now.
   - Increase gradually (~10–20% per week rather than 20–30%)
   - Still include the measurable target in every task — just at a lower number than the original plan

═══════════════════════════════════════════
STEP 2 — GENERATE THE ADAPTED PLAN
═══════════════════════════════════════════
Generate exactly ${count} tasks starting from day ${startDay}, using the re-calculated trajectory.

RULES:
1. Trajectory-locked: quantities must follow your gentler curve — the numbers should be clearly smaller than before, but still increase
2. Specific: every task must name the exact target (pages, minutes, reps, words, km) — never vague
3. Warm and kind: acknowledge without saying so that this is a fresh start — language should feel like "let's try this instead" not "you failed"
4. Short sessions: 5–20 minutes maximum — low bar, high dignity
5. Still progressing: even at the gentler pace, day ${startDay + count - 1} should be noticeably more than day ${startDay}

Return ONLY a valid JSON array with exactly ${count} objects:
[
  {
    "dayNumber": ${startDay},
    "title": "Short, specific title (max 8 words)",
    "description": "Exactly what to do — include the specific target. 1–2 sentences. Warm and encouraging.",
    "estimatedMinutes": 10
  }
]

No markdown, no preamble, no explanation. Output only the JSON array.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "[]";
  let taskData: Array<{ dayNumber: number; title: string; description: string; estimatedMinutes: number }> = [];
  try {
    taskData = JSON.parse(content);
  } catch {
    const match = content.match(/\[[\s\S]*\]/);
    if (match) { try { taskData = JSON.parse(match[0]); } catch { taskData = []; } }
  }

  const today = new Date();
  const insertData = taskData.map((t, idx) => {
    const date = new Date(today);
    date.setDate(date.getDate() + idx);
    return {
      goalId,
      dayNumber: t.dayNumber ?? startDay + idx,
      title: t.title,
      description: t.description,
      estimatedMinutes: Math.min(t.estimatedMinutes ?? 10, 15),
      difficultyLevel: 0.4,
      scheduledFor: date.toISOString().split("T")[0],
    };
  });

  if (insertData.length > 0) {
    await db.insert(tasksTable).values(insertData);
  }

  return insertData.length;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

const createGoalSchema = z.object({
  title: z.string().min(1).max(500),
  durationDays: z.number().int().min(1).max(365),
  context: z.string().max(500).optional().nullable(),
});

const taskActionSchema = z.object({
  action: z.enum(["done", "skip", "too_much"]),
});

router.post("/goals", async (req, res) => {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { title, durationDays, context } = parsed.data;
  const sessionId = getRequestSessionId(req);
  const userId = req.user?.id ?? null;
  const [goal] = await db.insert(goalsTable).values({
    title,
    durationDays,
    state: "ON_TRACK",
    missedCount: 0,
    tooMuchFlag: false,
    currentDifficultyMultiplier: 1.0,
    ...(userId ? { userId } : sessionId ? { sessionId } : {}),
    ...(context ? { context } : {}),
  }).returning();
  res.status(201).json(serializeGoal(goal));
});

router.get("/goals", async (req, res) => {
  const ownerFilter = goalOwnerFilter(req);
  const goals = ownerFilter
    ? await db.select().from(goalsTable).where(ownerFilter).orderBy(goalsTable.createdAt)
    : await db.select().from(goalsTable).orderBy(goalsTable.createdAt);
  res.json(goals.map(serializeGoal));
});

router.get("/goals/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const ownerFilter = goalOwnerFilter(req);
  const whereClause = ownerFilter ? and(eq(goalsTable.id, id), ownerFilter) : eq(goalsTable.id, id);
  const [goal] = await db.select().from(goalsTable).where(whereClause);
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
  await db.update(goalsTable).set({ lastOpenedAt: new Date() }).where(eq(goalsTable.id, id));
  res.json(serializeGoal(goal));
});

router.patch("/goals/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const ownerFilter = goalOwnerFilter(req);
  if (!ownerFilter) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { context } = req.body as { context?: string };
  const [goal] = await db.update(goalsTable)
    .set({ context: context?.trim() || null })
    .where(and(eq(goalsTable.id, id), ownerFilter))
    .returning();
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
  res.json({ id: goal.id, context: goal.context });
});

router.delete("/goals/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const ownerFilter = goalOwnerFilter(req);
  const whereClause = ownerFilter ? and(eq(goalsTable.id, id), ownerFilter) : eq(goalsTable.id, id);
  await db.delete(goalsTable).where(whereClause);
  res.json({ success: true });
});

router.get("/goals/:id/state", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id));
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }

  const state = goal.state as GoalState;
  res.json({
    goalId: goal.id,
    state,
    missedCount: goal.missedCount,
    tooMuchFlag: goal.tooMuchFlag,
    lastCompletedDate: goal.lastCompletedDate ?? null,
    message: getStateMessage(state),
    difficultyMultiplier: goal.currentDifficultyMultiplier,
  });
});

router.get("/goals/:id/tasks", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id));
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }

  const tasks = await db.select().from(tasksTable)
    .where(eq(tasksTable.goalId, id));

  res.json({
    tasks: tasks.map(serializeTask),
    goal: serializeGoal(goal),
  });
});

router.get("/goals/:id/tasks/today", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id));
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }

  await db.update(goalsTable).set({ lastOpenedAt: new Date() }).where(eq(goalsTable.id, id));

  const today = getTodayDate();
  const tasks = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.goalId, id), eq(tasksTable.scheduledFor, today)));

  let task = tasks.find(t => !t.completedAt && !t.skippedAt && !t.tooMuchAt);

  if (!task && tasks.length === 0) {
    const allTasks = await db.select().from(tasksTable)
      .where(and(eq(tasksTable.goalId, id), isNull(tasksTable.completedAt), isNull(tasksTable.skippedAt), isNull(tasksTable.tooMuchAt)));

    if (allTasks.length > 0) {
      task = allTasks[0];
    }
  }

  if (!task) {
    res.status(404).json({ error: "No task available for today" });
    return;
  }

  const state = goal.state as GoalState;
  const message = getStateMessage(state);

  res.json({
    task: serializeTask(task),
    goalState: state,
    adaptiveMessage: message,
    goal: serializeGoal(goal),
  });
});

const ADAPTATION_MESSAGES = [
  "I've made your next tasks gentler. Small steps still move you forward.",
  "Your upcoming tasks are now lighter. That's not giving up — that's being smart.",
  "I've adjusted the plan to fit you better. Easier tasks are still real progress.",
];

router.post("/goals/:id/tasks/:taskId/action", async (req, res) => {
  const id = parseInt(req.params.id);
  const taskId = parseInt(req.params.taskId);
  if (isNaN(id) || isNaN(taskId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = taskActionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid action" }); return; }

  const { action } = parsed.data;

  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id));
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }

  const now = new Date();
  const updateData: Record<string, Date> = {};
  if (action === "done") updateData.completedAt = now;
  if (action === "skip") updateData.skippedAt = now;
  if (action === "too_much") updateData.tooMuchAt = now;

  await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, taskId));

  const {
    newState, newMissedCount, newTooMuchFlag, newTooMuchCount,
    newConsecutiveSkips, newMultiplier, shouldAdapt
  } = computeNewState({
    missedCount: goal.missedCount,
    tooMuchFlag: goal.tooMuchFlag,
    tooMuchCount: goal.tooMuchCount,
    consecutiveSkips: goal.consecutiveSkips,
    lastOpenedAt: goal.lastOpenedAt,
    state: goal.state as GoalState,
  }, action);

  const goalUpdate: Record<string, unknown> = {
    state: newState,
    missedCount: newMissedCount,
    tooMuchFlag: newTooMuchFlag,
    tooMuchCount: newTooMuchCount,
    consecutiveSkips: newConsecutiveSkips,
    currentDifficultyMultiplier: newMultiplier,
    lastOpenedAt: now,
  };
  if (action === "done") {
    goalUpdate.lastCompletedDate = getTodayDate();
  }

  await db.update(goalsTable).set(goalUpdate).where(eq(goalsTable.id, id));

  // If pattern threshold hit, silently regenerate tasks in background
  let adapted = false;
  let adaptationMessage: string | null = null;
  if (shouldAdapt) {
    try {
      // Fetch the updated goal for adaptation (to get the full record)
      const [updatedGoal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id));
      if (updatedGoal) {
        adaptRemainingTasks(id, updatedGoal).catch(() => {}); // fire-and-forget
        adapted = true;
        adaptationMessage = ADAPTATION_MESSAGES[Math.floor(Math.random() * ADAPTATION_MESSAGES.length)];
      }
    } catch { /* non-critical */ }
  }

  const message = adapted && adaptationMessage ? adaptationMessage : getStateMessage(newState);

  const allTasks = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.goalId, id), isNull(tasksTable.completedAt), isNull(tasksTable.skippedAt), isNull(tasksTable.tooMuchAt)));

  res.json({
    success: true,
    newState,
    message,
    nextTask: allTasks.length > 0 ? serializeTask(allTasks[0]) : null,
    adapted,
    adaptationMessage,
  });
});

router.post("/goals/:id/generate-tasks", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id));
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }

  const tasksToGenerate = Math.min(goal.durationDays, 14);

  const contextLine = goal.context
    ? `User's starting point: "${goal.context}"`
    : "";

  const phase1End = Math.max(Math.round(goal.durationDays * 0.2), 3);
  const phase2End = Math.round(goal.durationDays * 0.5);
  const phase3End = Math.round(goal.durationDays * 0.8);

  const prompt = `You are an expert coach and planner building a structured, intelligent training plan inside Drift — a calm, non-judgmental motivation app.

Goal: "${goal.title}"
Total plan duration: ${goal.durationDays} days
Generating: days 1–${tasksToGenerate} (foundation and early build phase)
${contextLine ? `${contextLine}\n` : ""}
═══════════════════════════════════════════
STEP 1 — TRAJECTORY ANALYSIS (do this first, silently)
═══════════════════════════════════════════
Before creating any tasks, reason through the following:

A. ENDPOINT: What is the concrete, measurable endpoint of this goal?
   Examples: finish a ~300-page book, run 5k in under 30 minutes, write a 50,000-word novel, hold a 60-second plank, reach B1 Spanish level.
   Determine the endpoint even if the user didn't state it explicitly — use common knowledge (e.g. book page counts, race distances, etc.).

B. STARTING POINT: What measurable quantity is the user at right now?
   If context was provided above, extract the number (e.g. "2 pages/day", "can run 5k in 45 min", "zero Spanish").
   If no context, assume a realistic beginner baseline for this domain.

C. TARGET RATE: What daily/weekly rate or intensity is needed to reach the endpoint in ${goal.durationDays} days?
   Example: 300-page book over 30 days = 10 pages/day average. If starting at 2 pages/day, the user must reach ~14 pages/day by the end.

D. PROGRESSION CURVE: Design a smooth, achievable ramp from Starting Point → Target Rate across ${goal.durationDays} days.
   Example: days 1–6: 2→4 pages, days 7–14: 4→7 pages, days 15–21: 7→10 pages, days 22–30: 10→14 pages.
   The curve should feel challenging but not brutal — increase by ~20–30% per week, with lighter days between heavier ones.

═══════════════════════════════════════════
STEP 2 — GENERATE THE PLAN
═══════════════════════════════════════════
Now generate exactly ${tasksToGenerate} tasks covering days 1–${tasksToGenerate}, using the trajectory you designed above.

PHASE STRUCTURE for the full ${goal.durationDays}-day arc:
- Phase 1 Foundation (days 1–${phase1End}): Establish baseline, build rhythm, easy wins that create momentum
- Phase 2 Building (days ${phase1End + 1}–${phase2End}): Increase volume progressively toward the target rate
- Phase 3 Challenge (days ${phase2End + 1}–${phase3End}): Sustain the target rate, add variety and harder sessions
- Phase 4 Peak (days ${phase3End + 1}–${goal.durationDays}): Consolidate, test against the full goal, reflect

You are generating days 1–${tasksToGenerate} — Focus on Phase 1 and early Phase 2.

RULES (apply all):
1. Trajectory-locked: every task's quantity/target must match the progression curve you designed — the numbers must add up
2. Specific: every task must state the exact measurable target (pages, minutes, reps, words, km, etc.) — never say "practice" without a number
3. Progressive: each week should be visibly harder than the last — the increase must be real and traceable
4. Varied: rotate between different aspects or session types so no two consecutive days are identical in format
5. Rest-aware: include one lighter/reflective task around day 6–7 if generating that far
6. Domain-aware: use domain logic (running: interval/tempo/easy splits; reading: comprehension + recall; language: vocab/grammar/speaking mix; writing: drafting/editing/reading; etc.)
7. Calibrated: if a starting point is given, skip trivial beginner steps — start from the user's actual level

Each task: 10–40 minutes, warm and direct language, specific enough to start immediately.

Return ONLY a valid JSON array with exactly ${tasksToGenerate} objects:
[
  {
    "dayNumber": 1,
    "title": "Short, specific title (max 8 words)",
    "description": "Exactly what to do — include the specific target (page range, distance, duration). 2–3 sentences. Make it feel coached.",
    "estimatedMinutes": 20
  }
]

No markdown, no preamble, no explanation. Output only the JSON array.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "[]";
  let taskData: Array<{ dayNumber: number; title: string; description: string; estimatedMinutes: number }> = [];

  try {
    taskData = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try { taskData = JSON.parse(jsonMatch[0]); } catch { taskData = []; }
    }
  }

  const today = new Date();
  const insertData = taskData.map((t, idx) => {
    const date = new Date(today);
    date.setDate(date.getDate() + idx);
    return {
      goalId: id,
      dayNumber: t.dayNumber ?? idx + 1,
      title: t.title,
      description: t.description,
      estimatedMinutes: t.estimatedMinutes ?? 15,
      difficultyLevel: 1.0,
      scheduledFor: date.toISOString().split("T")[0],
    };
  });

  const tasks = await db.insert(tasksTable).values(insertData).returning();

  res.json({
    tasks: tasks.map(serializeTask),
    totalGenerated: tasks.length,
  });
});

router.get("/goals/:id/message", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id));
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }

  const state = goal.state as GoalState;

  const toneMap: Record<GoalState, string> = {
    ON_TRACK: "encouraging",
    DRIFTING: "non-judgmental",
    DISENGAGING: "gentle",
    AT_RISK: "minimal",
    RETURNING: "welcoming",
  };

  res.json({
    message: getStateMessage(state),
    state,
    tone: toneMap[state],
  });
});

function serializeGoal(goal: typeof goalsTable.$inferSelect) {
  return {
    id: goal.id,
    title: goal.title,
    durationDays: goal.durationDays,
    state: goal.state,
    missedCount: goal.missedCount,
    tooMuchFlag: goal.tooMuchFlag,
    tooMuchCount: goal.tooMuchCount,
    consecutiveSkips: goal.consecutiveSkips,
    lastCompletedDate: goal.lastCompletedDate ?? null,
    lastOpenedAt: goal.lastOpenedAt?.toISOString() ?? null,
    currentDifficultyMultiplier: goal.currentDifficultyMultiplier,
    createdAt: goal.createdAt.toISOString(),
  };
}

function serializeTask(task: typeof tasksTable.$inferSelect) {
  return {
    id: task.id,
    goalId: task.goalId,
    dayNumber: task.dayNumber,
    title: task.title,
    description: task.description,
    estimatedMinutes: task.estimatedMinutes,
    difficultyLevel: task.difficultyLevel,
    scheduledFor: task.scheduledFor,
    completedAt: task.completedAt?.toISOString() ?? null,
    skippedAt: task.skippedAt?.toISOString() ?? null,
    tooMuchAt: task.tooMuchAt?.toISOString() ?? null,
  };
}

export default router;
