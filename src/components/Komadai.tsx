import React from 'react';
import type { BasePieceType, Color, HandPieces } from '../shogi/types';
import { DROP_PIECE_ORDER } from '../shogi/constants';
import { ShogiPiece } from './ShogiPiece';
import { PieceTooltip } from './PieceTooltip';

interface KomadaiProps {
  color: Color;
  hand: HandPieces;
  title: string;
  isCurrentTurn: boolean;
  selectedPieceType: BasePieceType | null;
  onSelectPiece: (pieceType: BasePieceType) => void;
  disabled?: boolean;
  isAiThinking?: boolean;
  isCpu?: boolean;
  pieceFontMode?: 'two_char' | 'single_char';
}

export const Komadai: React.FC<KomadaiProps> = ({
  color,
  hand,
  title,
  isCurrentTurn,
  selectedPieceType,
  onSelectPiece,
  disabled = false,
  isAiThinking = false,
  isCpu = false,
  pieceFontMode = 'two_char',
}) => {
  // 持ち駒がある駒の種類を抽出
  const availablePieces = DROP_PIECE_ORDER.filter((type) => (hand[type] || 0) > 0);

  return (
    <div
      className={`komadai-container ${isCurrentTurn ? 'komadai-active' : 'komadai-inactive'}`}
    >
      <div className="komadai-top-section">
        <div className="komadai-header">
          <div className="komadai-title-group">
            <span className="komadai-mark">{color === 0 ? '☗' : '☖'}</span>
            <span className="komadai-title">{title}</span>
          </div>
          <div className="komadai-status-group">
            {isCurrentTurn ? (
              isCpu && isAiThinking ? (
                <span className="komadai-badge badge-thinking">
                  <span className="komadai-spinner-mini" /> 思考中…
                </span>
              ) : (
                <span className="komadai-badge badge-active">
                  <span className="turn-pulse-dot" /> 手番
                </span>
              )
            ) : (
              <span className="komadai-badge badge-waiting">⏳ 待ち</span>
            )}
          </div>
        </div>

        <div className="komadai-status-hint">
          {isCurrentTurn
            ? isCpu
              ? '次の一手を考え中…'
              : '指してください'
            : isCpu
            ? 'あなたの着手待ち'
            : '相手の着手待ち'}
        </div>
      </div>

      <div className="komadai-pieces-grid">
        {availablePieces.length === 0 ? (
          <div className="komadai-empty">持ち駒なし</div>
        ) : (
          availablePieces.map((type) => {
            const count = hand[type];
            const isSelected = selectedPieceType === type;
            const canClick = isCurrentTurn && !disabled;

            return (
              <PieceTooltip
                key={type}
                type={type}
                color={color}
                count={count}
                isDrop={true}
                position="top"
              >
                <button
                  type="button"
                  className={`komadai-piece-slot ${isSelected ? 'komadai-piece-selected' : ''}`}
                  onClick={() => canClick && onSelectPiece(type)}
                  disabled={!canClick}
                  aria-label={`${type}を打つ（${count}枚）`}
                >
                  <ShogiPiece
                    type={type}
                    color={color}
                    inverted={color === 1}
                    count={count}
                    size={46}
                    pieceFontMode={pieceFontMode}
                  />
                </button>
              </PieceTooltip>
            );
          })
        )}
      </div>
    </div>
  );
};
