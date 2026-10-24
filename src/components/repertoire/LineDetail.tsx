"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Chess } from "chess.js";
import { Board, highlightStyles } from "@/components/board/Board";
import { LineForm } from "@/components/repertoire/LineForm";
import { Badge, Button, Card, DifficultyDots, LinkButton, ProgressBar, cn, formatRelative, useToast } from "@/components/ui";
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Play, SkipBack, SkipForward, Trash2, Zap } from "lucide-react";
import { moveLabel } from "@/lib/chess";
import type { LineDTO, LineInput, MistakeDTO } from "@/lib/types";

export function LineDetail({ line: initialLine, mistakes }: { line: LineDTO; mistakes: MistakeDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [line, setLine] = useState(initialLine);
  const [prevInitial, setPrevInitial] = useState(initialLine);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (prevInitial !== initialLine) {
    setPrevInitial(initialLine);
    setLine(initialLine);
  }

  const sans = useMemo(() => line.moves.split(" ").filter(Boolean), [line.moves]);
  const positions = useMemo(() => {
    const game = new Chess();
    const list: { fen: string; from?: string; to?: string }[] = [{ fen: game.fen() }];
    for (const san of sans) {
      const mv = game.move(san);
      list.push({ fen: game.fen(), from: mv.from, to: mv.to });
    }
    return list;
  }, [sans]);

  const [ply, setPly] = useState(sans.length);
  const [prevLen, setPrevLen] = useState(sans.length);
  if (prevLen !== sans.length) {
    setPrevLen(sans.length);
    setPly(sans.length);
  }

  const go = useCallback((p: number) => setPly(Math.max(0, Math.min(sans.length, p))), [sans.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editOpen) return;
      if (e.key === "ArrowLeft") go(ply - 1);
      if (e.key === "ArrowRight") go(ply + 1);
      if (e.key === "Home") go(0);
      if (e.key === "End") go(sans.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ply, go, sans.length, editOpen]);

  const current = positions[ply];
  const squareStyles = useMemo(() => {
    const s: Record<string, CSSProperties> = {};
    if (current?.from && current.to) {
      s[current.from] = highlightStyles.lastMove;
      s[current.to] = highlightStyles.lastMove;
    }
    return s;
  }, [current]);

  const update = useCallback(
    async (input: LineInput) => {
      const res = await fetch(`/api/lines/${line.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить");
      setLine(data.line);
      toast.push("Изменения сохранены", "success");
      router.refresh();
    },
    [line.id, router, toast],
  );

  const remove = useCallback(async () => {
    setDeleting(true);
    const res = await fetch(`/api/lines/${line.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.push("Линия удалена", "info");
      router.push("/repertoire");
      router.refresh();
    } else {
      setDeleting(false);
      toast.push("Не удалось удалить линию", "error");
    }
  }, [line.id, router, toast]);

  const mastery = line.stats.mastery;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link href="/repertoire" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-3.5 w-3.5" /> Репертуар
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{line.category}</Badge>
            <Badge tone="sky">{line.eco}</Badge>
            {line.isTrap && (
              <Badge tone="amber">
                <Zap className="h-3 w-3" /> ловушка
              </Badge>
            )}
            <DifficultyDots level={line.difficulty} />
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">{line.name}</h1>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <LinkButton href={`/train?line=${line.id}`} variant="accent" className="w-full sm:w-auto">
            <Play className="h-4 w-4" /> Тренировать
          </LinkButton>
          <Button variant="secondary" onClick={() => setEditOpen(true)} className="w-full sm:w-auto">
            <Pencil className="h-4 w-4" /> Изменить
          </Button>
          {confirmDelete ? (
            <div className="col-span-2 flex items-center gap-1 rounded-xl bg-rose-50 px-2 py-1 ring-1 ring-rose-200 animate-pop sm:col-span-1">
              <Button size="sm" variant="danger" onClick={remove} loading={deleting}>
                <Trash2 className="h-3.5 w-3.5" /> Да, удалить
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Отмена
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="w-full text-rose-600 hover:bg-rose-50 sm:w-auto">
              <Trash2 className="h-4 w-4" /> Удалить
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Viewer */}
        <div>
          <Board id="viewer" fen={current.fen} squareStyles={squareStyles} allowDragging={false} />
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={() => go(0)} disabled={ply === 0} aria-label="В начало" className="px-2.5">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="secondary" onClick={() => go(ply - 1)} disabled={ply === 0} aria-label="Назад" className="px-2.5">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="secondary" onClick={() => go(ply + 1)} disabled={ply === sans.length} aria-label="Вперёд" className="px-2.5">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="secondary" onClick={() => go(sans.length)} disabled={ply === sans.length} aria-label="В конец" className="px-2.5">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            <span className="font-mono text-xs text-slate-500">
              {ply}/{sans.length} · {ply ? moveLabel(ply - 1, sans[ply - 1]) : "начальная позиция"}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Стрелки ← → на клавиатуре листают ходы.</p>
        </div>

        <div className="space-y-4">
          {/* Moves */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Ходы</h2>
            <div className="mt-3 flex flex-wrap gap-1 font-mono text-sm">
              {sans.map((san, i) => (
                <button
                  key={i}
                  onClick={() => go(i + 1)}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 transition",
                    i + 1 === ply ? "bg-slate-900 text-white" : i % 2 === 0 ? "text-slate-900 hover:bg-slate-100" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {i % 2 === 0 && <span className="mr-1 text-slate-400">{i / 2 + 1}.</span>}
                  {san}
                </button>
              ))}
            </div>
          </Card>

          {/* Notes */}
          {(line.description || line.trapNote) && (
            <Card className="p-5">
              {line.isTrap && line.trapNote && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
            <Zap className="h-3.5 w-3.5" /> Механика ловушки
          </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-amber-900">{line.trapNote}</p>
                </div>
              )}
              {line.description && (
                <>
                  <h2 className="text-sm font-semibold text-slate-900">План за белых</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{line.description}</p>
                </>
              )}
            </Card>
          )}

          {/* Stats */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Статистика</h2>
              <Badge tone={mastery >= 80 ? "emerald" : mastery >= 40 ? "amber" : line.stats.attempts ? "rose" : "slate"}>
                {line.stats.attempts ? `освоено ${mastery}%` : "ещё не тренировалась"}
              </Badge>
            </div>
            <ProgressBar value={mastery} className="mt-3" />
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">Попыток</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">{line.stats.attempts}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">Точность</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">{line.stats.accuracy}%</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">Ошибок</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">{line.stats.unresolvedMistakes}</dd>
              </div>
            </dl>
            {line.stats.recent.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <span>Последние:</span>
                <div className="flex gap-1">
                  {line.stats.recent.map((ok, i) => (
                    <span key={i} className={cn("h-2.5 w-2.5 rounded-full", ok ? "bg-emerald-500" : "bg-rose-400")} />
                  ))}
                </div>
                <span className="ml-auto">{formatRelative(line.stats.lastTrainedAt)}</span>
              </div>
            )}
          </Card>

          {/* Mistakes */}
          {mistakes.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Ошибки в этой линии</h2>
                <Link href="/mistakes" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
                  все <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <ul className="mt-3 divide-y divide-slate-100">
                {mistakes.slice(0, 6).map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                    <button onClick={() => go(m.ply)} className="font-mono text-xs text-slate-500 hover:text-slate-900" title="Показать позицию">
                      {Math.floor(m.ply / 2) + 1}.
                    </button>
                    <span className="font-mono text-rose-600 line-through">{m.playedMove === "?" ? "подсказка" : m.playedMove}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-mono font-semibold text-emerald-700">{m.expectedMove}</span>
                    <span className="ml-auto text-xs text-slate-400">{m.resolved ? "решена" : formatRelative(m.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <LineForm open={editOpen} onClose={() => setEditOpen(false)} initial={line} onSubmit={update} />
    </div>
  );
}
