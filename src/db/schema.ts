import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const lines = pgTable(
  "lines",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    eco: varchar("eco", { length: 8 }).default("D00").notNull(),
    description: text("description").default("").notNull(),
    /** Space separated SAN sequence, e.g. "d4 d5 e4 dxe4 Nc3 Nf6 f3 exf3 Nxf3" */
    moves: text("moves").notNull(),
    isTrap: boolean("is_trap").default(false).notNull(),
    trapNote: text("trap_note").default("").notNull(),
    difficulty: integer("difficulty").default(2).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("lines_user_idx").on(t.userId)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lineId: integer("line_id")
      .notNull()
      .references(() => lines.id, { onDelete: "cascade" }),
    correct: boolean("correct").notNull(),
    mistakesCount: integer("mistakes_count").default(0).notNull(),
    durationMs: integer("duration_ms").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("attempts_user_idx").on(t.userId), index("attempts_line_idx").on(t.lineId)],
);

export const mistakes = pgTable(
  "mistakes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lineId: integer("line_id")
      .notNull()
      .references(() => lines.id, { onDelete: "cascade" }),
    ply: integer("ply").notNull(),
    fen: text("fen").notNull(),
    playedMove: varchar("played_move", { length: 16 }).notNull(),
    expectedMove: varchar("expected_move", { length: 16 }).notNull(),
    resolved: boolean("resolved").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("mistakes_user_idx").on(t.userId), index("mistakes_line_idx").on(t.lineId)],
);

export type User = typeof users.$inferSelect;
export type Line = typeof lines.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type Mistake = typeof mistakes.$inferSelect;
