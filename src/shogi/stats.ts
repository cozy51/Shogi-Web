import type { CpuDifficulty, GameMode } from './types';

export interface GameResultRecord {
  id: string;
  date: number; // timestamp
  mode: GameMode;
  difficulty?: CpuDifficulty;
  moveCount: number;
  result: 'win' | 'lose' | 'draw';
  reason: 'checkmate' | 'resigned';
  lastMoveText: string;
}

export interface DifficultyStats {
  wins: number;
  losses: number;
}

export interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  maxStreak: number;
  byDifficulty: Record<CpuDifficulty, DifficultyStats>;
  recentGames: GameResultRecord[];
}

const STATS_STORAGE_KEY = 'ag_shogi_stats_v1';

export const createInitialStats = (): GameStats => ({
  totalGames: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  maxStreak: 0,
  byDifficulty: {
    easy: { wins: 0, losses: 0 },
    normal: { wins: 0, losses: 0 },
    hard: { wins: 0, losses: 0 },
  },
  recentGames: [],
});

/**
 * ローカルストレージから戦績を読み込む
 */
export function loadGameStats(): GameStats {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createInitialStats();
  }

  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return createInitialStats();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createInitialStats();

    const stats = createInitialStats();
    stats.totalGames = Number(parsed.totalGames) || 0;
    stats.wins = Number(parsed.wins) || 0;
    stats.losses = Number(parsed.losses) || 0;
    stats.draws = Number(parsed.draws) || 0;
    stats.currentStreak = Number(parsed.currentStreak) || 0;
    stats.maxStreak = Number(parsed.maxStreak) || 0;

    if (parsed.byDifficulty && typeof parsed.byDifficulty === 'object') {
      for (const diff of ['easy', 'normal', 'hard'] as CpuDifficulty[]) {
        if (parsed.byDifficulty[diff]) {
          stats.byDifficulty[diff] = {
            wins: Number(parsed.byDifficulty[diff].wins) || 0,
            losses: Number(parsed.byDifficulty[diff].losses) || 0,
          };
        }
      }
    }

    if (Array.isArray(parsed.recentGames)) {
      stats.recentGames = parsed.recentGames.slice(0, 30);
    }

    return stats;
  } catch (err) {
    console.warn('[ShogiStats] Failed to load stats:', err);
    return createInitialStats();
  }
}

/**
 * 戦績をローカルストレージへ保存する
 */
export function saveGameStats(stats: GameStats): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (err) {
    console.warn('[ShogiStats] Failed to save stats:', err);
  }
}

/**
 * 対局結果を記録し、更新された戦績を返す
 */
export function recordGameResult(
  result: 'win' | 'lose' | 'draw',
  reason: 'checkmate' | 'resigned',
  mode: GameMode,
  moveCount: number,
  lastMoveText: string,
  difficulty?: CpuDifficulty
): GameStats {
  const stats = loadGameStats();

  // 2人対戦は個人の勝敗として集計しないが、ログには残す
  const isCpuMatch = mode === 'human_vs_cpu_sente' || mode === 'human_vs_cpu_gote';

  if (isCpuMatch) {
    stats.totalGames++;
    if (result === 'win') {
      stats.wins++;
      stats.currentStreak++;
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
      }
      if (difficulty && stats.byDifficulty[difficulty]) {
        stats.byDifficulty[difficulty].wins++;
      }
    } else if (result === 'lose') {
      stats.losses++;
      stats.currentStreak = 0;
      if (difficulty && stats.byDifficulty[difficulty]) {
        stats.byDifficulty[difficulty].losses++;
      }
    } else {
      stats.draws++;
    }
  }

  // 直近対局ログの追加（最大30局）
  const newRecord: GameResultRecord = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: Date.now(),
    mode,
    difficulty,
    moveCount,
    result,
    reason,
    lastMoveText,
  };

  stats.recentGames = [newRecord, ...stats.recentGames].slice(0, 30);

  saveGameStats(stats);
  return stats;
}

/**
 * 戦績をリセットする
 */
export function clearGameStats(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(STATS_STORAGE_KEY);
  } catch (err) {
    console.warn('[ShogiStats] Failed to clear stats:', err);
  }
}
