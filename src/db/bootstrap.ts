import { and, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { attempts, lines, mistakes, users } from "@/db/schema";
import demoLines from "@/data/demo-lines.json";
import { fenAtPly, validateMoves } from "@/lib/chess";

export const DEMO_EMAIL = "demo@bdg.app";
export const DEMO_PASSWORD = "demo1234";

type DemoLine = (typeof demoLines)[number];

const DDL = [
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "email" varchar(255) NOT NULL,
    "name" varchar(120) NOT NULL,
    "password_hash" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email")`,
  `CREATE TABLE IF NOT EXISTS "lines" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "name" varchar(160) NOT NULL,
    "category" varchar(80) NOT NULL,
    "eco" varchar(8) DEFAULT 'D00' NOT NULL,
    "description" text DEFAULT '' NOT NULL,
    "moves" text NOT NULL,
    "is_trap" boolean DEFAULT false NOT NULL,
    "trap_note" text DEFAULT '' NOT NULL,
    "difficulty" integer DEFAULT 2 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "lines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
  )`,
  `CREATE INDEX IF NOT EXISTS "lines_user_idx" ON "lines" USING btree ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "attempts" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "line_id" integer NOT NULL,
    "correct" boolean NOT NULL,
    "mistakes_count" integer DEFAULT 0 NOT NULL,
    "duration_ms" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
    CONSTRAINT "attempts_line_id_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE cascade
  )`,
  `CREATE INDEX IF NOT EXISTS "attempts_user_idx" ON "attempts" USING btree ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "attempts_line_idx" ON "attempts" USING btree ("line_id")`,
  `CREATE TABLE IF NOT EXISTS "mistakes" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "line_id" integer NOT NULL,
    "ply" integer NOT NULL,
    "fen" text NOT NULL,
    "played_move" varchar(16) NOT NULL,
    "expected_move" varchar(16) NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "mistakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
    CONSTRAINT "mistakes_line_id_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE cascade
  )`,
  `CREATE INDEX IF NOT EXISTS "mistakes_user_idx" ON "mistakes" USING btree ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "mistakes_line_idx" ON "mistakes" USING btree ("line_id")`,
];

const globalForBootstrap = globalThis as typeof globalThis & {
  __bdgBootstrap?: Promise<void> | null;
};

/** Ensures tables exist and the demo account is seeded. Memoized per server process. */
export function ensureDatabase(): Promise<void> {
  if (!globalForBootstrap.__bdgBootstrap) {
    globalForBootstrap.__bdgBootstrap = (async () => {
      for (const statement of DDL) {
        await db.execute(sql.raw(statement));
      }
      await seedDemoAccount();
    })().catch((err) => {
      globalForBootstrap.__bdgBootstrap = null;
      throw err;
    });
  }
  return globalForBootstrap.__bdgBootstrap;
}

/** Copies the demo repertoire into a user's account, skipping lines with identical names. */
export async function importDemoLines(userId: number): Promise<number> {
  const existing = await db
    .select({ name: lines.name })
    .from(lines)
    .where(eq(lines.userId, userId));
  const names = new Set(existing.map((l) => l.name));
  const toInsert = (demoLines as DemoLine[])
    .map((l, i) => ({ line: l, index: i }))
    .filter(({ line }) => !names.has(line.name));
  if (toInsert.length === 0) return 0;

  await db.insert(lines).values(
    toInsert.map(({ line, index }) => {
      const validated = validateMoves(line.moves);
      const moves = validated.ok ? validated.sans.join(" ") : line.moves;
      return {
        userId,
        name: line.name,
        category: line.category,
        eco: line.eco,
        description: line.description,
        moves,
        isTrap: line.isTrap,
        trapNote: line.trapNote,
        difficulty: line.difficulty,
        sortOrder: index,
      };
    }),
  );
  return toInsert.length;
}

async function seedDemoAccount() {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL));
  if (existing) return;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [user] = await db
    .insert(users)
    .values({ email: DEMO_EMAIL, name: "Демо-игрок", passwordHash })
    .returning({ id: users.id });

  await importDemoLines(user.id);
  const userLines = await db
    .select({ id: lines.id, name: lines.name, moves: lines.moves })
    .from(lines)
    .where(eq(lines.userId, user.id))
    .orderBy(lines.sortOrder);

  // Deterministic pseudo-random training history for the last two weeks.
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const attemptRows: (typeof attempts.$inferInsert)[] = [];
  const mistakeRows: (typeof mistakes.$inferInsert)[] = [];

  userLines.forEach((line, idx) => {
    // Earlier lines are "well studied", later ones are fresh.
    const sessions = idx < 4 ? 6 : idx < 9 ? 3 : idx < 12 ? 1 : 0;
    const skill = idx < 4 ? 0.85 : idx < 9 ? 0.6 : 0.4;
    const sans = line.moves.split(" ");
    for (let s = 0; s < sessions; s++) {
      const daysAgo = Math.floor(rand() * 13);
      const createdAt = new Date(now - daysAgo * day - Math.floor(rand() * 8) * 60 * 60 * 1000);
      const correct = rand() < skill;
      const mistakesCount = correct ? 0 : 1 + Math.floor(rand() * 2);
      attemptRows.push({
        userId: user.id,
        lineId: line.id,
        correct,
        mistakesCount,
        durationMs: 20000 + Math.floor(rand() * 60000),
        createdAt,
      });
      if (!correct) {
        for (let m = 0; m < mistakesCount; m++) {
          // Pick a white move (even ply) beyond the first couple of moves.
          const whitePlies = sans.map((_, i) => i).filter((i) => i % 2 === 0 && i >= 4);
          const ply = whitePlies[Math.floor(rand() * whitePlies.length)] ?? 0;
          const alternatives = ["Nf3", "Be2", "Qd2", "h3", "a3", "Bd3", "Nb5", "O-O", "Qe2", "Bg5"];
          let played = alternatives[Math.floor(rand() * alternatives.length)];
          if (played === sans[ply]) played = "a3";
          mistakeRows.push({
            userId: user.id,
            lineId: line.id,
            ply,
            fen: fenAtPly(sans, ply),
            playedMove: played,
            expectedMove: sans[ply],
            resolved: rand() < 0.4,
            createdAt,
          });
        }
      }
    }
  });

  if (attemptRows.length) await db.insert(attempts).values(attemptRows);
  if (mistakeRows.length) await db.insert(mistakes).values(mistakeRows);
}

export async function demoAccountExists(): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, DEMO_EMAIL)));
  return Boolean(row);
}
