import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  instagram: text("instagram").notNull().unique(),
  locale: text("locale").notNull().default("ko"),
  intent: text("intent").notNull().default("UNSURE"),
  country: text("country").notNull().default("OTHER"),
  answersJson: text("answers_json").notNull(),
  importanceJson: text("importance_json").notNull().default("{}"),
  completion: integer("completion").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
