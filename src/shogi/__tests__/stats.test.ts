import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadGameStats,
  recordGameResult,
  clearGameStats,
  createInitialStats,
} from '../stats';

// Mock localStorage
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

describe('Shogi Stats Tracking Module', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns initial stats when storage is empty', () => {
    const stats = loadGameStats();
    expect(stats).toEqual(createInitialStats());
    expect(stats.totalGames).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.recentGames).toEqual([]);
  });

  it('correctly records a win and updates streaks and difficulty stats', () => {
    const stats = recordGameResult(
      'win',
      'checkmate',
      'human_vs_cpu_sente',
      45,
      '☗２一龍王',
      'normal'
    );

    expect(stats.totalGames).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.currentStreak).toBe(1);
    expect(stats.maxStreak).toBe(1);
    expect(stats.byDifficulty.normal.wins).toBe(1);
    expect(stats.recentGames.length).toBe(1);
    expect(stats.recentGames[0].result).toBe('win');
    expect(stats.recentGames[0].lastMoveText).toBe('☗２一龍王');

    // Win again to test streak continuation
    const stats2 = recordGameResult(
      'win',
      'resigned',
      'human_vs_cpu_sente',
      60,
      '☗５二金',
      'normal'
    );
    expect(stats2.totalGames).toBe(2);
    expect(stats2.wins).toBe(2);
    expect(stats2.currentStreak).toBe(2);
    expect(stats2.maxStreak).toBe(2);
  });

  it('resets current streak on loss while preserving max streak', () => {
    recordGameResult('win', 'checkmate', 'human_vs_cpu_sente', 50, '☗２一龍王', 'easy');
    recordGameResult('win', 'checkmate', 'human_vs_cpu_sente', 52, '☗４一金', 'easy');
    
    // Now lose
    const afterLoss = recordGameResult('lose', 'checkmate', 'human_vs_cpu_sente', 70, '☖５二飛', 'easy');
    expect(afterLoss.totalGames).toBe(3);
    expect(afterLoss.wins).toBe(2);
    expect(afterLoss.losses).toBe(1);
    expect(afterLoss.currentStreak).toBe(0);
    expect(afterLoss.maxStreak).toBe(2);
    expect(afterLoss.byDifficulty.easy.losses).toBe(1);
  });

  it('clearGameStats resets all statistics', () => {
    recordGameResult('win', 'checkmate', 'human_vs_cpu_sente', 30, '☗１一角', 'hard');
    expect(loadGameStats().wins).toBe(1);

    clearGameStats();
    expect(loadGameStats().wins).toBe(0);
  });
});
