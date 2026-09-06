import React from 'react';
import type { Color, PieceType } from '../shogi/types';
import { PIECE_DETAILS } from '../shogi/constants';

interface PieceTooltipProps {
  type: PieceType;
  color: Color;
  count?: number;
  isDrop?: boolean;
  position?: 'top' | 'bottom';
  children: React.ReactNode;
}

export const PieceTooltip: React.FC<PieceTooltipProps> = ({
  type,
  color,
  count,
  isDrop = false,
  position = 'top',
  children,
}) => {
  const detail = PIECE_DETAILS[type] || {
    fullName: type,
    kana: '',
    description: '',
  };

  const ownerLabel = color === 0 ? '先手' : '後手';
  const displayTitle =
    type === 'OU' ? (color === 1 ? '王将' : '玉将') : detail.fullName;

  return (
    <div className="piece-tooltip-anchor">
      {children}
      <div
        className={`piece-tooltip-popup tooltip-pos-${position}`}
        role="tooltip"
        aria-hidden="true"
      >
        <div className="piece-tooltip-header">
          <span className={`tooltip-owner-tag ${color === 0 ? 'owner-sente' : 'owner-gote'}`}>
            {ownerLabel}
          </span>
          <span className="tooltip-piece-name">{displayTitle}</span>
          {detail.kana && <span className="tooltip-piece-kana">（{detail.kana}）</span>}
          {count !== undefined && count > 1 && (
            <span className="tooltip-piece-count">×{count}枚</span>
          )}
        </div>

        <div className="piece-tooltip-body">
          <p className="tooltip-movement-desc">{detail.description}</p>
          {isDrop && (
            <p className="tooltip-drop-hint">
              💡 クリックして盤面の緑色マスに打てます
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
