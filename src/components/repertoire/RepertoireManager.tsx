"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { MiniBoard } from "@/components/board/MiniBoard";
import { LineForm } from "@/components/repertoire/LineForm";
import { Badge, Button, Card, DifficultyDots, EmptyState, ProgressBar, cn, formatRelative, inputClass, useToast } from "@/components/ui";
import { BookOpen, Library, Pencil, Play, Plus, Search, SlidersHorizontal, Sparkles, Trash2, Zap } from "lucide-react";
import { finalFen, toNumbered } from "@/lib/chess";
import type { LineDTO, LineInput, LineStats } from "@/lib/types";

const emptyStats: LineStats = { attempts: 0, correct: 0, accuracy: 0, mastery: 0, lastTrainedAt: null, unresolvedMistakes: 0, recent: [] };

type SortKey = "default" | "mastery-asc" | "mastery-desc" | "recent" | "name";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Ошибка запроса");
  return data as T;
}

export function RepertoireManager({ initialLines, initialCategory }: { initialLines: LineDTO[]; initialCategory?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [lines, setLines] = useState<LineDTO[]>(initialLines);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(initialCategory ?? "all");
  const [onlyTraps, setOnlyTraps] = useState(false);
  const [sort, setSort] = useState<SortKey>("default");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LineDTO | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const categories = useMemo(() => [...new Set(lines.map((l) => l.category))].sort(), [lines]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = lines.filter(
      (l) =>
        (category === "all" || l.category === category) &&
        (!onlyTraps || l.isTrap) &&
        (!q || l.name.toLowerCase().includes(q) || l.moves.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)),
    );
    switch (sort) {
      case "mastery-asc":
        arr = [...arr].sort((a, b) => a.stats.mastery - b.stats.mastery);
        break;
      case "mastery-desc":
        arr = [...arr].sort((a, b) => b.stats.mastery - a.stats.mastery);
        break;
      case "recent":
        arr = [...arr].sort((a, b) => (b.stats.lastTrainedAt ?? "").localeCompare(a.stats.lastTrainedAt ?? ""));
        break;
      case "name":
        arr = [...arr].sort((a, b) => a.name.localeCompare(b.name, "ru"));
        break;
    }
    return arr;
  }, [lines, query, category, onlyTraps, sort]);

  const markPending = (id: number, on: boolean) =>
    setPendingIds((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const createLine = useCallback(
    async (input: LineInput) => {
      const tempId = -Date.now();
      const optimistic: LineDTO = {
        id: tempId,
        name: input.name,
        category: input.category,
        eco: input.eco ?? "D00",
        description: input.description ?? "",
        moves: input.moves,
        isTrap: Boolean(input.isTrap),
        trapNote: input.trapNote ?? "",
        difficulty: input.difficulty ?? 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: emptyStats,
      };
      setLines((ls) => [...ls, optimistic]);
      markPending(tempId, true);
      try {
        const { line } = await api<{ line: LineDTO }>("/api/lines", { method: "POST", body: JSON.stringify(input) });
        setLines((ls) => ls.map((l) => (l.id === tempId ? line : l)));
        toast.push("Линия добавлена в репертуар", "success");
        router.refresh();
      } catch (e) {
        setLines((ls) => ls.filter((l) => l.id !== tempId));
        toast.push(e instanceof Error ? e.message : "Не удалось сохранить", "error");
        throw e;
      } finally {
        markPending(tempId, false);
      }
    },
    [router, toast],
  );

  const updateLine = useCallback(
    async (id: number, input: LineInput) => {
      const prev = lines.find((l) => l.id === id);
      if (!prev) return;
      setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...input, isTrap: Boolean(input.isTrap), trapNote: input.trapNote ?? "", description: input.description ?? "", difficulty: input.difficulty ?? l.difficulty } : l)));
      markPending(id, true);
      try {
        const { line } = await api<{ line: LineDTO }>(`/api/lines/${id}`, { method: "PATCH", body: JSON.stringify(input) });
        setLines((ls) => ls.map((l) => (l.id === id ? line : l)));
        toast.push("Изменения сохранены", "success");
        router.refresh();
      } catch (e) {
        setLines((ls) => ls.map((l) => (l.id === id ? prev : l)));
        toast.push(e instanceof Error ? e.message : "Не удалось сохранить", "error");
        throw e;
      } finally {
        markPending(id, false);
      }
    },
    [lines, router, toast],
  );

  const deleteLine = useCallback(
    async (id: number) => {
      const prev = lines;
      setConfirmId(null);
      setLines((ls) => ls.filter((l) => l.id !== id));
      try {
        await api(`/api/lines/${id}`, { method: "DELETE" });
        toast.push("Линия удалена", "info");
        router.refresh();
      } catch (e) {
        setLines(prev);
        toast.push(e instanceof Error ? e.message : "Не удалось удалить", "error");
      }
    },
    [lines, router, toast],
  );

  const importDemo = useCallback(async () => {
    setImporting(true);
    try {
      const { imported, lines: fresh } = await api<{ imported: number; lines: LineDTO[] }>("/api/lines/import-demo", { method: "POST" });
      setLines(fresh);
      toast.push(imported ? `Добавлено линий: ${imported}` : "Все демо-линии уже в репертуаре", imported ? "success" : "info");
      router.refresh();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : "Не удалось загрузить", "error");
    } finally {
      setImporting(false);
    }
  }, [router, toast]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">Репертуар</h1>
          <p className="mt-1 text-sm text-slate-500">
            {lines.length ? `${lines.length} линий · ${lines.filter((l) => l.isTrap).length} ловушек · освоено ${lines.filter((l) => l.stats.mastery >= 80).length}` : "Ваша коллекция вариантов гамбита Блэкмара-Димера"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {lines.length > 0 && (
            <Button variant="secondary" onClick={importDemo} loading={importing} className="w-full sm:w-auto">
              <Sparkles className="h-4 w-4" /> Демо-линии
            </Button>
          )}
          <Button
            variant="accent"
            className={cn("w-full sm:w-auto", lines.length === 0 && "col-span-2")}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Новая линия
          </Button>
        </div>
      </div>

      {lines.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title="В репертуаре пока нет линий"
          description="Запишите первую линию прямо на доске или загрузите стартовый набор: 15 вариантов гамбита Блэкмара-Димера, включая ловушку Халосара."
          action={
            <>
              <Button variant="accent" onClick={importDemo} loading={importing}>
                <Sparkles className="h-4 w-4" /> Загрузить демо-репертуар
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Добавить свою линию
              </Button>
            </>
          }
        />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className={cn(inputClass, "pl-9")} placeholder="Поиск по названию, ходам или описанию" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <select className={cn(inputClass, "w-full py-2 sm:w-auto")} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">Все защиты</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select className={cn(inputClass, "w-full py-2 sm:w-auto")} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="default">По порядку</option>
                <option value="mastery-asc">Сначала слабые</option>
                <option value="mastery-desc">Сначала освоенные</option>
                <option value="recent">Недавно тренировались</option>
                <option value="name">По названию</option>
              </select>
              <button
                type="button"
                onClick={() => setOnlyTraps((v) => !v)}
                className={cn(
                  "col-span-2 flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition sm:col-span-1",
                  onlyTraps ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                <Zap className="h-3.5 w-3.5" /> Только ловушки
              </button>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте изменить запрос или сбросить фильтры."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setCategory("all");
                    setOnlyTraps(false);
                  }}
                >
                  Сбросить фильтры
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((line) => (
                <LineCard
                  key={line.id}
                  line={line}
                  pending={pendingIds.has(line.id)}
                  confirming={confirmId === line.id}
                  onEdit={() => {
                    setEditing(line);
                    setFormOpen(true);
                  }}
                  onAskDelete={() => setConfirmId(line.id)}
                  onCancelDelete={() => setConfirmId(null)}
                  onDelete={() => deleteLine(line.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <LineForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSubmit={(input) => (editing ? updateLine(editing.id, input) : createLine(input))}
      />
    </div>
  );
}

function LineCard({
  line,
  pending,
  confirming,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  line: LineDTO;
  pending: boolean;
  confirming: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const fen = useMemo(() => finalFen(line.moves), [line.moves]);
  const sans = line.moves.split(" ");
  const mastery = line.stats.mastery;
  const tone = mastery >= 80 ? "emerald" : mastery >= 40 ? "amber" : line.stats.attempts ? "rose" : "slate";
  const isTemp = line.id < 0;

  return (
    <Card className={cn("group relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg animate-rise", pending && "opacity-70")}>
      <div className="flex gap-4 p-4">
        <Link href={isTemp ? "#" : `/repertoire/${line.id}`} className="w-24 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200 sm:w-28">
          <MiniBoard fen={fen} size={112} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>{line.category}</Badge>
            {line.isTrap && (
              <Badge tone="amber">
                <Zap className="h-3 w-3" /> ловушка
              </Badge>
            )}
          </div>
          <Link href={isTemp ? "#" : `/repertoire/${line.id}`} className="mt-2 block text-sm font-semibold leading-snug text-slate-900 hover:underline">
            {line.name}
          </Link>
          <p className="mt-1 line-clamp-2 font-mono text-[11px] leading-relaxed text-slate-500">{toNumbered(sans)}</p>
          <DifficultyDots level={line.difficulty} className="mt-2" />
        </div>
      </div>

      <div className="mt-auto border-t border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {line.stats.attempts ? `${line.stats.attempts} попыт. · ${formatRelative(line.stats.lastTrainedAt)}` : "ещё не тренировалась"}
          </span>
          <Badge tone={tone}>{line.stats.attempts ? `${mastery}%` : "новая"}</Badge>
        </div>
        <ProgressBar value={mastery} className="mt-2" />
        <div className="mt-3 flex items-center gap-2">
          {confirming ? (
            <div className="flex w-full items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-1.5 ring-1 ring-rose-200 animate-pop">
              <span className="text-xs font-medium text-rose-700">Удалить линию?</span>
              <div className="flex gap-1">
                <Button size="sm" variant="danger" onClick={onDelete}>
                  Удалить
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelDelete}>
                  Нет
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Link
                href={isTemp ? "#" : `/train?line=${line.id}`}
                className={cn("inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-800 sm:h-8", isTemp && "pointer-events-none opacity-50")}
              >
                <Play className="h-3.5 w-3.5" /> Тренировать
              </Link>
              <button
                onClick={onEdit}
                disabled={isTemp}
                className="flex h-9 items-center justify-center rounded-lg px-2.5 text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50 sm:h-8"
                title="Редактировать"
                aria-label="Редактировать линию"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onAskDelete}
                disabled={isTemp}
                className="flex h-9 items-center justify-center rounded-lg px-2 text-slate-400 ring-1 ring-inset ring-slate-200 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 sm:h-8"
                title="Удалить"
                aria-label="Удалить линию"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
