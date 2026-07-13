import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  startingAmount: numeric("starting_amount", { precision: 14, scale: 2 })
    .notNull()
    .$type<string>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const withdrawalsTable = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  // "withdrawal" subtracts amount from the running balance, "deposit" adds it.
  type: text("type").notNull().default("withdrawal"),
  amount: numeric("amount", { precision: 14, scale: 2 })
    .notNull()
    .$type<string>(),
  url: text("url").notNull(),
  // User-specified transaction date, distinct from createdAt (row creation time).
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  // Clerk user id of a linked partner (another account holder on the site), if any.
  partnerUserId: text("partner_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

export const insertWithdrawalSchema = createInsertSchema(withdrawalsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof withdrawalsTable.$inferSelect;
