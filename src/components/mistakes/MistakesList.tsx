"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { MiniBoard } from "@/components/board/MiniBoard";
import { Badge, Button, Card, EmptyState, LinkButton, cn, formatRelative, useToast } from "@/components/ui";
import { CheckCircle2, Play, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import type { MistakeDTO } from "@/lib/types";

type Filter = "open" | "resolved" | "all";

export function MistakesList({ initialMistakes }: { initialMistakes: MistakeDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initialMistakes);
  const [filter, setFilter] = useState<Filter>("open");
  const [lineFilter, setLineFilter] = useState<number | "all">("all");

  const lineOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of items) map.set(m.lineId, m.lineName);
    return [...map.entries()];
  }, [items]);

  const visible = useMemo(
    () =>
      items.filter(
        (m) => (filter === "all" || (filter === "open" ? !m.resolved : m.resolved)) && (lineFilter === "all" || m.lineId === lineFilter),
      ),
    [items, filter, lineFilter],
  );

  const openCount = items.filter((m) => !m.resolved).length;

  async function toggleResolved(m: MistakeDTO) {
    const next = !m.resolved;
    setItems((xs) => xs.map((x) => (x.id === m.id ? { ...x, resolved: next } : x)));
    const res = await fetch(`/api/mistakes/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolved: next }) });
    if (!res.ok) {
      setItems((xs) => xs.map((x) => (x.id === m.id ? { ...x, resolved: m.resolved } : x)));
      toast.push("Не удалось обновить запись", "error");
    } else {
      router.refresh();
    }
  }

  async function remove(m: MistakeDTO) {
    const prev = items;
    setItems((xs) => xs.filter((x) => x.id !== m.id));
    const res = await fetch(`/api/mistakes/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      setItems(prev);
      toast.push("Не удалось удалить запись", "error");
    } else {
      toast.push("Запись удалена", "info");
      router.refresh();
    }
  }

  async function resolveAllVisible() {
    const targets = visible.filter((m) => !m.resolved);
    if (!targets.length) return;
    const ids = new Set(targets.map((t) => t.id));
    setItems((xs) => xs.map((x) => (ids.has(x.id) ? { ...x, resolved: true } : x)));
    const results = await Promise.all(
      targets.map((t) => fetch(`/api/mistakes/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolved: true }) })),
    );
    if (results.some((r) => !r.ok)) toast.push("Часть записей не обновилась", "error");
    else toast.push(`Отмечено решёнными: ${targets.length}`, "success");
    router.refresh();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">Журнал ошибок</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items.length ? `${openCount} ${openCount === 1 ? "открытая ошибка" : openCount < 5 ? "открытые ошибки" : "открытых ошибок"} из ${items.length}` : "Здесь появятся позиции, в которых вы ошиблись в тренажёре"}
          </p>
        </div>
        {visible.some((m) => !m.resolved) && (
          <Button variant="secondary" onClick={resolveAllVisible} className="w-full sm:w-auto">
            <CheckCircle2 className="h-4 w-4" /> Отметить все решёнными
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-7 w-7" />}
          title="Ошибок нет"
          description="Либо вы ещё не тренировались, либо играете безупречно. В обоих случаях — пора в тренажёр."
          action={<LinkButton href="/train">Открыть тренажёр</LinkButton>}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-sm">
              {(
                [
                  ["open", "Открытые"],
                  ["resolved", "Решённые"],
                  ["all", "Все"],
                ] as [Filter, string][]
              ).map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn("rounded-lg px-3 py-2 font-medium transition sm:py-1.5", filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-auto"
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            >
              <option value="all">Все линии</option>
              {lineOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {visible.length === 0 ? (
            <EmptyState title="Ничего не найдено" description={filter === "open" ? "Все ошибки в этой выборке решены. Отличная работа!" : "Попробуйте другой фильтр."} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((m) => (
                <MistakeCard key={m.id} mistake={m} onToggle={() => toggleResolved(m)} onDelete={() => remove(m)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MistakeCard({ mistake: m, onToggle, onDelete }: { mistake: MistakeDTO; onToggle: () => void; onDelete: () => void }) {
  const highlight = useMemo(() => {
    try {
      const probe = new Chess(m.fen);
      const mv = probe.move(m.expectedMove);
      return [
        { square: mv.from, color: "rgba(34,197,94,0.5)" },
        { square: mv.to, color: "rgba(34,197,94,0.55)" },
      ];
    } catch {
      return [];
    }
  }, [m.fen, m.expectedMove]);

  const moveNo = Math.floor(m.ply / 2) + 1;

  return (
    <Card className={cn("flex flex-col overflow-hidden transition animate-rise", m.resolved && "opacity-75")}>
      <div className="flex gap-4 p-4">
        <div className="w-28 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200">
          <MiniBoard fen={m.fen} size={112} highlight={highlight} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>{m.lineCategory}</Badge>
            {m.resolved ? (
              <Badge tone="emerald">
                <CheckCircle2 className="h-3 w-3" /> решена
              </Badge>
            ) : (
              <Badge tone="rose">
                <TriangleAlert className="h-3 w-3" /> открыта
              </Badge>
            )}
          </div>
          <Link href={`/repertoire/${m.lineId}`} className="mt-2 block truncate text-sm font-semibold text-slate-900 hover:underline" title={m.lineName}>
            {m.lineName}
          </Link>
          <p className="mt-2 text-sm">
            <span className="text-slate-500">Ход {moveNo}:</span>{" "}
            <span className="font-mono text-rose-600 line-through">{m.playedMove === "?" ? "подсказка" : m.playedMove}</span>
            <span className="mx-1.5 text-slate-400">→</span>
            <span className="font-mono text-base font-bold text-emerald-700">{m.expectedMove}</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">{formatRelative(m.createdAt)}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 px-4 py-3">
        <Link href={`/train?line=${m.lineId}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-800 sm:h-8">
          <Play className="h-3.5 w-3.5" /> Отработать
        </Link>
        <button onClick={onToggle} className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 sm:h-8">
          {m.resolved ? "Вернуть" : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> Решена
            </>
          )}
        </button>
        <button
          onClick={onDelete}
          className="ml-auto flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-200 transition hover:bg-rose-50 hover:text-rose-600 sm:h-8"
          aria-label="Удалить запись"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Удалить</span>
        </button>
      </div>
    </Card>
  );
}
