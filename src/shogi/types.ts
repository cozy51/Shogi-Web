export type Color = 0 | 1; // 0: 先手 (Sente / ▲), 1: 後手 (Gote / △)

export type BasePieceType = 'FU' | 'KY' | 'KE' | 'GI' | 'KI' | 'KA' | 'HI' | 'OU';
export type PromotedPieceType = 'TO' | 'NY' | 'NK' | 'NG' | 'UM' | 'RY';
export type PieceType = BasePieceType | PromotedPieceType;

export interface Piece {
  id: string;
  type: PieceType;
  color: Color;
  isPromoted: boolean;
}

export interface Square {
  x: number; // 0: 9筋, 1: 8筋, ..., 8: 1筋
  y: number; // 0: 一段目, 1: 二段目, ..., 8: 九段目
}

export type HandPieces = Record<BasePieceType, number>;

export interface Move {
  from: Square | null; // null if drop (打つ)
  to: Square;
  pieceType: PieceType; // The piece before moving
  color: Color;
  promote?: boolean;
  captured?: Piece | null;
  isDrop?: boolean;
}

export interface MoveRecord {
  move: Move;
  kifuText: string;
  isCheck: boolean;
}

export type GameMode = 'human_vs_cpu_sente' | 'human_vs_cpu_gote' | 'human_vs_human';
export type CpuDifficulty = 'easy' | 'normal' | 'hard';
export type WinCondition = 'capture_king' | 'checkmate';

export interface GameState {
  board: (Piece | null)[][]; // board[y][x], 9x9
  hands: [HandPieces, HandPieces]; // hands[0]: 先手, hands[1]: 後手
  turn: Color;
  history: MoveRecord[];
  status: 'playing' | 'checkmate' | 'resigned';
  winner: Color | null;
  isCheck: boolean;
  selectedSquare: Square | null;
  selectedHandPiece: BasePieceType | null;
  legalMoves: Move[];
  lastMove: Move | null;
  winCondition?: WinCondition;
}

