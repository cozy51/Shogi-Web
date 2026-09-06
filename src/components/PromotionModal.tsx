import React, { useEffect, useRef } from 'react';
import type { Move } from '../shogi/types';
import { PROMOTED_MAP, UNPROMOTED_MAP } from '../shogi/constants';
import { ShogiPiece } from './ShogiPiece';

interface PromotionModalProps {
  pendingMove: Move | null;
  onChoice: (promote: boolean) => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  pendingMove,
  onChoice,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (pendingMove) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [pendingMove]);

  if (!pendingMove) return null;

  const baseType = UNPROMOTED_MAP[pendingMove.pieceType];
  const promotedType = PROMOTED_MAP[baseType] || pendingMove.pieceType;
  const color = pendingMove.color;

  return (
    <dialog
      ref={dialogRef}
      className="promotion-dialog"
      aria-labelledby="promotionTitle"
      onCancel={(e) => {
        // Escキーの場合は成らないを選択扱いにするかキャンセル
        e.preventDefault();
        onChoice(false);
      }}
    >
      <div className="promotion-dialog-content">
        <h2 id="promotionTitle" className="promotion-title">
          成りますか？
        </h2>
        <p className="promotion-desc">
          敵陣に入りました。駒を成ることができます。
        </p>

        <div className="promotion-choices">
          {/* 成る */}
          <button
            type="button"
            className="promotion-btn promotion-btn-promote"
            onClick={() => onChoice(true)}
            autoFocus
          >
            <div className="promotion-preview">
              <ShogiPiece
                type={promotedType}
                color={color}
                isPromoted={true}
                inverted={color === 1}
                size={54}
              />
            </div>
            <span className="promotion-btn-text">成る</span>
          </button>

          {/* 成らない */}
          <button
            type="button"
            className="promotion-btn promotion-btn-unpromote"
            onClick={() => onChoice(false)}
          >
            <div className="promotion-preview">
              <ShogiPiece
                type={baseType}
                color={color}
                isPromoted={false}
                inverted={color === 1}
                size={54}
              />
            </div>
            <span className="promotion-btn-text">成らない</span>
          </button>
        </div>
      </div>
    </dialog>
  );
};
