import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attempts, lines, mistakes, type Attempt, type Line } from "@/db/schema";
import type {
  AttemptDTO,
  CategoryProgress,
  DashboardStats,
  LineDTO,
  LineStats,
  MistakeDTO,
} from "@/lib/types";

export const MASTERY_THRESHOLD = 80;

export function computeLineStats(lineAttempts: Attempt[], unresolvedMistakes: number): LineStats {
  const sorted = [...lineAttempts].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const total = sorted.length;
  const correct = sorted.filter((a) => a.correct).length;
  const recent = sorted.slice(-5).map((a) => a.correct);
  const recentCorrect = recent.filter(Boolean).length;
  const experience = Math.min(1, total / 3);
  const mastery = total === 0 ? 0 : Math.round((recentCorrect / recent.length) * 100 * experience);
  return {
    attempts: total,
    correct,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
    mastery,
    lastTrainedAt: total ? sorted[total - 1].createdAt.toISOString() : null,
    unresolvedMistakes,
    recent,
  };
}

export function toLineDTO(line: Line, stats: LineStats): LineDTO {
  return {
    id: line.id,
    name: line.name,
    category: line.category,
    eco: line.eco,
    description: line.description,
    moves: line.moves,
    isTrap: line.isTrap,
    trapNote: line.trapNote,
    difficulty: line.difficulty,
    createdAt: line.createdAt.toISOString(),
    updatedAt: line.updatedAt.toISOString(),
    stats,
  };
}

async function loadUserData(userId: number) {
  const [userLines, userAttempts, userMistakes] = await Promise.all([
    db.select().from(lines).where(eq(lines.userId, userId)).orderBy(lines.sortOrder, lines.createdAt),
    db.select().from(attempts).where(eq(attempts.userId, userId)).orderBy(desc(attempts.createdAt)),
    db.select().from(mistakes).where(eq(mistakes.userId, userId)).orderBy(desc(mistakes.createdAt)),
  ]);
  return { userLines, userAttempts, userMistakes };
}

function buildLineDTOs(userLines: Line[], userAttempts: Attempt[], unresolvedByLine: Map<number, number>) {
  const byLine = new Map<number, Attempt[]>();
  for (const a of userAttempts) {
    const arr = byLine.get(a.lineId) ?? [];
    arr.push(a);
    byLine.set(a.lineId, arr);
  }
  return userLines.map((l) => toLineDTO(l, computeLineStats(byLine.get(l.id) ?? [], unresolvedByLine.get(l.id) ?? 0)));
}

function countUnresolved(userMistakes: { lineId: number; resolved: boolean }[]) {
  const map = new Map<number, number>();
  for (const m of userMistakes) {
    if (!m.resolved) map.set(m.lineId, (map.get(m.lineId) ?? 0) + 1);
  }
  return map;
}

export async function getLinesWithStats(userId: number): Promise<LineDTO[]> {
  const { userLines, userAttempts, userMistakes } = await loadUserData(userId);
  return buildLineDTOs(userLines, userAttempts, countUnresolved(userMistakes));
}

export async function getLineWithStats(userId: number, lineId: number): Promise<LineDTO | null> {
  const [line] = await db
    .select()
    .from(lines)
    .where(and(eq(lines.id, lineId), eq(lines.userId, userId)));
  if (!line) return null;
  const [lineAttempts, lineMistakes] = await Promise.all([
    db.select().from(attempts).where(eq(attempts.lineId, lineId)),
    db.select().from(mistakes).where(eq(mistakes.lineId, lineId)),
  ]);
  const unresolved = lineMistakes.filter((m) => !m.resolved).length;
  return toLineDTO(line, computeLineStats(lineAttempts, unresolved));
}

export async function getMistakes(userId: number, lineId?: number): Promise<MistakeDTO[]> {
  const rows = await db
    .select({
      id: mistakes.id,
      lineId: mistakes.lineId,
      lineName: lines.name,
      lineCategory: lines.category,
      ply: mistakes.ply,
      fen: mistakes.fen,
      playedMove: mistakes.playedMove,
      expectedMove: mistakes.expectedMove,
      resolved: mistakes.resolved,
      createdAt: mistakes.createdAt,
    })
    .from(mistakes)
    .innerJoin(lines, eq(lines.id, mistakes.lineId))
    .where(lineId ? and(eq(mistakes.userId, userId), eq(mistakes.lineId, lineId)) : eq(mistakes.userId, userId))
    .orderBy(desc(mistakes.createdAt));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getDashboardStats(userId: number): Promise<DashboardStats> {
  const { userLines, userAttempts, userMistakes } = await loadUserData(userId);
  const lineDTOs = buildLineDTOs(userLines, userAttempts, countUnresolved(userMistakes));
  const lineById = new Map(lineDTOs.map((l) => [l.id, l]));

  const totalAttempts = userAttempts.length;
  const correctAttempts = userAttempts.filter((a) => a.correct).length;

  // Activity for the last 14 days
  const days: { date: string; attempts: number; correct: number }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ date: dateKey(d), attempts: 0, correct: 0 });
  }
  const dayIndex = new Map(days.map((d, i) => [d.date, i]));
  const activeDays = new Set<string>();
  for (const a of userAttempts) {
    const key = dateKey(a.createdAt);
    activeDays.add(key);
    const idx = dayIndex.get(key);
    if (idx !== undefined) {
      days[idx].attempts += 1;
      if (a.correct) days[idx].correct += 1;
    }
  }

  // Streak: consecutive days with training ending today or yesterday
  let streakDays = 0;
  const cursor = new Date(today);
  if (!activeDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(dateKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const catMap = new Map<string, LineDTO[]>();
  for (const l of lineDTOs) {
    const arr = catMap.get(l.category) ?? [];
    arr.push(l);
    catMap.set(l.category, arr);
  }
  const categories: CategoryProgress[] = [...catMap.entries()]
    .map(([category, ls]) => ({
      category,
      lines: ls.length,
      mastered: ls.filter((l) => l.stats.mastery >= MASTERY_THRESHOLD).length,
      mastery: Math.round(ls.reduce((s, l) => s + l.stats.mastery, 0) / ls.length),
    }))
    .sort((a, b) => b.lines - a.lines);

  const recentAttempts: AttemptDTO[] = userAttempts.slice(0, 8).map((a) => ({
    id: a.id,
    lineId: a.lineId,
    lineName: lineById.get(a.lineId)?.name ?? "Удалённая линия",
    correct: a.correct,
    mistakesCount: a.mistakesCount,
    durationMs: a.durationMs,
    createdAt: a.createdAt.toISOString(),
  }));

  const trained = lineDTOs.filter((l) => l.stats.attempts > 0);
  const weakest = trained.length
    ? [...trained].sort((a, b) => a.stats.mastery - b.stats.mastery || b.stats.unresolvedMistakes - a.stats.unresolvedMistakes)[0]
    : null;
  const untrained = lineDTOs.find((l) => l.stats.attempts === 0) ?? null;
  const nextUp = untrained ?? weakest ?? lineDTOs[0] ?? null;

  return {
    totalLines: lineDTOs.length,
    masteredLines: lineDTOs.filter((l) => l.stats.mastery >= MASTERY_THRESHOLD).length,
    traps: lineDTOs.filter((l) => l.isTrap).length,
    totalAttempts,
    correctAttempts,
    accuracy: totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
    unresolvedMistakes: userMistakes.filter((m) => !m.resolved).length,
    streakDays,
    attemptsToday: days[days.length - 1].attempts,
    activity: days,
    categories,
    recentAttempts,
    weakest,
    nextUp,
  };
}
