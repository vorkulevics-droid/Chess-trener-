"use client";

import { defaultPieces } from "react-chessboard";

/** Map FEN piece char ("K", "n", ...) to the react-chessboard piece key ("wK", "bN", ...). */
function pieceKey(piece: string): string {
  return piece === piece.toUpperCase() ? `w${piece}` : `b${piece.toUpperCase()}`;
}

function parseFen(fen: string): (string | null)[][] {
  const rows = fen.split(" ")[0].split("/");
  return rows.map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) cells.push(null);
      else cells.push(ch);
    }
    return cells;
  });
}

/**
 * Static board rendered as SVG using the same Cburnett piece set as the interactive
 * chessboard, so white pieces have a solid fill and crisp outline everywhere
 * (previews, landing hero, mistakes journal) — no font-dependent unicode glyphs.
 */
export function MiniBoard({
  fen,
  size = 160,
  highlight = [],
  className,
  light = "#f0d9b5",
  dark = "#b58863",
}: {
  fen: string;
  size?: number;
  highlight?: { square: string; color: string }[];
  className?: string;
  light?: string;
  dark?: string;
}) {
  const board = parseFen(fen);
  const cell = size / 8;
  const hl = new Map(highlight.map((h) => [h.square, h.color]));
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      className={className}
      style={{ aspectRatio: "1 / 1", display: "block" }}
      aria-hidden
    >
      {board.map((row, r) =>
        row.map((piece, c) => {
          const square = `${"abcdefgh"[c]}${8 - r}`;
          const isLight = (r + c) % 2 === 0;
          const renderPiece = piece ? defaultPieces[pieceKey(piece)] : null;
          return (
            <g key={square}>
              <rect x={c * cell} y={r * cell} width={cell} height={cell} fill={isLight ? light : dark} />
              {hl.has(square) && <rect x={c * cell} y={r * cell} width={cell} height={cell} fill={hl.get(square)} />}
              {renderPiece && (
                <svg x={c * cell} y={r * cell} width={cell} height={cell} viewBox="0 0 45 45">
                  {renderPiece({
                    square,
                    svgStyle: { filter: "drop-shadow(0px 0.8px 0.6px rgba(15,23,42,0.35))" },
                  })}
                </svg>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}
