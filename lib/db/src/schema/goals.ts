import { pgTable, serial, text, integer, boolean, timestamp, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type GoalState = "ON_TRACK" | "DRIFTING" | "DISENGAGING" | "AT_RISK" | "RETURNING";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }),
  userId: varchar("user_id", { length: 255 }),
  title: text("title").notNull(),
  context: text("context"),
  durationDays: integer("duration_days").notNull(),
  state: text("state").$type<GoalState>().notNull().default("ON_TRACK"),
  missedCount: integer("missed_count").notNull().default(0),
  tooMuchFlag: boolean("too_much_flag").notNull().default(false),
  tooMuchCount: integer("too_much_count").notNull().default(0),
  consecutiveSkips: integer("consecutive_skips").notNull().default(0),
  lastCompletedDate: text("last_completed_date"),
  lastOpenedAt: timestamp("last_opened_at"),
  currentDifficultyMultiplier: real("current_difficulty_multiplier").notNull().default(1.0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
