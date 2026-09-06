import React from 'react';
import type { CpuDifficulty, GameMode, WinCondition } from '../shogi/types';

interface ControlPanelProps {
  mode: GameMode;
  onModeChange: (newMode: GameMode) => void;
  difficulty: CpuDifficulty;
  onDifficultyChange: (newDifficulty: CpuDifficulty) => void;
  winCondition: WinCondition;
  onWinConditionChange: (winCondition: WinCondition) => void;
  onUndo: () => void;
  canUndo: boolean;
  onReset: () => void;
  onResign: () => void;
  isGameOver: boolean;
  isAiThinking: boolean;
  boardScale: 'medium' | 'large' | 'huge';
  onBoardScaleChange: (scale: 'medium' | 'large' | 'huge') => void;
  squareRatio: 'square' | 'traditional';
  onSquareRatioChange: (ratio: 'square' | 'traditional') => void;
  thinkingSpeed: 'very_slow' | 'slow' | 'normal' | 'fast';
  onThinkingSpeedChange: (speed: 'very_slow' | 'slow' | 'normal' | 'fast') => void;
  pieceFontMode: 'two_char' | 'single_char';
  onPieceFontModeChange: (mode: 'two_char' | 'single_char') => void;
  lastMoveColor: 'blue' | 'green';
  onLastMoveColorChange: (color: 'blue' | 'green') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onReturnToTitle?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  onModeChange,
  difficulty,
  onDifficultyChange,
  winCondition,
  onWinConditionChange,
  onUndo,
  canUndo,
  onReset,
  onResign,
  isGameOver,
  isAiThinking,
  boardScale,
  onBoardScaleChange,
  squareRatio,
  onSquareRatioChange,
  thinkingSpeed,
  onThinkingSpeedChange,
  pieceFontMode,
  onPieceFontModeChange,
  lastMoveColor,
  onLastMoveColorChange,
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onReturnToTitle,
}) => {
  return (
    <div className="control-panel">
      {/* 対局設定エリア */}
      <div className="control-section settings-grid">
        <div className="control-item">
          <label htmlFor="modeSelect" className="control-label">
            対戦モード
          </label>
          <select
            id="modeSelect"
            className="control-select"
            value={mode}
            onChange={(e) => onModeChange(e.target.value as GameMode)}
            disabled={isAiThinking}
          >
            <option value="human_vs_cpu_sente">人間 vs CPU (先手: あなた)</option>
            <option value="human_vs_cpu_gote">CPU vs 人間 (後手: あなた)</option>
            <option value="human_vs_human">2人対戦 (同じ画面)</option>
          </select>
        </div>

        <div className="control-item">
          <label htmlFor="winConditionSelect" className="control-label">
            決着条件
          </label>
          <select
            id="winConditionSelect"
            className="control-select"
            value={winCondition}
            onChange={(e) => onWinConditionChange(e.target.value as WinCondition)}
            disabled={isAiThinking}
          >
            <option value="capture_king">王を取るまで（推奨・わかりやすい）</option>
            <option value="checkmate">詰みで終了（伝統ルール）</option>
          </select>
        </div>

        {mode !== 'human_vs_human' && (
          <>
            <div className="control-item">
              <label htmlFor="diffSelect" className="control-label">
                CPUの強さ
              </label>
              <select
                id="diffSelect"
                className="control-select"
                value={difficulty}
                onChange={(e) => onDifficultyChange(e.target.value as CpuDifficulty)}
                disabled={isAiThinking}
              >
                <option value="easy">入門（初心者向け・ゆらぎ有）</option>
                <option value="normal">初級（標準的な手筋）</option>
                <option value="hard">中級（3手先深読み）</option>
              </select>
            </div>

            <div className="control-item">
              <label htmlFor="speedSelect" className="control-label">
                CPU思考時間
              </label>
              <select
                id="speedSelect"
                className="control-select"
                value={thinkingSpeed}
                onChange={(e) =>
                  onThinkingSpeedChange(
                    e.target.value as 'very_slow' | 'slow' | 'normal' | 'fast'
                  )
                }
                disabled={isAiThinking}
              >
                <option value="very_slow">じっくり（約2.1秒・見逃し防止）</option>
                <option value="slow">ゆっくり（約1.4秒・おすすめ）</option>
                <option value="normal">普通（約0.9秒）</option>
                <option value="fast">早指し（約0.3秒）</option>
              </select>
            </div>
          </>
        )}

        <div className="control-item">
          <label htmlFor="pieceFontModeSelect" className="control-label">
            駒の文字
          </label>
          <select
            id="pieceFontModeSelect"
            className="control-select font-mode-select"
            value={pieceFontMode}
            onChange={(e) =>
              onPieceFontModeChange(e.target.value as 'two_char' | 'single_char')
            }
          >
            <option value="two_char">二字駒（標準・伝統書体）</option>
            <option value="single_char">一字駒（大きな文字・見やすさ重視）</option>
          </select>
        </div>

        <div className="control-item">
          <label htmlFor="boardScaleSelect" className="control-label">
            盤の大きさ
          </label>
          <select
            id="boardScaleSelect"
            className="control-select board-scale-select"
            value={boardScale}
            onChange={(e) => onBoardScaleChange(e.target.value as 'medium' | 'large' | 'huge')}
          >
            <option value="medium">標準 (540px)</option>
            <option value="large">大 (680px) ※推奨</option>
            <option value="huge">特大 (780px)</option>
          </select>
        </div>

        <div className="control-item">
          <label htmlFor="squareRatioSelect" className="control-label">
            マス目の形
          </label>
          <select
            id="squareRatioSelect"
            className="control-select square-ratio-select"
            value={squareRatio}
            onChange={(e) => onSquareRatioChange(e.target.value as 'square' | 'traditional')}
          >
            <option value="square">正方形（1:1 均一）</option>
            <option value="traditional">伝統比率（縦長 1:1.07 均一）</option>
          </select>
        </div>

        <div className="control-item">
          <label htmlFor="lastMoveColorSelect" className="control-label">
            着手履歴の色
          </label>
          <select
            id="lastMoveColorSelect"
            className="control-select last-move-color-select"
            value={lastMoveColor}
            onChange={(e) => onLastMoveColorChange(e.target.value as 'blue' | 'green')}
          >
            <option value="blue">青系統（推奨・成駒と明確に区別）</option>
            <option value="green">緑系統（エメラルド）</option>
          </select>
        </div>
      </div>

      {/* アクションボタンエリア */}
      <div className="control-section buttons-row">
        <button
          type="button"
          className="shogi-action-btn btn-undo"
          onClick={onUndo}
          disabled={!canUndo || isAiThinking}
          title="2手（相手の着手と自分の着手）戻して、直前の自分の手番からやり直します"
        >
          <span className="btn-icon">↩</span>
          待った
        </button>

        <button
          type="button"
          className="shogi-action-btn btn-reset"
          onClick={onReset}
          disabled={isAiThinking}
          title="初期配置に戻して最初から対局を開始します"
        >
          <span className="btn-icon">🔄</span>
          最初から
        </button>

        <button
          type="button"
          className="shogi-action-btn btn-resign"
          onClick={onResign}
          disabled={isGameOver || isAiThinking}
          title="現在の対局を投了します"
        >
          <span className="btn-icon">🏳</span>
          投了
        </button>

        {onReturnToTitle && (
          <button
            type="button"
            className="shogi-action-btn btn-title"
            onClick={onReturnToTitle}
            disabled={isAiThinking}
            title="対局を終了してタイトル画面に戻ります（対局は自動保存され、タイトルから再開できます）"
          >
            <span className="btn-icon">⛩️</span>
            タイトルへ
          </button>
        )}

        <button
          type="button"
          className={`shogi-action-btn btn-sound ${soundEnabled ? 'active' : ''}`}
          onClick={onToggleSound}
          title={soundEnabled ? '効果音をミュート' : '効果音を有効化'}
        >
          <span className="btn-icon">{soundEnabled ? '🔊' : '🔇'}</span>
          {soundEnabled ? '音あり' : '消音'}
        </button>

        <button
          type="button"
          className="shogi-action-btn btn-rules"
          onClick={onOpenRules}
          title="遊び方とルール説明・未対応ルールの確認"
        >
          <span className="btn-icon">📖</span>
          ルール
        </button>
      </div>
    </div>
  );
};
