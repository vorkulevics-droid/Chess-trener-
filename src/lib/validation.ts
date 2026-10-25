import { validateMoves } from "@/lib/chess";

export type ParsedLineInput = {
  name: string;
  category: string;
  eco: string;
  description: string;
  moves: string;
  isTrap: boolean;
  trapNote: string;
  difficulty: number;
};

type ParseResult = { ok: true; data: ParsedLineInput } | { ok: false; error: string };

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

export function parseLineInput(body: unknown): ParseResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Некорректное тело запроса" };
  const b = body as Record<string, unknown>;

  const name = str(b.name);
  if (name.length < 3) return { ok: false, error: "Название должно содержать минимум 3 символа" };
  if (name.length > 160) return { ok: false, error: "Название слишком длинное (макс. 160 символов)" };

  const category = str(b.category) || "Другое";
  if (category.length > 80) return { ok: false, error: "Слишком длинное название категории" };

  const eco = (str(b.eco) || "D00").toUpperCase().slice(0, 8);
  const description = str(b.description).slice(0, 2000);
  const trapNote = str(b.trapNote).slice(0, 2000);
  const isTrap = Boolean(b.isTrap);

  const difficultyRaw = Number(b.difficulty ?? 2);
  const difficulty = [1, 2, 3].includes(difficultyRaw) ? difficultyRaw : 2;

  const movesRaw = Array.isArray(b.moves) ? (b.moves as unknown[]).map(String).join(" ") : str(b.moves);
  const validated = validateMoves(movesRaw);
  if (!validated.ok) return { ok: false, error: validated.error };
  if (validated.sans.length < 2) return { ok: false, error: "Линия должна содержать хотя бы два полухода" };
  if (validated.sans.length > 80) return { ok: false, error: "Линия слишком длинная (макс. 80 полуходов)" };

  return {
    ok: true,
    data: { name, category, eco, description, moves: validated.sans.join(" "), isTrap, trapNote, difficulty },
  };
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
