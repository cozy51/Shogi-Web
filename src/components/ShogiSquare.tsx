import React from 'react';
import type { Piece, Square } from '../shogi/types';
import { ShogiPiece } from './ShogiPiece';
import { PieceTooltip } from './PieceTooltip';

interface ShogiSquareProps {
  x: number;
  y: number;
  piece: Piece | null;
  isSelected: boolean;
  isLegalDestination: boolean;
  isLastMoveFrom: boolean;
  isLastMoveTo: boolean;
  isKingInCheck: boolean;
  pieceFontMode?: 'two_char' | 'single_char';
  onClick: (square: Square) => void;
}

export const ShogiSquare: React.FC<ShogiSquareProps> = ({
  x,
  y,
  piece,
  isSelected,
  isLegalDestination,
  isLastMoveFrom,
  isLastMoveTo,
  isKingInCheck,
  pieceFontMode = 'two_char',
  onClick,
}) => {
  // 将棋盤の星（・）の位置:
  // 盤面を縦横3マスずつ均等に（3-3-3）9分割する4つの交点
  // 筋: 7筋と6筋の間(x=2の右端), 4筋と3筋の間(x=5の右端)
  // 段: 三段目と四段目の間(y=2の下端), 六段目と七段目の間(y=5の下端)
  const isStar = (x === 2 || x === 5) && (y === 2 || y === 5);

  // マスのハイライトクラス
  let bgClass = '';
  if (isSelected) {
    bgClass = 'square-selected';
  } else if (isLastMoveTo) {
    bgClass = 'square-last-to';
  } else if (isLastMoveFrom) {
    bgClass = 'square-last-from';
  } else if (isKingInCheck) {
    bgClass = 'square-check';
  }

  return (
    <div
      className={`shogi-square relative flex items-center justify-center cursor-pointer transition-colors ${bgClass}`}
      onClick={() => onClick({ x, y })}
      role="button"
      tabIndex={0}
      aria-label={`${9 - x}筋 ${y + 1}の段 ${piece ? piece.type : '空きマス'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick({ x, y });
        }
      }}
    >
      {/* 星のマーカー */}
      {isStar && <div className="shogi-star-dot" />}

      {/* 移動可能マスのハイライトマーカー */}
      {isLegalDestination && (
        <div
          className={`shogi-legal-marker ${piece ? 'shogi-legal-capture' : 'shogi-legal-empty'}`}
        />
      )}

      {/* 直前の着手マス・移動元マスの目印バッジ */}
      {isLastMoveTo && (
        <div className="last-move-to-badge" title="直前の着手マス">
          着手
        </div>
      )}
      {isLastMoveFrom && (
        <div className="last-move-from-badge" title="直前の移動元">
          移動元
        </div>
      )}

      {/* 駒 */}
      {piece && (
        <PieceTooltip
          type={piece.type}
          color={piece.color}
          position={y <= 2 ? 'bottom' : 'top'}
        >
          <ShogiPiece
            type={piece.type}
            color={piece.color}
            isPromoted={piece.isPromoted}
            inverted={piece.color === 1}
            pieceFontMode={pieceFontMode}
          />
        </PieceTooltip>
      )}
    </div>
  );
};
