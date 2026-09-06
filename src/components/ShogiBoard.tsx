import React from 'react';
import type { Color, Move, Piece, Square } from '../shogi/types';
import { ShogiSquare } from './ShogiSquare';

interface ShogiBoardProps {
  board: (Piece | null)[][];
  selectedSquare: Square | null;
  legalMoves: Move[];
  lastMove: Move | null;
  isCheck: boolean;
  turn: Color;
  pieceFontMode?: 'two_char' | 'single_char';
  onSquareClick: (square: Square) => void;
}

const FILE_LABELS = ['9', '8', '7', '6', '5', '4', '3', '2', '1'];
const RANK_LABELS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

export const ShogiBoard: React.FC<ShogiBoardProps> = ({
  board,
  selectedSquare,
  legalMoves,
  lastMove,
  isCheck,
  turn,
  pieceFontMode = 'two_char',
  onSquareClick,
}) => {
  // 移動可能マスのセット (x, y)
  const legalDestinationSet = new Set(
    legalMoves.map((m) => `${m.to.x},${m.to.y}`)
  );

  return (
    <div className="shogi-board-wrapper">
      {/* 筋ラベル (9〜1) */}
      <div className="shogi-file-labels">
        {FILE_LABELS.map((label, i) => (
          <div key={`file-${i}`} className="shogi-coord-label">
            {label}
          </div>
        ))}
        {/* 右上の空白セル */}
        <div className="shogi-coord-corner" />
      </div>

      <div className="shogi-board-middle">
        {/* 将棋盤本体 (9×9) */}
        <div className="shogi-board-grid">
          {board.map((row, y) =>
            row.map((piece, x) => {
              const isSelected =
                selectedSquare !== null &&
                selectedSquare.x === x &&
                selectedSquare.y === y;

              const isLegal = legalDestinationSet.has(`${x},${y}`);

              const isLastMoveFrom =
                lastMove !== null &&
                lastMove.from !== null &&
                lastMove.from.x === x &&
                lastMove.from.y === y;

              const isLastMoveTo =
                lastMove !== null &&
                lastMove.to.x === x &&
                lastMove.to.y === y;

              const isKingInCheck =
                isCheck &&
                piece !== null &&
                piece.type === 'OU' &&
                piece.color === turn;

              return (
                <ShogiSquare
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  piece={piece}
                  isSelected={isSelected}
                  isLegalDestination={isLegal}
                  isLastMoveFrom={isLastMoveFrom}
                  isLastMoveTo={isLastMoveTo}
                  isKingInCheck={isKingInCheck}
                  pieceFontMode={pieceFontMode}
                  onClick={onSquareClick}
                />
              );
            })
          )}
        </div>

        {/* 段ラベル (一〜九) */}
        <div className="shogi-rank-labels">
          {RANK_LABELS.map((label, i) => (
            <div key={`rank-${i}`} className="shogi-coord-label">
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
