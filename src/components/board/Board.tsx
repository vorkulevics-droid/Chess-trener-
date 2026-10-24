"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { defaultPieces } from "react-chessboard";
import type { Arrow, PieceDropHandlerArgs, PieceHandlerArgs, PieceRenderObject, SquareHandlerArgs } from "react-chessboard";

/**
 * Cburnett piece set with a subtle drop shadow so white pieces (solid white fill,
 * dark outline) read clearly against the light squares and feel lifted off the board.
 */
const shadowedPieces: PieceRenderObject = Object.fromEntries(
  Object.entries(defaultPieces).map(([key, render]) => [
    key,
    (props) =>
      render({
        ...props,
        svgStyle: {
          filter: key.startsWith("w") ? "drop-shadow(0px 1px 0.8px rgba(15,23,42,0.45))" : "drop-shadow(0px 1px 0.8px rgba(15,23,42,0.3))",
          ...props?.svgStyle,
        },
      }),
  ]),
) as PieceRenderObject;

const Chessboard = dynamic(() => import("react-chessboard").then((m) => m.Chessboard), {
  ssr: false,
  loading: () => <div className="skeleton aspect-square w-full rounded-xl" />,
});

export const BOARD_LIGHT = "#f0d9b5";
export const BOARD_DARK = "#b58863";

export type BoardProps = {
  id?: string;
  fen: string;
  orientation?: "white" | "black";
  squareStyles?: Record<string, CSSProperties>;
  arrows?: Arrow[];
  allowDragging?: boolean;
  animationMs?: number;
  canDragPiece?: (args: PieceHandlerArgs) => boolean;
  onPieceDrop?: (args: PieceDropHandlerArgs) => boolean;
  onSquareClick?: (args: SquareHandlerArgs) => void;
  className?: string;
};

export function Board({
  id = "board",
  fen,
  orientation = "white",
  squareStyles,
  arrows,
  allowDragging = true,
  animationMs = 200,
  canDragPiece,
  onPieceDrop,
  onSquareClick,
  className,
}: BoardProps) {
  return (
    <div className={className} style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
      <div className="board-shadow overflow-hidden rounded-xl">
        <Chessboard
          options={{
            id,
            position: fen,
            pieces: shadowedPieces,
            boardOrientation: orientation,
            squareStyles: squareStyles ?? {},
            arrows: arrows ?? [],
            allowDragging,
            allowDrawingArrows: false,
            animationDurationInMs: animationMs,
            canDragPiece,
            onPieceDrop: onPieceDrop ?? (() => false),
            onSquareClick,
            darkSquareStyle: { backgroundColor: BOARD_DARK },
            lightSquareStyle: { backgroundColor: BOARD_LIGHT },
            darkSquareNotationStyle: { color: BOARD_LIGHT, fontSize: "11px", fontWeight: 600 },
            lightSquareNotationStyle: { color: BOARD_DARK, fontSize: "11px", fontWeight: 600 },
            boardStyle: { borderRadius: "12px" },
            dropSquareStyle: { boxShadow: "inset 0 0 0 3px rgba(245, 158, 11, 0.8)" },
          }}
        />
      </div>
    </div>
  );
}

export const highlightStyles = {
  lastMove: { backgroundColor: "rgba(250, 204, 21, 0.45)" } as CSSProperties,
  wrong: { backgroundColor: "rgba(239, 68, 68, 0.65)" } as CSSProperties,
  correct: { backgroundColor: "rgba(34, 197, 94, 0.5)" } as CSSProperties,
  selected: { backgroundColor: "rgba(59, 130, 246, 0.45)" } as CSSProperties,
  target: {
    background: "radial-gradient(circle, rgba(15,23,42,0.22) 24%, transparent 26%)",
  } as CSSProperties,
  capture: {
    background: "radial-gradient(circle, transparent 60%, rgba(15,23,42,0.25) 62%)",
  } as CSSProperties,
};
