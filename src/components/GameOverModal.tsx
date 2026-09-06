import React, { useEffect, useRef, useState } from 'react';
import type { CpuDifficulty, GameMode, MoveRecord } from '../shogi/types';
import type { GameStats } from '../shogi/stats';

interface GameOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVictory: boolean;
  isDraw?: boolean;
  winnerLabel: string;
  moveCount: number;
  lastMoveRecord: MoveRecord | null;
  status: 'checkmate' | 'resigned';
  mode: GameMode;
  difficulty: CpuDifficulty;
  stats: GameStats;
  history: MoveRecord[];
  onPlayAgain: () => void;
  onLevelUp?: () => void;
  onReturnToTitle?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  onClose,
  isVictory,
  isDraw = false,
  winnerLabel,
  moveCount,
  lastMoveRecord,
  status,
  mode,
  difficulty,
  stats,
  history,
  onPlayAgain,
  onLevelUp,
  onReturnToTitle,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // ダイアログの開閉制御
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

  // 勝利時の紙吹雪・金粉パーティクル演出
  useEffect(() => {
    if (!isOpen || !isVictory) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // パーティクル生成（金粉・紅白の紙吹雪・桜）
    const colors = [
      '#fbbf24', // ゴールド
      '#f59e0b', // アンバー
      '#ef4444', // 紅白（紅）
      '#ffffff', // 紅白（白）
      '#f472b6', // 桜ピンク
      '#d97706', // 深い金
    ];

    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height - height,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 2.5 + 1.2,
      speedX: (Math.random() - 0.5) * 1.5,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 4,
      tilt: Math.random() * 10 - 5,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();

        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;

        if (p.y > height) {
          p.y = -15;
          p.x = Math.random() * width;
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, isVictory]);

  // 棋譜コピー処理
  const handleCopyKifu = async () => {
    try {
      const header = `【対局結果】${winnerLabel}の勝利（${moveCount}手・${status === 'checkmate' ? '詰み' : '投了'}）\n`;
      const body = history.map((h, i) => `${i + 1}. ${h.kifuText}`).join('\n');
      await navigator.clipboard.writeText(header + body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // クリップボードAPI失敗時のフォールバック
      setCopied(false);
    }
  };

  if (!isOpen) return null;

  const isCpuMatch = mode !== 'human_vs_human';
  const winRate =
    stats.wins + stats.losses > 0
      ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
      : 0;

  const difficultyNames: Record<CpuDifficulty, string> = {
    easy: '入門（ゆったり）',
    normal: '初級（標準）',
    hard: '中級（手ごわい）',
  };

  const nextDifficulty =
    difficulty === 'easy' ? 'normal' : difficulty === 'normal' ? 'hard' : null;

  return (
    <dialog
      ref={dialogRef}
      className={`game-over-dialog ${isVictory ? 'dialog-victory' : 'dialog-defeat'}`}
      aria-labelledby="gameOverTitle"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {/* 勝利時の舞い散る紙吹雪・金粉キャンバス */}
      {isVictory && (
        <canvas ref={canvasRef} className="victory-confetti-canvas" aria-hidden="true" />
      )}

      <div className="game-over-content">
        {/* 祝賀・結果ヘッダー */}
        <div className="game-over-header">
          {isVictory ? (
            <>
              <div className="victory-ribbon-badge">
                <span className="ribbon-star">★</span> 祝・勝利 <span className="ribbon-star">★</span>
              </div>
              <h2 id="gameOverTitle" className="game-over-title title-victory">
                見事な勝利！
              </h2>
              <p className="game-over-subtitle">
                {lastMoveRecord?.kifuText.includes('（王取り）')
                  ? '見事に相手の王将（玉将）を捕獲しました！完全勝利です！'
                  : status === 'checkmate'
                  ? '華麗に相手玉を詰ませました！素晴らしい一局でした。'
                  : '相手が投了しました。見事な指し回しでした！'}
              </p>
            </>
          ) : isDraw ? (
            <>
              <div className="game-over-badge badge-neutral">対局終了</div>
              <h2 id="gameOverTitle" className="game-over-title">
                引き分け
              </h2>
            </>
          ) : isCpuMatch ? (
            <>
              <div className="game-over-badge badge-defeat">惜敗</div>
              <h2 id="gameOverTitle" className="game-over-title title-defeat">
                次の一局でリベンジ！
              </h2>
              <p className="game-over-subtitle">
                {lastMoveRecord?.kifuText.includes('（王取り）')
                  ? '玉将を捕獲されてしまいましたが、素晴らしい健闘でした。'
                  : status === 'checkmate'
                  ? '相手に玉を詰まされましたが、素晴らしい健闘でした。'
                  : '投了となりました。次の対局で雪辱を果たしましょう！'}
              </p>
            </>
          ) : (
            <>
              <div className="game-over-badge badge-neutral">対局終了</div>
              <h2 id="gameOverTitle" className="game-over-title">
                {winnerLabel} の勝利！
              </h2>
            </>
          )}
        </div>

        {/* 対局ダイジェストカード */}
        <div className="game-digest-card">
          <div className="digest-item">
            <span className="digest-label">総手数</span>
            <span className="digest-value highlight-gold">{moveCount}手</span>
          </div>
          <div className="digest-item">
            <span className="digest-label">決着</span>
            <span className="digest-value">
              {lastMoveRecord?.kifuText.includes('（王取り）')
                ? '王将捕獲（王取り）'
                : status === 'checkmate'
                ? '詰み（チェックメイト）'
                : '投了'}
            </span>
          </div>
          {lastMoveRecord && (
            <div className="digest-item">
              <span className="digest-label">決め手（最後の手）</span>
              <span className="digest-value highlight-kifu">
                {lastMoveRecord.kifuText}
              </span>
            </div>
          )}
          {isCpuMatch && (
            <div className="digest-item">
              <span className="digest-label">対戦相手</span>
              <span className="digest-value">
                CPU（{difficultyNames[difficulty]}）
              </span>
            </div>
          )}
        </div>

        {/* 戦績記録カード（CPU対戦時） */}
        {isCpuMatch && (
          <div className="game-stats-summary-card">
            <div className="stats-header-row">
              <span className="stats-title-label">あなたの通算成績</span>
              {stats.currentStreak > 1 && (
                <span className="stats-streak-pill">
                  🔥 {stats.currentStreak}連勝中！
                </span>
              )}
            </div>

            <div className="stats-numbers-row">
              <div className="stat-box">
                <span className="stat-num win-color">{stats.wins}</span>
                <span className="stat-text">勝</span>
              </div>
              <div className="stat-box">
                <span className="stat-num loss-color">{stats.losses}</span>
                <span className="stat-text">敗</span>
              </div>
              <div className="stat-box">
                <span className="stat-num rate-color">{winRate}%</span>
                <span className="stat-text">勝率</span>
              </div>
            </div>

            {/* 難易度別成績ピル */}
            <div className="difficulty-badges-row">
              <span className="diff-pill">
                入門: {stats.byDifficulty.easy.wins}勝{stats.byDifficulty.easy.losses}敗
              </span>
              <span className="diff-pill">
                初級: {stats.byDifficulty.normal.wins}勝{stats.byDifficulty.normal.losses}敗
              </span>
              <span className="diff-pill">
                中級: {stats.byDifficulty.hard.wins}勝{stats.byDifficulty.hard.losses}敗
              </span>
            </div>
          </div>
        )}

        {/* 次にすることの誘導アクション群 */}
        <div className="next-action-guidance">
          <p className="guidance-heading">次にすることを選んでください</p>

          <div className="guidance-buttons-group">
            {/* 1. もう一局指す（メインゴールドボタン） */}
            <button
              type="button"
              className="action-btn btn-primary-play-again"
              onClick={onPlayAgain}
              autoFocus
            >
              <span className="btn-icon">🏆</span>
              <span className="btn-label-group">
                <strong className="btn-main-text">もう一局対局する</strong>
                <small className="btn-sub-text">同じ設定で最初から開始</small>
              </span>
            </button>

            {/* 2. 勝利時限定：難易度を上げて挑戦 */}
            {isVictory && isCpuMatch && nextDifficulty && onLevelUp && (
              <button
                type="button"
                className="action-btn btn-level-up"
                onClick={onLevelUp}
              >
                <span className="btn-icon">🆙</span>
                <span className="btn-label-group">
                  <strong className="btn-main-text">
                    難易度を上げて挑戦する
                  </strong>
                  <small className="btn-sub-text">
                    {difficultyNames[nextDifficulty]}へステップアップ
                  </small>
                </span>
              </button>
            )}

            {/* 3. 終局盤面を振り返る（閉じる） */}
            <button
              type="button"
              className="action-btn btn-review-board"
              onClick={onClose}
            >
              <span className="btn-icon">🔍</span>
              <span className="btn-label-group">
                <strong className="btn-main-text">終局の盤面を振り返る</strong>
                <small className="btn-sub-text">モーダルを閉じて盤面を観察</small>
              </span>
            </button>

            {/* 4. タイトル画面に戻る */}
            {onReturnToTitle && (
              <button
                type="button"
                className="action-btn btn-return-title"
                onClick={onReturnToTitle}
              >
                <span className="btn-icon">⛩️</span>
                <span className="btn-label-group">
                  <strong className="btn-main-text">タイトル画面に戻る</strong>
                  <small className="btn-sub-text">対局を終了してメインタイトルへ</small>
                </span>
              </button>
            )}

            {/* 5. 棋譜をコピー */}
            <button
              type="button"
              className="action-btn btn-copy-kifu"
              onClick={handleCopyKifu}
            >
              <span className="btn-icon">{copied ? '✓' : '📋'}</span>
              <span className="btn-label-group">
                <strong className="btn-main-text">
                  {copied ? '棋譜をコピーしました！' : '棋譜をコピーする'}
                </strong>
                <small className="btn-sub-text">クリップボードに全手順を保存</small>
              </span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
