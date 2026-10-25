import { Chess } from "chess.js";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Strip move numbers, comments, annotations and results from a PGN-ish string. */
export function parseMoveText(input: string): string[] {
  return input
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/;.*$/gm, " ")
    .replace(/\$\d+/g, " ")
    .replace(/\d+\.(\.\.)?/g, " ")
    .replace(/\.\.\./g, " ")
    .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, " ")
    .replace(/[!?]+/g, "")
    .replace(/0-0-0/g, "O-O-O")
    .replace(/0-0/g, "O-O")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type ValidatedLine =
  | { ok: true; sans: string[]; fens: string[] }
  | { ok: false; error: string; index: number };

/** Validate a sequence of SAN moves, returning normalized SAN + FEN after each ply. */
export function validateMoves(input: string | string[]): ValidatedLine {
  const tokens = Array.isArray(input) ? input : parseMoveText(input);
  const chess = new Chess();
  const sans: string[] = [];
  const fens: string[] = [chess.fen()];
  for (let i = 0; i < tokens.length; i++) {
    try {
      const mv = chess.move(tokens[i]);
      sans.push(mv.san);
      fens.push(chess.fen());
    } catch {
      return { ok: false, error: `Недопустимый ход «${tokens[i]}» (полуход ${i + 1})`, index: i };
    }
  }
  return { ok: true, sans, fens };
}

export function fenAtPly(sans: string[], ply: number): string {
  const chess = new Chess();
  for (let i = 0; i < Math.min(ply, sans.length); i++) chess.move(sans[i]);
  return chess.fen();
}

export function finalFen(moves: string): string {
  const sans = moves.split(" ").filter(Boolean);
  return fenAtPly(sans, sans.length);
}

/** "1.d4 d5 2.e4 dxe4 ..." */
export function toNumbered(sans: string[], from = 0, to = sans.length): string {
  const parts: string[] = [];
  for (let i = from; i < Math.min(to, sans.length); i++) {
    if (i % 2 === 0) parts.push(`${i / 2 + 1}.${sans[i]}`);
    else if (i === from) parts.push(`${Math.floor(i / 2) + 1}...${sans[i]}`);
    else parts.push(sans[i]);
  }
  return parts.join(" ");
}

export function moveLabel(ply: number, san: string): string {
  const n = Math.floor(ply / 2) + 1;
  return ply % 2 === 0 ? `${n}.${san}` : `${n}...${san}`;
}

export function whiteMoveCount(sans: string[]): number {
  return Math.ceil(sans.length / 2);
}

export const CATEGORIES = [
  "Защита Тейхмана",
  "Защита Эйве",
  "Защита Боголюбова",
  "Защита Гундерама",
  "Защита Циглера",
  "Защита Каулиха",
  "Гамбит Райдера",
  "Контргамбит Лембергера",
  "Венская защита",
  "Гамбит Хюбша",
  "Отказанный гамбит",
  "Другое",
] as const;
