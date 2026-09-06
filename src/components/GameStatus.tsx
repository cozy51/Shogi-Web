import React from 'react';
import type { Color, GameMode, MoveRecord } from '../shogi/types';

interface GameStatusProps {
  turn: Color;
  moveCount: number;
  status: 'playing' | 'checkmate' | 'resigned';
  winner: Color | null;
  isCheck: boolean;
  isAiThinking: boolean;
  mode: GameMode;
  lastMoveRecord?: MoveRecord | null;
  isVictory?: boolean;
  onOpenGameOverModal?: () => void;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  turn,
  moveCount,
  status,
  winner,
  isCheck,
  isAiThinking,
  mode,
  lastMoveRecord,
  isVictory = false,
  onOpenGameOverModal,
}) => {
  const isHumanTurn =
    (mode === 'human_vs_cpu_sente' && turn === 0) ||
    (mode === 'human_vs_cpu_gote' && turn === 1);

  const getPlayerLabel = (color: Color): string => {
    if (mode === 'human_vs_cpu_sente') {
      return color === 0 ? 'あなた（先手）' : 'CPU（後手）';
    }
    if (mode === 'human_vs_cpu_gote') {
      return color === 1 ? 'あなた（後手）' : 'CPU（先手）';
    }
    return color === 0 ? '先手' : '後手';
  };

  const getLastPlayerLabel = (): string => {
    if (!lastMoveRecord) return '';
    const lastColor = lastMoveRecord.move.color;
    return getPlayerLabel(lastColor);
  };


  const activePlayerLabel = getPlayerLabel(turn);
  const waitingColor = (turn === 0 ? 1 : 0) as Color;
  const waitingPlayerLabel = getPlayerLabel(waitingColor);

  const isLastMoveByCpu =
    lastMoveRecord &&
    ((mode === 'human_vs_cpu_sente' && lastMoveRecord.move.color === 1) ||
      (mode === 'human_vs_cpu_gote' && lastMoveRecord.move.color === 0));

  return (
    <div className="game-status-card">
      <div className="status-main-row">
        {/* 手数 */}
        <div className="status-move-count">
          {moveCount === 0 ? '対局開始前' : `${moveCount}手目`}
        </div>

        {/* 手番情報：一目で誰の手番か・誰が待ちか分かる明確なステータス */}
        <div className="status-turn-info">
          {status === 'playing' ? (
            isAiThinking ? (
              <div className="turn-banner turn-banner-thinking" role="status">
                <div className="turn-banner-main">
                  <span className="thinking-spinner-large" />
                  <span className="turn-banner-title">【手番】CPUが思考中です</span>
                  <span className="turn-banner-sub">（次の一手を考えています）</span>
                </div>
                <div className="turn-waiting-badge">
                  <span className="waiting-icon">⏳</span> 待ち: あなた（着手待ち）
                </div>
              </div>
            ) : isHumanTurn ? (
              <div className="turn-banner turn-banner-human" role="status">
                <div className="turn-banner-main">
                  <span className="turn-pulse-dot" />
                  <span className="turn-banner-title">【手番】あなたの番です</span>
                  <span className="turn-banner-sub">（駒を選んで指してください）</span>
                </div>
                <div className="turn-waiting-badge">
                  <span className="waiting-icon">⏳</span> 待ち: {waitingPlayerLabel}
                </div>
              </div>
            ) : (
              <div className="turn-banner turn-banner-opponent" role="status">
                <div className="turn-banner-main">
                  <span className="turn-pulse-dot" />
                  <span className="turn-banner-title">【手番】{activePlayerLabel}</span>
                </div>
                <div className="turn-waiting-badge">
                  <span className="waiting-icon">⏳</span> 待ち: {waitingPlayerLabel}
                </div>
              </div>
            )
          ) : (
            <div className={`result-display ${isVictory ? 'result-display-victory' : ''}`}>
              {isVictory && (
                <span className="result-celebration-badge">
                  ㊗ 祝・見事な勝利！
                </span>
              )}
              {lastMoveRecord?.kifuText.includes('（王取り）') ? (
                <span className="result-tag tag-king-capture">王取り</span>
              ) : status === 'checkmate' ? (
                <span className="result-tag tag-checkmate">詰み</span>
              ) : null}
              {status === 'resigned' && (
                <span className="result-tag tag-resign">投了</span>
              )}
              <span className="winner-announcement">
                {winner !== null
                  ? lastMoveRecord?.kifuText.includes('（王取り）')
                    ? `対局終了：${winner === 0 ? '☗ 先手' : '☖ 後手'}（${getPlayerLabel(winner)}）が王将を捕獲して勝利！`
                    : `対局終了：${winner === 0 ? '☗ 先手' : '☖ 後手'}（${getPlayerLabel(winner)}）の勝利！`
                  : '対局終了'}
              </span>
              {onOpenGameOverModal && (
                <button
                  type="button"
                  className="btn-view-result-modal"
                  onClick={onOpenGameOverModal}
                  title="対局結果・通算戦績と次の一手への案内を表示します"
                >
                  <span className="btn-modal-icon">🏆</span>
                  対局結果・戦績を見る
                </button>
              )}
            </div>
          )}
        </div>

        {/* 王手アラート */}
        {status === 'playing' && isCheck && (
          <div className="check-alert-badge" role="alert">
            <span className="check-icon">⚠</span>
            <span>王手！</span>
          </div>
        )}
      </div>

      {/* 直前の着手通知バー（CPUが何を指したか一目でわかる） */}
      {lastMoveRecord && status === 'playing' && (
        <div
          className={`last-move-notice-bar ${
            isLastMoveByCpu ? 'last-move-notice-cpu' : 'last-move-notice-human'
          }`}
        >
          <span
            className={`last-move-tag ${
              isLastMoveByCpu ? 'tag-cpu-moved' : 'tag-human-moved'
            }`}
          >
            {isLastMoveByCpu ? '💡 CPUの着手' : '直前の着手'}
          </span>
          <span className="last-move-desc">
            <strong>{getLastPlayerLabel()}</strong> が{' '}
            <span className="last-move-kifu">{lastMoveRecord.kifuText}</span> と指しました
            {isLastMoveByCpu && (
              <span className="last-move-guide">
                （盤面で光っているマスに移動しました。次はあなたの手番です）
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};
