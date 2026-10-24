"use client";

import { Chess, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import { Board, highlightStyles } from "@/components/board/Board";
import { Button, Field, Modal, cn, inputClass } from "@/components/ui";
import { RotateCcw, Undo2, Zap } from "lucide-react";
import { CATEGORIES, toNumbered, validateMoves } from "@/lib/chess";
import type { LineDTO, LineInput } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: LineDTO | null;
  onSubmit: (input: LineInput) => Promise<void>;
};

const DEFAULT_START = "d4 d5 e4 dxe4 Nc3 Nf6 f3";

export function LineForm({ open, onClose, initial, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [difficulty, setDifficulty] = useState(2);
  const [isTrap, setIsTrap] = useState(false);
  const [trapNote, setTrapNote] = useState("");
  const [description, setDescription] = useState("");
  const [sans, setSans] = useState<string[]>([]);
  const [tab, setTab] = useState<"board" | "text">("board");
  const [text, setText] = useState("");
  const [textError, setTextError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());

  const loadMoves = useCallback((moves: string[]) => {
    const game = new Chess();
    for (const m of moves) game.move(m);
    gameRef.current = game;
    setSans(moves);
    setFen(game.fen());
    setSelected(null);
    const hist = game.history({ verbose: true });
    const last = hist[hist.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
  }, []);

  // Reset state whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setCategory(initial?.category ?? CATEGORIES[0]);
    setDifficulty(initial?.difficulty ?? 2);
    setIsTrap(initial?.isTrap ?? false);
    setTrapNote(initial?.trapNote ?? "");
    setDescription(initial?.description ?? "");
    setError(null);
    setTextError(null);
    setTab("board");
    const moves = initial ? initial.moves.split(" ").filter(Boolean) : DEFAULT_START.split(" ");
    loadMoves(moves);
    setText(toNumbered(moves));
  }, [open, initial, loadMoves]);

  useEffect(() => {
    setText(toNumbered(sans));
  }, [sans]);

  const tryMove = useCallback(
    (from: string, to: string) => {
      const game = gameRef.current;
      try {
        const mv = game.move({ from, to, promotion: "q" });
        setSans((s) => [...s, mv.san]);
        setFen(game.fen());
        setLastMove({ from: mv.from, to: mv.to });
        setSelected(null);
        return true;
      } catch {
        return false;
      }
    },
    [],
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
      if (selected && tryMove(selected, square)) return;
      if (piece && piece.pieceType[0] === fen.split(" ")[1]) setSelected(square);
      else setSelected(null);
    },
    [selected, tryMove, fen],
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = highlightStyles.lastMove;
      styles[lastMove.to] = highlightStyles.lastMove;
    }
    if (selected) {
      styles[selected] = highlightStyles.selected;
      for (const m of new Chess(fen).moves({ square: selected as Square, verbose: true })) {
        styles[m.to] = m.captured ? highlightStyles.capture : highlightStyles.target;
      }
    }
    return styles;
  }, [fen, lastMove, selected]);

  function undo() {
    if (!sans.length) return;
    loadMoves(sans.slice(0, -1));
  }

  function applyText() {
    const v = validateMoves(text);
    if (!v.ok) {
      setTextError(v.error);
      return;
    }
    setTextError(null);
    loadMoves(v.sans);
    setTab("board");
  }

  async function submit() {
    setError(null);
    if (name.trim().length < 3) return setError("Название должно содержать минимум 3 символа");
    if (sans.length < 2) return setError("Запишите хотя бы два полухода");
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        category: category.trim() || "Другое",
        description: description.trim(),
        moves: sans.join(" "),
        isTrap,
        trapNote: isTrap ? trapNote.trim() : "",
        difficulty,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const endsWithWhite = sans.length % 2 === 1;
  const sideToMove = fen.split(" ")[1] === "w" ? "белых" : "чёрных";

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Редактировать линию" : "Новая линия"} description="Запишите ходы на доске или вставьте PGN, затем заполните описание." size="xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Recorder */}
        <div>
          <div className="mb-3 flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-sm">
            {(["board", "text"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn("flex-1 rounded-lg px-3 py-1.5 font-medium transition", tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >
                {t === "board" ? "Записать на доске" : "Вставить PGN / текст"}
              </button>
            ))}
          </div>

          {tab === "board" ? (
            <>
              <Board id="recorder" fen={fen} squareStyles={squareStyles} onPieceDrop={onPieceDrop} onSquareClick={onSquareClick} animationMs={150} />
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Ход {sideToMove} · {sans.length} {sans.length === 1 ? "полуход" : sans.length < 5 ? "полухода" : "полуходов"}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={undo} disabled={!sans.length}>
                    <Undo2 className="h-3.5 w-3.5" /> Отменить
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => loadMoves([])} disabled={!sans.length}>
                    <RotateCcw className="h-3.5 w-3.5" /> Сброс
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div>
              <textarea
                className={cn(inputClass, "min-h-[260px] font-mono text-xs leading-relaxed")}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="1.d4 d5 2.e4 dxe4 3.Nc3 Nf6 4.f3 exf3 5.Nxf3 ..."
              />
              {textError && <p className="mt-2 text-xs text-rose-600">{textError}</p>}
              <div className="mt-3 flex justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={applyText}>
                  Применить на доске
                </Button>
              </div>
            </div>
          )}

          <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="font-mono text-xs leading-relaxed text-slate-700">{sans.length ? toNumbered(sans) : <span className="text-slate-400">Ходы появятся здесь…</span>}</p>
          </div>
          {sans.length > 0 && !endsWithWhite && (
            <p className="mt-2 text-xs text-amber-700">Совет: завершайте линию ходом белых — так тренажёр закончится на вашем ответе.</p>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-4">
          <Field label="Название">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Защита Тейхмана: 6.h3 Bxf3 7.Qxf3" />
          </Field>
          <Field label="Категория (защита)">
            <input className={inputClass} list="bdg-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Выберите или введите свою" />
            <datalist id="bdg-categories">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Сложность</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                [1, "Легко"],
                [2, "Средне"],
                [3, "Сложно"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDifficulty(Number(v))}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition",
                    difficulty === v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-amber-500" checked={isTrap} onChange={(e) => setIsTrap(e.target.checked)} />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <Zap className="h-3.5 w-3.5 text-amber-600" /> Это тактическая ловушка
              </span>
              <span className="block text-xs text-slate-500">Линия будет помечена и получит отдельную заметку о механике ловушки.</span>
            </span>
          </label>
          {isTrap && (
            <Field label="Как работает ловушка">
              <textarea className={cn(inputClass, "min-h-[80px]")} value={trapNote} onChange={(e) => setTrapNote(e.target.value)} placeholder="Какой ход чёрных ошибочен и почему белые выигрывают" />
            </Field>
          )}
          <Field label="Описание / план за белых">
            <textarea className={cn(inputClass, "min-h-[96px]")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Идеи, типичные планы, что запомнить" />
          </Field>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700" role="alert">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Отмена
            </Button>
            <Button type="button" onClick={submit} loading={saving}>
              {initial ? "Сохранить изменения" : "Добавить в репертуар"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
