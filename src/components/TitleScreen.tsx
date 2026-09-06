import React, { useEffect, useRef, useState } from 'react';
import type { CpuDifficulty, GameMode, WinCondition } from '../shogi/types';
import type { GameStats } from '../shogi/stats';
import type { ThinkingSpeed } from '../shogi/ai';
import { soundManager } from '../shogi/sound';

interface TitleScreenProps {
  onStartNewGame: () => void;
  onResumeGame?: () => void;
  hasSavedGame: boolean;
  savedGameMoveCount: number;
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  difficulty: CpuDifficulty;
  onDifficultyChange: (diff: CpuDifficulty) => void;
  winCondition: WinCondition;
  onWinConditionChange: (cond: WinCondition) => void;
  thinkingSpeed: ThinkingSpeed;
  onThinkingSpeedChange: (speed: ThinkingSpeed) => void;
  boardScale: 'medium' | 'large' | 'huge';
  onBoardScaleChange: (scale: 'medium' | 'large' | 'huge') => void;
  squareRatio: 'square' | 'traditional';
  onSquareRatioChange: (ratio: 'square' | 'traditional') => void;
  pieceFontMode: 'two_char' | 'single_char';
  onPieceFontModeChange: (mode: 'two_char' | 'single_char') => void;
  lastMoveColor: 'blue' | 'green';
  onLastMoveColorChange: (color: 'blue' | 'green') => void;
  stats: GameStats;
  onOpenRules: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartNewGame,
  onResumeGame,
  hasSavedGame,
  savedGameMoveCount,
  mode,
  onModeChange,
  difficulty,
  onDifficultyChange,
  winCondition,
  onWinConditionChange,
  thinkingSpeed,
  onThinkingSpeedChange,
  boardScale,
  onBoardScaleChange,
  squareRatio,
  onSquareRatioChange,
  pieceFontMode,
  onPieceFontModeChange,
  lastMoveColor,
  onLastMoveColorChange,
  stats,
  onOpenRules,
  soundEnabled,
  onToggleSound,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  // 金箔・金粉微細パーティクルアニメーション（静謐でシブい和の風情）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // 金箔色パレット（深みのある金、琥珀、淡い光粉）
    const goldTones = [
      'rgba(245, 158, 11, 0.45)', // アンバー金
      'rgba(251, 191, 36, 0.35)', // 明金
      'rgba(217, 119, 6, 0.30)',  // 深金
      'rgba(254, 240, 138, 0.25)', // 微粒子金
      'rgba(202, 138, 4, 0.20)',  // 渋金
    ];

    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3.5 + 1.2,
      color: goldTones[Math.floor(Math.random() * goldTones.length)],
      speedY: -(Math.random() * 0.45 + 0.15), // ゆっくりと上へ漂う
      speedX: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.7 + 0.3,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.pulse += p.pulseSpeed;
        const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));

        ctx.save();
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/g, `${currentOpacity})`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        p.y += p.speedY;
        p.x += p.speedX;

        // 画面上部から消えたら下部から再配置
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // タイトル画面滞在中は静謐なアンビエントBGMを流し続ける（音設定のON/OFFに追従）
  useEffect(() => {
    if (soundEnabled) {
      soundManager.startTitleMusic();
    } else {
      soundManager.stopTitleMusic();
    }
    return () => {
      soundManager.stopTitleMusic();
    };
  }, [soundEnabled]);

  const totalMatches = stats.wins + stats.losses;
  const winRate = totalMatches > 0 ? Math.round((stats.wins / totalMatches) * 100) : 0;

  const handleMenuClick = (action: () => void) => {
    soundManager.playMenuClick();
    action();
  };

  const handleStartWithSound = (action: () => void) => {
    soundManager.playGameStartSound();
    action();
  };

  return (
    <div className="title-screen-container">
      {/* 金箔粒子が静かに漂う背景キャンバス */}
      <canvas ref={canvasRef} className="title-particles-canvas" aria-hidden="true" />

      {/* 和の装飾フレーム（四隅の伝統金物コーナー装飾） */}
      <div className="title-corner corner-top-left" aria-hidden="true" />
      <div className="title-corner corner-top-right" aria-hidden="true" />
      <div className="title-corner corner-bottom-left" aria-hidden="true" />
      <div className="title-corner corner-bottom-right" aria-hidden="true" />

      {/* サウンド切替とルールへのクイックボタン（右上） */}
      <div className="title-top-actions">
        <button
          type="button"
          className="title-action-pill-btn"
          onClick={() => {
            soundManager.playMenuClick();
            onToggleSound();
          }}
          title={soundEnabled ? '効果音を消音' : '効果音を有効化'}
        >
          <span className="pill-icon">{soundEnabled ? '🔊' : '🔇'}</span>
          <span>{soundEnabled ? '音あり' : '消音'}</span>
        </button>

        <button
          type="button"
          className="title-action-pill-btn"
          onClick={() => {
            soundManager.playTitleSound();
          }}
          title="和鐘（おりん）の響きを聴く"
        >
          <span className="pill-icon">🔔</span>
          <span>和鐘の響き</span>
        </button>
      </div>

      {/* メインタイトルコンテンツ */}
      <div className="title-content-card">
        {/* 落款印（本格）と筆文字タイトル */}
        <div className="title-header-group">
          <div className="title-crest-row">
            <span className="title-seal-badge">本格</span>
            <span className="title-tagline">将棋道場・電脳対局室</span>
          </div>

          <h1 className="title-main-logo">
            <span className="kanji-main">将 棋</span>
          </h1>

          <p className="title-subtitle-text">
            木目と漆の静謐な世界で楽しむ 盤上の知恵比べ
          </p>
        </div>

        {/* 立体3D「王将」駒のエンブレムシンボル */}
        <div className="title-hero-piece-wrap" aria-hidden="true">
          <div className="title-piece-badge">
            <div className="piece-wooden-body">
              <span className="piece-kanji-top">王</span>
              <span className="piece-kanji-bottom">将</span>
            </div>
          </div>
          <div className="title-piece-shadow" />
        </div>

        {/* メインメニューボタングループ */}
        <div className="title-menu-group">
          {/* 中断対局がある場合の再開ボタン */}
          {hasSavedGame && savedGameMoveCount > 0 && onResumeGame && (
            <button
              type="button"
              className="btn-title-menu btn-title-resume"
              onClick={() => handleStartWithSound(onResumeGame)}
              autoFocus
            >
              <span className="menu-btn-icon">🔄</span>
              <div className="menu-btn-texts">
                <strong className="menu-btn-title">前回の対局を再開する</strong>
                <span className="menu-btn-desc">
                  第{savedGameMoveCount}手目の局面からそのまま指し継ぐ
                </span>
              </div>
              <span className="menu-btn-arrow">▶</span>
            </button>
          )}

          {/* 新規対局開始ボタン */}
          <button
            type="button"
            className="btn-title-menu btn-title-primary"
            onClick={() => handleStartWithSound(onStartNewGame)}
            autoFocus={!hasSavedGame || savedGameMoveCount === 0}
          >
            <span className="menu-btn-icon">⚔️</span>
            <div className="menu-btn-texts">
              <strong className="menu-btn-title">対局を始める</strong>
              <span className="menu-btn-desc">
                {mode === 'human_vs_cpu_sente'
                  ? `CPU対戦（入門〜中級）あなた: 先手`
                  : mode === 'human_vs_cpu_gote'
                  ? `CPU対戦（入門〜中級）あなた: 後手`
                  : `二人対戦（同じ画面で指し合う）`}
              </span>
            </div>
            <span className="menu-btn-arrow">▶</span>
          </button>

          {/* 通算戦績 */}
          <button
            type="button"
            className="btn-title-menu btn-title-secondary"
            onClick={() => handleMenuClick(() => setShowStatsModal(true))}
          >
            <span className="menu-btn-icon">🏆</span>
            <div className="menu-btn-texts">
              <strong className="menu-btn-title">通算戦績を見る</strong>
              <span className="menu-btn-desc">
                通算 {stats.wins}勝 {stats.losses}敗（勝率 {winRate}%）
                {stats.currentStreak > 1 && ` 🔥${stats.currentStreak}連勝中`}
              </span>
            </div>
            <span className="menu-btn-arrow">›</span>
          </button>

          {/* 遊び方・ルール */}
          <button
            type="button"
            className="btn-title-menu btn-title-secondary"
            onClick={() => handleMenuClick(onOpenRules)}
          >
            <span className="menu-btn-icon">📖</span>
            <div className="menu-btn-texts">
              <strong className="menu-btn-title">遊び方・ルール説明</strong>
              <span className="menu-btn-desc">
                駒の動かし方・成り・王手・ルール解説
              </span>
            </div>
            <span className="menu-btn-arrow">›</span>
          </button>

          {/* 対局設定 */}
          <button
            type="button"
            className={`btn-title-menu btn-title-secondary ${showSettings ? 'settings-expanded' : ''}`}
            onClick={() => handleMenuClick(() => setShowSettings(!showSettings))}
          >
            <span className="menu-btn-icon">⚙️</span>
            <div className="menu-btn-texts">
              <strong className="menu-btn-title">対局設定</strong>
              <span className="menu-btn-desc">
                CPU強さ・思考速度・盤の大きさ・駒書体など
              </span>
            </div>
            <span className="menu-btn-arrow">{showSettings ? '▲' : '▼'}</span>
          </button>
        </div>

        {/* アコーディオン展開される対局設定パネル */}
        {showSettings && (
          <div className="title-settings-drawer">
            <h3 className="settings-drawer-title">対局の事前設定</h3>
            <div className="settings-drawer-grid">
              <div className="drawer-item">
                <label htmlFor="titleModeSelect">対局モード</label>
                <select
                  id="titleModeSelect"
                  value={mode}
                  onChange={(e) => onModeChange(e.target.value as GameMode)}
                >
                  <option value="human_vs_cpu_sente">人間 vs CPU (先手: あなた)</option>
                  <option value="human_vs_cpu_gote">CPU vs 人間 (後手: あなた)</option>
                  <option value="human_vs_human">2人対戦 (同一画面)</option>
                </select>
              </div>

              <div className="drawer-item">
                <label htmlFor="titleWinCondSelect">決着ルール</label>
                <select
                  id="titleWinCondSelect"
                  value={winCondition}
                  onChange={(e) => onWinConditionChange(e.target.value as WinCondition)}
                >
                  <option value="capture_king">王を取るまで（推奨・明快）</option>
                  <option value="checkmate">詰みで終了（伝統ルール）</option>
                </select>
              </div>

              {mode !== 'human_vs_human' && (
                <>
                  <div className="drawer-item">
                    <label htmlFor="titleDiffSelect">CPU難易度</label>
                    <select
                      id="titleDiffSelect"
                      value={difficulty}
                      onChange={(e) => onDifficultyChange(e.target.value as CpuDifficulty)}
                    >
                      <option value="easy">入門（初心者向け・ゆらぎ有）</option>
                      <option value="normal">初級（標準的な手筋）</option>
                      <option value="hard">中級（3手先深読み・手ごわい）</option>
                    </select>
                  </div>

                  <div className="drawer-item">
                    <label htmlFor="titleSpeedSelect">CPU思考速度</label>
                    <select
                      id="titleSpeedSelect"
                      value={thinkingSpeed}
                      onChange={(e) => onThinkingSpeedChange(e.target.value as ThinkingSpeed)}
                    >
                      <option value="very_slow">じっくり（約2.1秒）</option>
                      <option value="slow">ゆっくり（約1.4秒・おすすめ）</option>
                      <option value="normal">普通（約0.9秒）</option>
                      <option value="fast">早指し（約0.3秒）</option>
                    </select>
                  </div>
                </>
              )}

              <div className="drawer-item">
                <label htmlFor="titlePieceFontSelect">駒の書体</label>
                <select
                  id="titlePieceFontSelect"
                  value={pieceFontMode}
                  onChange={(e) =>
                    onPieceFontModeChange(e.target.value as 'two_char' | 'single_char')
                  }
                >
                  <option value="two_char">二字駒（伝統書体）</option>
                  <option value="single_char">一字駒（大きな文字・見やすさ重視）</option>
                </select>
              </div>

              <div className="drawer-item">
                <label htmlFor="titleBoardScaleSelect">盤の大きさ</label>
                <select
                  id="titleBoardScaleSelect"
                  value={boardScale}
                  onChange={(e) =>
                    onBoardScaleChange(e.target.value as 'medium' | 'large' | 'huge')
                  }
                >
                  <option value="medium">標準 (540px)</option>
                  <option value="large">大 (680px) ※推奨</option>
                  <option value="huge">特大 (780px)</option>
                </select>
              </div>

              <div className="drawer-item">
                <label htmlFor="titleSquareRatioSelect">マス目の形状</label>
                <select
                  id="titleSquareRatioSelect"
                  value={squareRatio}
                  onChange={(e) =>
                    onSquareRatioChange(e.target.value as 'square' | 'traditional')
                  }
                >
                  <option value="square">正方形（1:1 均一）</option>
                  <option value="traditional">伝統比率（1:1.07 縦長）</option>
                </select>
              </div>

              <div className="drawer-item">
                <label htmlFor="titleLastMoveColorSelect">履歴マス強調色</label>
                <select
                  id="titleLastMoveColorSelect"
                  value={lastMoveColor}
                  onChange={(e) =>
                    onLastMoveColorChange(e.target.value as 'blue' | 'green')
                  }
                >
                  <option value="blue">青系統（推奨・成駒と明確に区別）</option>
                  <option value="green">緑系統（エメラルド）</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* フッター著作権・バージョン情報 */}
        <div className="title-footer-note">
          <span>本格和風 将棋道場 &bull; ブラウザ完結・高速Web Worker AI</span>
        </div>
      </div>

      {/* 通算戦績モーダル */}
      {showStatsModal && (
        <div
          className="title-modal-backdrop"
          onClick={() => setShowStatsModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="title-stats-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-header-wrap">
              <h2 className="stats-dialog-title">🏆 あなたの通算戦績</h2>
              <button
                type="button"
                className="btn-close-stats"
                onClick={() => setShowStatsModal(false)}
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>

            <div className="stats-dialog-body">
              <div className="stats-kpi-row">
                <div className="kpi-card">
                  <span className="kpi-num win-text">{stats.wins}</span>
                  <span className="kpi-label">勝利</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-num loss-text">{stats.losses}</span>
                  <span className="kpi-label">敗戦</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-num rate-text">{winRate}%</span>
                  <span className="kpi-label">勝率</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-num streak-text">{stats.maxStreak}</span>
                  <span className="kpi-label">最高連勝</span>
                </div>
              </div>

              <div className="stats-diff-breakdown">
                <h4 className="breakdown-title">難易度別の戦績</h4>
                <div className="diff-row">
                  <span className="diff-name">入門（初心者向け）</span>
                  <span className="diff-val">
                    {stats.byDifficulty.easy.wins}勝 {stats.byDifficulty.easy.losses}敗
                  </span>
                </div>
                <div className="diff-row">
                  <span className="diff-name">初級（標準）</span>
                  <span className="diff-val">
                    {stats.byDifficulty.normal.wins}勝 {stats.byDifficulty.normal.losses}敗
                  </span>
                </div>
                <div className="diff-row">
                  <span className="diff-name">中級（手ごわい）</span>
                  <span className="diff-val">
                    {stats.byDifficulty.hard.wins}勝 {stats.byDifficulty.hard.losses}敗
                  </span>
                </div>
              </div>

              {stats.recentGames.length > 0 && (
                <div className="stats-recent-list">
                  <h4 className="breakdown-title">直近の対局履歴</h4>
                  <ul className="recent-games">
                    {stats.recentGames.slice(-5).reverse().map((r, i) => (
                      <li key={i} className={`recent-item ${r.result}`}>
                        <span className="recent-badge">
                          {r.result === 'win' ? '勝ち' : r.result === 'lose' ? '負け' : '引き分け'}
                        </span>
                        <span className="recent-details">
                          {r.moveCount}手 &bull; {r.reason === 'checkmate' ? '詰み' : '投了'}
                          {r.difficulty && ` (${r.difficulty === 'easy' ? '入門' : r.difficulty === 'normal' ? '初級' : '中級'})`}
                        </span>
                        <span className="recent-date">
                          {new Date(r.date).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="dialog-footer-actions">
              <button
                type="button"
                className="btn-stats-primary"
                onClick={() => setShowStatsModal(false)}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
