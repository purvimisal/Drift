import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { goalsTable } from "./goals";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goalsTable.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  difficultyLevel: real("difficulty_level").notNull().default(1.0),
  scheduledFor: text("scheduled_for").notNull(),
  completedAt: timestamp("completed_at"),
  skippedAt: timestamp("skipped_at"),
  tooMuchAt: timestamp("too_much_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
