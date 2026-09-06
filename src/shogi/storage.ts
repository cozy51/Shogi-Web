import type {
  Color,
  CpuDifficulty,
  GameMode,
  GameState,
  HandPieces,
  Move,
  MoveRecord,
  Piece,
  WinCondition,
} from './types';
import type { ThinkingSpeed } from './ai';

const STORAGE_KEY = 'ag_shogi_saved_game_v1';

export interface PersistedSettings {
  mode: GameMode;
  difficulty: CpuDifficulty;
  thinkingSpeed: ThinkingSpeed;
  boardScale: 'medium' | 'large' | 'huge';
  squareRatio: 'square' | 'traditional';
  soundEnabled: boolean;
  pieceFontMode?: 'two_char' | 'single_char';
  lastMoveColor?: 'blue' | 'green';
  winCondition?: WinCondition;
}

export interface PersistedGameState {
  board: (Piece | null)[][];
  hands: [HandPieces, HandPieces];
  turn: Color;
  status: 'playing' | 'checkmate' | 'resigned';
  winner: Color | null;
  isCheck: boolean;
  lastMove: Move | null;
  history: MoveRecord[];
}

export interface PersistedGameData {
  gameState: PersistedGameState;
  historyStack: PersistedGameState[];
  settings: PersistedSettings;
  savedAt: number;
}

/**
 * 盤面データのバリデーション（破損データの読み込み防止）
 */
function isValidGameState(gs: any): gs is PersistedGameState {
  if (!gs || typeof gs !== 'object') return false;
  if (!Array.isArray(gs.board) || gs.board.length !== 9) return false;
  for (let r = 0; r < 9; r++) {
    if (!Array.isArray(gs.board[r]) || gs.board[r].length !== 9) return false;
  }
  if (!Array.isArray(gs.hands) || gs.hands.length !== 2) return false;
  if (gs.turn !== 0 && gs.turn !== 1) return false;
  if (!Array.isArray(gs.history)) return false;
  if (
    gs.status !== 'playing' &&
    gs.status !== 'checkmate' &&
    gs.status !== 'resigned'
  ) {
    return false;
  }
  return true;
}

/**
 * ゲーム状態をローカルストレージに保存
 */
export function saveGameToStorage(
  gameState: GameState,
  historyStack: GameState[],
  settings: PersistedSettings
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const persistedGameState: PersistedGameState = {
      board: gameState.board,
      hands: gameState.hands,
      turn: gameState.turn,
      status: gameState.status,
      winner: gameState.winner,
      isCheck: gameState.isCheck,
      lastMove: gameState.lastMove,
      history: gameState.history,
    };

    const persistedHistoryStack: PersistedGameState[] = historyStack.map((s) => ({
      board: s.board,
      hands: s.hands,
      turn: s.turn,
      status: s.status,
      winner: s.winner,
      isCheck: s.isCheck,
      lastMove: s.lastMove,
      history: s.history,
    }));

    const data: PersistedGameData = {
      gameState: persistedGameState,
      historyStack: persistedHistoryStack,
      settings,
      savedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[ShogiStorage] Failed to save game state to localStorage:', err);
  }
}

/**
 * ローカルストレージからゲーム状態を読み込み
 */
export function loadGameFromStorage(): PersistedGameData | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    if (!isValidGameState(parsed.gameState)) {
      console.warn('[ShogiStorage] Invalid game state in storage, ignoring.');
      return null;
    }

    const rawHistoryStack: PersistedGameState[] = Array.isArray(parsed.historyStack)
      ? (parsed.historyStack as unknown[]).filter(isValidGameState)
      : [];

    // 連続する重複エントリ（StrictMode等による二重保存）を確実に排除
    const historyStack = rawHistoryStack.filter(
      (s: PersistedGameState, idx: number, arr: PersistedGameState[]) =>
        idx === 0 || s.history.length !== arr[idx - 1].history.length
    );

    const settings: PersistedSettings = parsed.settings || {};
    const effectiveWinCondition: WinCondition = settings.winCondition ?? 'capture_king';
    settings.winCondition = effectiveWinCondition;

    // 「王を取るまで」ルールの場合、両陣営の王将がまだ盤上に残っているなら対局継続（王を取る動作を実行可能にする）
    if (effectiveWinCondition === 'capture_king' && parsed.gameState.status === 'checkmate') {
      const senteKingExists = parsed.gameState.board.some((row: (Piece | null)[]) =>
        row.some((p) => p && p.type === 'OU' && p.color === 0)
      );
      const goteKingExists = parsed.gameState.board.some((row: (Piece | null)[]) =>
        row.some((p) => p && p.type === 'OU' && p.color === 1)
      );

      if (senteKingExists && goteKingExists) {
        parsed.gameState.status = 'playing';
        parsed.gameState.winner = null;
      }
    }

    return {
      gameState: parsed.gameState,
      historyStack,
      settings,
      savedAt: parsed.savedAt || Date.now(),
    };
  } catch (err) {
    console.warn('[ShogiStorage] Failed to load game state from localStorage:', err);
    return null;
  }
}

/**
 * 保存された対局データを消去（初期化時用）
 */
export function clearGameStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[ShogiStorage] Failed to clear game storage:', err);
  }
}
