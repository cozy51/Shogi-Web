import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveGameToStorage,
  loadGameFromStorage,
  clearGameStorage,
} from '../storage';
import { createInitialGameState, makeMove } from '../logic';

// Mock localStorage for Node test runner
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, String(val)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: { localStorage: localStorageMock },
  writable: true,
});

describe('Storage Persistence Module', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns null when storage is empty', () => {
    const loaded = loadGameFromStorage();
    expect(loaded).toBeNull();
  });

  it('correctly saves and loads initial game state and settings', () => {
    const state = createInitialGameState();
    const settings = {
      mode: 'human_vs_cpu_sente' as const,
      difficulty: 'normal' as const,
      thinkingSpeed: 'slow' as const,
      boardScale: 'large' as const,
      squareRatio: 'square' as const,
      soundEnabled: true,
    };

    saveGameToStorage(state, [], settings);

    const loaded = loadGameFromStorage();
    expect(loaded).not.toBeNull();
    expect(loaded?.gameState.turn).toBe(0);
    expect(loaded?.gameState.board.length).toBe(9);
    expect(loaded?.gameState.history.length).toBe(0);
    expect(loaded?.settings.mode).toBe('human_vs_cpu_sente');
    expect(loaded?.settings.thinkingSpeed).toBe('slow');
  });

  it('correctly saves and restores game state after several moves', () => {
    const state0 = createInitialGameState();
    // 1. ▲7六歩
    const move1 = state0.legalMoves.find(
      (m) => m.from?.x === 2 && m.from?.y === 6 && m.to.x === 2 && m.to.y === 5
    )!;
    const state1 = makeMove(state0, move1);

    // 2. △3四歩
    const move2 = state1.legalMoves.find(
      (m) => m.from?.x === 6 && m.from?.y === 2 && m.to.x === 6 && m.to.y === 3
    )!;
    const state2 = makeMove(state1, move2);

    const historyStack = [state0, state1];
    const settings = {
      mode: 'human_vs_cpu_sente' as const,
      difficulty: 'hard' as const,
      thinkingSpeed: 'very_slow' as const,
      boardScale: 'huge' as const,
      squareRatio: 'traditional' as const,
      soundEnabled: false,
    };

    saveGameToStorage(state2, historyStack, settings);

    const loaded = loadGameFromStorage();
    expect(loaded).not.toBeNull();
    expect(loaded?.gameState.turn).toBe(0); // Back to Sente after 2 moves
    expect(loaded?.gameState.history.length).toBe(2);
    expect(loaded?.gameState.history[0].kifuText).toBe('☗７六歩(77)');
    expect(loaded?.gameState.history[1].kifuText).toBe('☖３四歩(33)');
    expect(loaded?.historyStack.length).toBe(2);
    expect(loaded?.settings.difficulty).toBe('hard');
    expect(loaded?.settings.thinkingSpeed).toBe('very_slow');
    expect(loaded?.settings.boardScale).toBe('huge');
    expect(loaded?.settings.squareRatio).toBe('traditional');
    expect(loaded?.settings.soundEnabled).toBe(false);

    // 7六 should contain Sente's Pawn
    expect(loaded?.gameState.board[5][2]?.type).toBe('FU');
    expect(loaded?.gameState.board[5][2]?.color).toBe(0);
    // 3四 should contain Gote's Pawn
    expect(loaded?.gameState.board[3][6]?.type).toBe('FU');
    expect(loaded?.gameState.board[3][6]?.color).toBe(1);
  });

  it('safely handles corrupted or invalid JSON in localStorage', () => {
    localStorage.setItem('ag_shogi_saved_game_v1', 'NOT_VALID_JSON{[');
    expect(loadGameFromStorage()).toBeNull();

    localStorage.setItem(
      'ag_shogi_saved_game_v1',
      JSON.stringify({ gameState: { board: 'invalid' } })
    );
    expect(loadGameFromStorage()).toBeNull();
  });

  it('clearGameStorage removes saved data', () => {
    const state = createInitialGameState();
    saveGameToStorage(state, [], {
      mode: 'human_vs_cpu_sente',
      difficulty: 'normal',
      thinkingSpeed: 'slow',
      boardScale: 'large',
      squareRatio: 'square',
      soundEnabled: true,
    });
    expect(loadGameFromStorage()).not.toBeNull();

    clearGameStorage();
    expect(loadGameFromStorage()).toBeNull();
  });

  it('deduplicates consecutive identical historyStack entries on load', () => {
    const state0 = createInitialGameState();
    const move1 = {
      from: { x: 2, y: 6 },
      to: { x: 2, y: 5 },
      pieceType: 'FU' as const,
      color: 0 as const,
    };
    const state1 = makeMove(state0, move1);

    // Simulate duplicate entries (e.g. from React StrictMode)
    const duplicatedHistory = [state0, state0, state1, state1];
    saveGameToStorage(state1, duplicatedHistory, {
      mode: 'human_vs_cpu_sente',
      difficulty: 'normal',
      thinkingSpeed: 'slow',
      boardScale: 'large',
      squareRatio: 'square',
      soundEnabled: true,
    });

    const loaded = loadGameFromStorage();
    expect(loaded).not.toBeNull();
    // After deduplication, should have exactly 2 entries (state0 and state1)
    expect(loaded?.historyStack.length).toBe(2);
    expect(loaded?.historyStack[0].history.length).toBe(0);
    expect(loaded?.historyStack[1].history.length).toBe(1);
  });
});
