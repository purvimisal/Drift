import { pgTable, serial, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }),
  userId: varchar("user_id", { length: 255 }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  reminderTime: varchar("reminder_time", { length: 5 }).notNull().default("09:00"),
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;
