import type { Color, HandPieces, Move, Piece, PieceType } from './types';
import { PIECE_VALUES } from './constants';
import {
  applyMoveToBoardAndHands,
  generateLegalMoves,
  hasAnyLegalMoves,
  isKingInCheck,
} from './logic';

// 盤面評価関数
export const evaluatePosition = (
  board: (Piece | null)[][],
  hands: [HandPieces, HandPieces],
  turnColor: Color
): number => {
  let score = 0;

  // 1. 盤上の駒の価値と位置ボーナス
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      const baseVal = PIECE_VALUES[piece.type];
      let posVal = 0;

      // 中央支配ボーナス (5五周辺)
      const distCenter = Math.abs(x - 4) + Math.abs(y - 4);
      posVal += (8 - distCenter) * 3;

      // 前進ボーナス
      if (piece.type !== 'OU') {
        const advance = piece.color === 0 ? 8 - y : y;
        posVal += advance * 5;
      }

      const totalPieceVal = baseVal + posVal;
      if (piece.color === 0) {
        score += totalPieceVal;
      } else {
        score -= totalPieceVal;
      }
    }
  }

  // 2. 持ち駒の価値 (機動性が高いため定価の85%程度で計算)
  for (let c = 0; c < 2; c++) {
    const hand = hands[c as Color];
    let handScore = 0;
    for (const [pType, count] of Object.entries(hand)) {
      if (count > 0) {
        const val = PIECE_VALUES[pType as PieceType] * 0.85;
        handScore += val * count;
      }
    }
    if (c === 0) {
      score += handScore;
    } else {
      score -= handScore;
    }
  }

  // 王手ボーナス
  if (isKingInCheck(board, 1)) score += 120;
  if (isKingInCheck(board, 0)) score -= 120;

  // turnColor 視点でのスコアを返す
  return turnColor === 0 ? score : -score;
};

// 指し手の並び替え（MVV-LVA法 + 王手 + 成りを優先してアルファベータ探索を高速化）
const scoreMoveForOrdering = (_board: (Piece | null)[][], move: Move): number => {
  let moveScore = 0;

  if (move.captured) {
    // 王将（玉将）の捕獲を最優先
    if (move.captured.type === 'OU') {
      moveScore += 50000;
    } else {
      // 価値の高い駒を取る手を優先
      const victimVal = PIECE_VALUES[move.captured.type];
      const attackerVal = PIECE_VALUES[move.pieceType];
      moveScore += 1000 + victimVal - attackerVal * 0.1;
    }
  }

  if (move.promote) {
    moveScore += 400;
  }

  if (move.isDrop) {
    moveScore += 50;
  }

  return moveScore;
};

// アルファベータ探索
const alphaBeta = (
  board: (Piece | null)[][],
  hands: [HandPieces, HandPieces],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  currentTurn: Color,
  aiColor: Color
): number => {
  const opponentColor: Color = currentTurn === 0 ? 1 : 0;

  // 詰み判定
  const kingInCheck = isKingInCheck(board, currentTurn);
  const hasMoves = hasAnyLegalMoves(board, hands, currentTurn);

  if (!hasMoves) {
    // 詰まされた場合、極端に低い評価
    return kingInCheck ? -30000 + (3 - depth) * 100 : 0;
  }

  if (depth <= 0) {
    return evaluatePosition(board, hands, aiColor);
  }

  const moves = generateLegalMoves(board, hands, currentTurn);

  // 指し手ソート
  moves.sort(
    (a, b) => scoreMoveForOrdering(board, b) - scoreMoveForOrdering(board, a)
  );

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      if (move.captured?.type === 'OU') {
        return 35000; // 相手玉を捕獲して即勝利
      }
      const { newBoard, newHands } = applyMoveToBoardAndHands(board, hands, move);
      const evaluation = alphaBeta(
        newBoard,
        newHands,
        depth - 1,
        alpha,
        beta,
        false,
        opponentColor,
        aiColor
      );
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // βカット
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      if (move.captured?.type === 'OU') {
        return -35000;
      }
      const { newBoard, newHands } = applyMoveToBoardAndHands(board, hands, move);
      const evaluation = alphaBeta(
        newBoard,
        newHands,
        depth - 1,
        alpha,
        beta,
        true,
        opponentColor,
        aiColor
      );
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // αカット
    }
    return minEval;
  }
};

export type ThinkingSpeed = 'very_slow' | 'slow' | 'normal' | 'fast';

// AI着手選択ルーチン（非同期で実行し、UIを固めない）
export const chooseBestMoveAsync = async (
  board: (Piece | null)[][],
  hands: [HandPieces, HandPieces],
  aiColor: Color,
  difficulty: 'easy' | 'normal' | 'hard' = 'normal',
  speed: ThinkingSpeed = 'slow',
  winCondition: 'capture_king' | 'checkmate' = 'capture_king'
): Promise<Move | null> => {
  const startTime = Date.now();

  // 思考時間の下限設定（CPUの着手が早すぎて気づかないのを防ぐ）
  let targetThinkingMs = 1400;
  if (speed === 'very_slow') targetThinkingMs = 2100;
  if (speed === 'normal') targetThinkingMs = 850;
  if (speed === 'fast') targetThinkingMs = 350;

  // ブラウザのUI描画更新を保証するための短いウェイト
  await new Promise((resolve) => setTimeout(resolve, 60));

  const legalMoves = generateLegalMoves(board, hands, aiColor, null, null, winCondition);
  if (legalMoves.length === 0) return null;

  // 1. 相手玉の直接捕獲（王取り）手があれば、最優先で即座に着手！
  const kingCaptureMove = legalMoves.find((m) => m.captured?.type === 'OU');
  if (kingCaptureMove) {
    const elapsed = Date.now() - startTime;
    const remain = Math.max(0, targetThinkingMs - elapsed);
    if (remain > 0) await new Promise((r) => setTimeout(r, remain));
    return kingCaptureMove;
  }

  // 2. 1手で相手玉を詰ませられる手があれば最優先
  const opponentColor: Color = aiColor === 0 ? 1 : 0;
  for (const move of legalMoves) {
    const { newBoard, newHands } = applyMoveToBoardAndHands(board, hands, move);
    if (isKingInCheck(newBoard, opponentColor)) {
      if (!hasAnyLegalMoves(newBoard, newHands, opponentColor)) {
        // 残りウェイトを待ってから着手
        const elapsed = Date.now() - startTime;
        const remain = Math.max(0, targetThinkingMs - elapsed);
        if (remain > 0) await new Promise((r) => setTimeout(r, remain));
        return move; // 即詰み着手
      }
    }
  }

  // 探索深さの設定
  let searchDepth = 2;
  let jitterMagnitude = 0;

  if (difficulty === 'easy') {
    searchDepth = 1;
    jitterMagnitude = 50; // 適度なゆらぎを与えて初級者向けにする
  } else if (difficulty === 'normal') {
    searchDepth = 2;
    jitterMagnitude = 15;
  } else {
    searchDepth = 3;
    jitterMagnitude = 0;
  }

  // 指し手ソート
  legalMoves.sort(
    (a, b) => scoreMoveForOrdering(board, b) - scoreMoveForOrdering(board, a)
  );

  let bestMove: Move = legalMoves[0];
  let bestScore = -Infinity;

  for (let i = 0; i < legalMoves.length; i++) {
    const move = legalMoves[i];
    const { newBoard, newHands } = applyMoveToBoardAndHands(board, hands, move);

    // 相手番
    const score = alphaBeta(
      newBoard,
      newHands,
      searchDepth - 1,
      -Infinity,
      Infinity,
      false,
      opponentColor,
      aiColor
    );

    // ゆらぎを加味
    const jitter = jitterMagnitude > 0 ? (Math.random() - 0.5) * jitterMagnitude * 2 : 0;
    const finalScore = score + jitter;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMove = move;
    }

    // 途中でUIが重くならないよう、複数手ごとにイベントループに譲渡
    if (i % 8 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  // 思考時間の下限を確保（プレイヤーが着手した瞬間すぐに指されて見失うのを防ぐ）
  const elapsed = Date.now() - startTime;
  const remainingWait = Math.max(0, targetThinkingMs - elapsed);
  if (remainingWait > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingWait));
  }

  return bestMove;
};
