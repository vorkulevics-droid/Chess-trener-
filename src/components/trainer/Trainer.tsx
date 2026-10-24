"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import type { Arrow, PieceDropHandlerArgs, PieceHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  Lightbulb,
  ListChecks,
  Loader2,
  Play,
  RotateCcw,
  Shuffle,
  Swords,
  Target,
  TrendingDown,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Board, highlightStyles } from "@/components/board/Board";
import { Badge, Button, Card, EmptyState, LinkButton, ProgressBar, cn, inputClass, useToast } from "@/components/ui";
import { START_FEN, moveLabel, whiteMoveCount } from "@/lib/chess";
import type { LineDTO, MistakeDraft } from "@/lib/types";

type Phase = "user" | "opponent" | "done";
type Sq = { from: string; to: string };

const OPPONENT_DELAY_MS = 550;

export function Trainer({ lines, initialLineId }: { lines: LineDTO[]; initialLineId: number | null }) {
  const router = useRouter();
  const toast = useToast();
  const [lineId, setLineId] = useState<number | null>(initialLineId ?? lines[0]?.id ?? null);
  const line = useMemo(() => lines.find((l) => l.id === lineId) ?? null, [lines, lineId]);
  const plies = useMemo(() => (line ? line.moves.split(" ").filter(Boolean) : []), [line]);

  const gameRef = useRef(new Chess());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);
  const mistakesRef = useRef<MistakeDraft[]>([]);
  const startedAtRef = useRef<number>(0);

  const [fen, setFen] = useState(START_FEN);
  const [ply, setPly] = useState(0);
  const [phase, setPhase] = useState<Phase>("user");
  const [lastMove, setLastMove] = useState<Sq | null>(null);
  const [wrong, setWrong] = useState<(Sq & { san: string }) | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState<MistakeDraft[]>([]);
  const [shakeKey, setShakeKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedStats, setSavedStats] = useState<LineDTO["stats"] | null>(null);
  const [session, setSession] = useState({ completed: 0, clean: 0 });

  // Follow in-app navigation to /train?line=X (e.g. from the sidebar or dashboard).
  const [prevInitialLineId, setPrevInitialLineId] = useState(initialLineId);
  if (prevInitialLineId !== initialLineId) {
    setPrevInitialLineId(initialLineId);
    if (initialLineId !== null) setLineId(initialLineId);
  }

  const addMistake = useCallback((m: MistakeDraft) => {
    mistakesRef.current = [...mistakesRef.current, m];
    setMistakes(mistakesRef.current);
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setPly(0);
    setPhase("user");
    setLastMove(null);
    setWrong(null);
    setShowHint(false);
    setSelected(null);
    mistakesRef.current = [];
    setMistakes([]);
    setSavedStats(null);
    setSaving(false);
    submittedRef.current = false;
    startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    reset();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lineId, reset]);

  const expected = useMemo(() => {
    if (!line || ply >= plies.length || ply % 2 !== 0) return null;
    try {
      const probe = new Chess(fen);
      const mv = probe.move(plies[ply]);
      return { san: mv.san, from: mv.from, to: mv.to };
    } catch {
      return null;
    }
  }, [line, ply, plies, fen]);

  /** Persist the attempt once the line is complete (called from event handlers). */
  const finishLine = useCallback(() => {
    setPhase("done");
    if (!line || submittedRef.current) return;
    submittedRef.current = true;
    const finalMistakes = mistakesRef.current;
    const payload = { lineId: line.id, mistakes: finalMistakes, durationMs: Date.now() - startedAtRef.current };
    setSaving(true);
    fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Ошибка сохранения");
        setSavedStats(data.line?.stats ?? null);
        setSession((s) => ({ completed: s.completed + 1, clean: s.clean + (finalMistakes.length === 0 ? 1 : 0) }));
        router.refresh();
      })
      .catch((e: unknown) => toast.push(e instanceof Error ? e.message : "Не удалось сохранить результат", "error"))
      .finally(() => setSaving(false));
  }, [line, router, toast]);

  const playOpponent = useCallback(
    (nextPly: number) => {
      setPhase("opponent");
      timerRef.current = setTimeout(() => {
        const game = gameRef.current;
        const om = game.move(plies[nextPly]);
        setFen(game.fen());
        setLastMove({ from: om.from, to: om.to });
        const after = nextPly + 1;
        setPly(after);
        if (after >= plies.length) finishLine();
        else setPhase("user");
      }, OPPONENT_DELAY_MS);
    },
    [plies, finishLine],
  );

  const tryMove = useCallback(
    (from: string, to: string): boolean => {
      if (phase !== "user" || !line) return false;
      const game = gameRef.current;
      const probe = new Chess(game.fen());
      let mv;
      try {
        mv = probe.move({ from, to, promotion: "q" });
      } catch {
        return false;
      }
      const exp = plies[ply];
      const expectedSan = (() => {
        try {
          return new Chess(game.fen()).move(exp).san;
        } catch {
          return exp;
        }
      })();
      if (mv.san === expectedSan) {
        game.move({ from, to, promotion: "q" });
        setFen(game.fen());
        setLastMove({ from, to });
        setWrong(null);
        setShowHint(false);
        setSelected(null);
        const next = ply + 1;
        setPly(next);
        if (next >= plies.length) finishLine();
        else playOpponent(next);
        return true;
      }
      setWrong({ from, to, san: mv.san });
      setShowHint(true);
      setSelected(null);
      setShakeKey((k) => k + 1);
      addMistake({ ply, fen: game.fen(), playedMove: mv.san, expectedMove: expectedSan });
      return false;
    },
    [phase, line, plies, ply, playOpponent, finishLine, addMistake],
  );

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (!targetSquare) return false;
      return tryMove(sourceSquare, targetSquare);
    },
    [tryMove],
  );

  const onSquareClick = useCallback(
    ({ square, piece }: SquareHandlerArgs) => {
      if (phase !== "user") return;
      if (selected && selected !== square && tryMove(selected, square)) return;
      if (piece && piece.pieceType.startsWith("w")) setSelected(square === selected ? null : square);
      else setSelected(null);
    },
    [phase, selected, tryMove],
  );

  const canDragPiece = useCallback(({ piece }: PieceHandlerArgs) => phase === "user" && piece.pieceType.startsWith("w"), [phase]);

  const revealMove = useCallback(() => {
    if (!expected || phase !== "user") return;
    if (!showHint) {
      setShowHint(true);
      addMistake({ ply, fen, playedMove: "?", expectedMove: expected.san });
      return;
    }
    tryMove(expected.from, expected.to);
  }, [expected, phase, showHint, ply, fen, tryMove, addMistake]);

  const squareStyles = useMemo(() => {
    const s: Record<string, CSSProperties> = {};
    if (lastMove) {
      s[lastMove.from] = highlightStyles.lastMove;
      s[lastMove.to] = highlightStyles.lastMove;
    }
    if (selected) {
      s[selected] = highlightStyles.selected;
      try {
        for (const m of new Chess(fen).moves({ square: selected as Square, verbose: true })) {
          s[m.to] = m.captured ? highlightStyles.capture : highlightStyles.target;
        }
      } catch {
        /* ignore */
      }
    }
    if (showHint && expected) {
      s[expected.from] = highlightStyles.correct;
      s[expected.to] = highlightStyles.correct;
    }
    if (wrong) {
      s[wrong.from] = highlightStyles.wrong;
      s[wrong.to] = highlightStyles.wrong;
    }
    return s;
  }, [fen, lastMove, selected, showHint, expected, wrong]);

  const arrows = useMemo<Arrow[]>(
    () => (showHint && expected ? [{ startSquare: expected.from, endSquare: expected.to, color: "#16a34a" }] : []),
    [showHint, expected],
  );

  const selectLine = useCallback((id: number) => {
    setLineId(id);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `/train?line=${id}`);
  }, []);

  const nextLine = useCallback(() => {
    if (!lines.length || !line) return;
    const idx = lines.findIndex((l) => l.id === line.id);
    selectLine(lines[(idx + 1) % lines.length].id);
  }, [lines, line, selectLine]);

  const randomLine = useCallback(() => {
    if (lines.length < 2) return;
    const others = lines.filter((l) => l.id !== lineId);
    selectLine(others[Math.floor(Math.random() * others.length)].id);
  }, [lines, lineId, selectLine]);

  const weakestLine = useCallback(() => {
    if (!lines.length) return;
    const sorted = [...lines].sort((a, b) => a.stats.mastery - b.stats.mastery || b.stats.unresolvedMistakes - a.stats.unresolvedMistakes);
    const pick = sorted.find((l) => l.id !== lineId) ?? sorted[0];
    selectLine(pick.id);
  }, [lines, lineId, selectLine]);

  if (!lines.length || !line) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">Тренажёр</h1>
        <EmptyState
          icon={<Swords className="h-7 w-7" />}
          title="Нечего тренировать"
          description="Добавьте хотя бы одну линию в репертуар — и тренажёр оживёт: чёрные будут делать ходы, а вы искать правильные ответы."
          action={<LinkButton href="/repertoire">Открыть репертуар</LinkButton>}
        />
      </div>
    );
  }

  const totalWhite = whiteMoveCount(plies);
  const userMovesDone = Math.ceil(ply / 2);
  const progress = plies.length ? Math.round((ply / plies.length) * 100) : 0;
  const accuracy = totalWhite ? Math.max(0, Math.round(((totalWhite - mistakes.length) / totalWhite) * 100)) : 100;

  return (
    <div className="space-y-4 animate-fade-in sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">Тренажёр</h1>
          <p className="mt-0.5 text-[13px] leading-snug text-slate-500 sm:text-sm">
            Вы играете белыми. Чёрные отвечают по теории — найдите правильный ход.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className={cn(inputClass, "w-full truncate py-2 pl-9 pr-8 text-[13px] sm:w-auto sm:max-w-[300px]")}
              value={line.id}
              onChange={(e) => selectLine(Number(e.target.value))}
              aria-label="Выбор линии"
            >
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.isTrap ? "⚡ " : ""}
                  {l.name} · {l.stats.mastery}%
                </option>
              ))}
            </select>
          </div>
          <Button variant="secondary" size="md" onClick={weakestLine} className="shrink-0 px-2.5" title="Линия с самой низкой освоенностью" aria-label="Слабая линия">
            <TrendingDown className="h-4 w-4" />
            <span className="hidden sm:inline">Слабая</span>
          </Button>
          <Button variant="secondary" size="md" onClick={randomLine} disabled={lines.length < 2} className="shrink-0 px-2.5" title="Случайная линия" aria-label="Случайная линия">
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">Случайная</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        {/* Board column */}
        <div className="min-w-0">
          <div key={shakeKey} className={cn(wrong && "animate-shake")}>
            <Board
              id="trainer"
              fen={fen}
              squareStyles={squareStyles}
              arrows={arrows}
              canDragPiece={canDragPiece}
              onPieceDrop={onPieceDrop}
              onSquareClick={onSquareClick}
              allowDragging={phase === "user"}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500 sm:text-xs">
            <span className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Перетащите фигуру или коснитесь её, затем поля</span>
            </span>
            <span className="shrink-0 font-mono">
              {ply}/{plies.length}
            </span>
          </div>
          <ProgressBar value={progress} tone="slate" className="mt-2" />
        </div>

        {/* Panel */}
        <div className="min-w-0 space-y-3 sm:space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge>{line.category}</Badge>
              {line.isTrap && (
                <Badge tone="amber">
                  <Zap className="h-3 w-3" /> ловушка
                </Badge>
              )}
              <Badge tone={line.stats.mastery >= 80 ? "emerald" : line.stats.mastery >= 40 ? "amber" : "slate"}>освоено {line.stats.mastery}%</Badge>
            </div>
            <Link href={`/repertoire/${line.id}`} className="mt-2 flex items-start gap-1 text-base font-semibold leading-snug text-slate-900 hover:underline sm:text-lg">
              <span className="min-w-0">{line.name}</span>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
            </Link>

            <div className="mt-3 sm:mt-4">
              {phase === "done" ? (
                <DoneSummary
                  mistakes={mistakes.length}
                  accuracy={accuracy}
                  saving={saving}
                  stats={savedStats}
                  isTrap={line.isTrap}
                  trapNote={line.trapNote}
                  onRepeat={reset}
                  onNext={nextLine}
                  hasMore={lines.length > 1}
                />
              ) : wrong ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 animate-rise sm:p-4" role="alert">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-700">
                    <X className="h-4 w-4 shrink-0" /> Неверно: <span className="font-mono">{wrong.san}</span>
                  </p>
                  <p className="mt-1 text-sm text-rose-800">
                    Правильно: <span className="font-mono text-base font-bold text-emerald-700">{expected ? moveLabel(ply, expected.san) : "—"}</span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-rose-600">Зелёная стрелка показывает нужный ход. Сделайте его, чтобы продолжить.</p>
                </div>
              ) : phase === "opponent" ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-600 sm:p-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Чёрные отвечают…
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 animate-rise sm:p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
                    <Play className="h-4 w-4 shrink-0" />
                    {ply === 0 ? "Ваш ход — начните линию" : showHint ? "Сделайте показанный ход" : `Ход ${Math.floor(ply / 2) + 1}. Ваш ход белыми`}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                    {ply === 0 ? "Первый ход белых в гамбите Блэкмара-Димера." : `Осталось ${totalWhite - userMovesDone} ${totalWhite - userMovesDone === 1 ? "ход" : "ходов"} белых.`}
                  </p>
                </div>
              )}
            </div>

            {phase !== "done" && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:flex sm:flex-wrap sm:items-center">
                <Button variant="secondary" size="md" onClick={revealMove} disabled={phase !== "user" || !expected} className="w-full sm:w-auto">
                  <Lightbulb className="h-4 w-4" />
                  {showHint ? "Сделать за меня" : "Подсказка"}
                </Button>
                <Button variant="ghost" size="md" onClick={reset} className="w-full sm:w-auto">
                  <RotateCcw className="h-4 w-4" /> Заново
                </Button>
                <span className="col-span-2 flex items-center justify-center gap-1.5 text-xs text-slate-500 sm:col-span-1 sm:ml-auto">
                  Ошибок:
                  <span className={cn("font-semibold", mistakes.length ? "text-rose-600" : "text-emerald-600")}>{mistakes.length}</span>
                </span>
              </div>
            )}
          </Card>

          {/* Moves so far */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <ListChecks className="h-4 w-4 text-slate-400" /> Сыгранные ходы
              </h2>
              <span className="shrink-0 text-xs text-slate-500">
                {userMovesDone}/{totalWhite} ходов белых
              </span>
            </div>
            <div className="mt-3 flex min-h-[40px] flex-wrap gap-1 font-mono text-[13px] sm:text-sm">
              {ply === 0 && <span className="text-slate-400">Пока пусто — ходы появятся по мере прохождения.</span>}
              {plies.slice(0, ply).map((san, i) => (
                <span
                  key={i}
                  className={cn("rounded-md px-1.5 py-0.5", i % 2 === 0 ? "bg-slate-100 text-slate-900" : "text-slate-600", i === ply - 1 && "ring-2 ring-amber-400")}
                >
                  {i % 2 === 0 && <span className="mr-1 text-slate-400">{i / 2 + 1}.</span>}
                  {san}
                </span>
              ))}
              {phase !== "done" && ply < plies.length && (
                <span className="rounded-md border border-dashed border-slate-300 px-1.5 py-0.5 text-slate-400">
                  {ply % 2 === 0 && <span className="mr-1">{ply / 2 + 1}.</span>}?
                </span>
              )}
            </div>
          </Card>

          {session.completed > 0 && (
            <p className="text-center text-xs text-slate-500">
              За сессию: пройдено {session.completed}, без ошибок {session.clean}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DoneSummary({
  mistakes,
  accuracy,
  saving,
  stats,
  isTrap,
  trapNote,
  onRepeat,
  onNext,
  hasMore,
}: {
  mistakes: number;
  accuracy: number;
  saving: boolean;
  stats: LineDTO["stats"] | null;
  isTrap: boolean;
  trapNote: string;
  onRepeat: () => void;
  onNext: () => void;
  hasMore: boolean;
}) {
  const clean = mistakes === 0;
  return (
    <div className={cn("rounded-xl border p-3.5 animate-pop sm:p-4", clean ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("flex items-center gap-1.5 text-[15px] font-semibold", clean ? "text-emerald-800" : "text-amber-900")}>
            {clean ? <Trophy className="h-4 w-4 shrink-0" /> : <CircleCheck className="h-4 w-4 shrink-0" />}
            {clean ? "Линия пройдена без ошибок!" : "Линия пройдена"}
          </p>
          <p className={cn("mt-1 text-[13px] leading-snug", clean ? "text-emerald-700" : "text-amber-800")}>
            Точность {accuracy}% · {mistakes === 0 ? "ошибок нет" : `${mistakes} ${mistakes === 1 ? "ошибка" : mistakes < 5 ? "ошибки" : "ошибок"} в журнале`}
          </p>
        </div>
        <div className="shrink-0 text-right text-xs text-slate-600">
          {saving ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> сохраняем
            </span>
          ) : stats ? (
            <>
              <div>освоено</div>
              <div className="text-lg font-bold text-slate-900">{stats.mastery}%</div>
            </>
          ) : null}
        </div>
      </div>
      {isTrap && trapNote && (
        <p className="mt-3 rounded-lg bg-white/70 p-2.5 text-xs leading-relaxed text-slate-700">
          <span className="font-semibold">Запомните: </span>
          {trapNote}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button size="md" onClick={onRepeat} className="w-full sm:w-auto">
          <RotateCcw className="h-4 w-4" /> Повторить
        </Button>
        {hasMore && (
          <Button size="md" variant="accent" onClick={onNext} className="w-full sm:w-auto">
            Следующая <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        <Link href="/mistakes" className="col-span-2 flex items-center justify-center gap-1 py-1 text-xs font-medium text-slate-600 hover:underline sm:ml-auto sm:self-center">
          <Check className="h-3.5 w-3.5" /> журнал ошибок
        </Link>
      </div>
    </div>
  );
}
