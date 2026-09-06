import React, { useEffect, useRef } from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="rules-dialog"
      aria-labelledby="rulesModalTitle"
      onCancel={onClose}
    >
      <div className="rules-dialog-content">
        <div className="rules-dialog-header">
          <h2 id="rulesModalTitle" className="rules-modal-title">
            将棋アプリのルール・仕様説明
          </h2>
          <button
            type="button"
            className="rules-close-btn"
            onClick={onClose}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="rules-body">
          <section className="rules-section">
            <h3>【基本操作】</h3>
            <ul>
              <li>
                <strong>駒の移動:</strong> 盤上の自分の駒をクリックすると、移動可能なマスがハイライトされます。目的のマスをクリックして着手します。
              </li>
              <li>
                <strong>持ち駒を打つ:</strong> 駒台の持ち駒をクリックすると、打てるマスがハイライトされます。目的のマスをクリックして打ちます。
              </li>
              <li>
                <strong>成り・不成:</strong> 敵陣（先手は1〜3段目、後手は7〜9段目）への移動時、成るか成らないかの選択ダイアログが表示されます。
              </li>
              <li>
                <strong>強制成り:</strong> 行き所のないマス（1段目の歩・香車、1〜2段目の桂馬）へ進む場合は自動的に成ります。
              </li>
              <li>
                <strong>待った:</strong> 相手の手と自分の手を合わせて2手戻り、直前の自分の手番から指し直すことができます。
              </li>
            </ul>
          </section>

          <section className="rules-section">
            <h3>【対応している反則・禁じ手判定】</h3>
            <ul>
              <li>
                <strong>二歩（にふ）の禁止:</strong> 同じ筋に既に自分の生歩がある場合、その筋に歩を打つことはできません。
              </li>
              <li>
                <strong>行き所のない駒の禁止:</strong> 最奥段への歩・香の打ち、最奥2段への桂馬の打ちは禁止されています。
              </li>
              <li>
                <strong>王手放置・自玉を王手にさらす手の禁止:</strong> 王手を掛けられている時に回避しない手や、自ら王手されるマスへ動く手は指せません。
              </li>
              <li>
                <strong>打ち歩詰め（うちふづめ）の禁止:</strong> 持ち駒の歩を打って相手の玉を即座に詰ませる着手は反則となり禁止されています（盤上の歩を進めて詰ませる「突歩詰め」は合法です）。
              </li>
            </ul>
          </section>

          <section className="rules-section alert-section">
            <h3>【現在未対応の特殊ルール（ご案内）】</h3>
            <p>
              本アプリは主要な将棋の公式ルールに準拠していますが、以下の高度な終局ルールは現在未対応となっております。
            </p>
            <ul>
              <li>
                <strong>千日手（同一局面4回出現による引き分け判定）</strong>
              </li>
              <li>
                <strong>連続王手の千日手による反則負け判定</strong>
              </li>
              <li>
                <strong>入玉宣言法（27点法・24点法等の点数判定）</strong>
              </li>
            </ul>
            <p className="rules-note">
              ※一般的な平手対局や詰み・投了までの対戦はすべて正常にお楽しみいただけます。
            </p>
          </section>
        </div>

        <div className="rules-dialog-footer">
          <button type="button" className="shogi-action-btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </dialog>
  );
};
