import type { BasePieceType, Color, HandPieces, Piece, PieceType } from './types';

export const PIECE_NAMES: Record<PieceType, string> = {
  FU: '歩',
  KY: '香',
  KE: '桂',
  GI: '銀',
  KI: '金',
  KA: '角',
  HI: '飛',
  OU: '玉',
  TO: 'と',
  NY: '成香',
  NK: '成桂',
  NG: '成銀',
  UM: '馬',
  RY: '竜',
};

// 伝統的な二字銘駒表記（写真の本格盛上駒スタイル）
export const PIECE_KANJI_PAIR: Record<PieceType, [string, string] | [string]> = {
  FU: ['歩', '兵'],
  KY: ['香', '車'],
  KE: ['桂', '馬'],
  GI: ['銀', '将'],
  KI: ['金', '将'],
  KA: ['角', '行'],
  HI: ['飛', '車'],
  OU: ['玉', '将'],
  TO: ['と'],
  NY: ['成', '香'],
  NK: ['成', '桂'],
  NG: ['成', '銀'],
  UM: ['龍', '馬'],
  RY: ['龍', '王'],
};

// 伝統的な高級駒のサイズ比率（玉が最も大きく、歩が最も小ぶり）
export const PIECE_SCALE_MAP: Record<PieceType, number> = {
  OU: 1.00,
  HI: 0.97,
  RY: 0.97,
  KA: 0.96,
  UM: 0.96,
  KI: 0.94,
  GI: 0.93,
  NG: 0.93,
  KE: 0.91,
  NK: 0.91,
  KY: 0.90,
  NY: 0.90,
  FU: 0.87,
  TO: 0.87,
};

// 一字彫り駒用の漢字（見やすさ重視の大文字）
export const SINGLE_CHAR_MAP: Record<PieceType, string> = {
  OU: '玉',
  HI: '飛',
  KA: '角',
  KI: '金',
  GI: '銀',
  KE: '桂',
  KY: '香',
  FU: '歩',
  TO: 'と',
  NY: '杏',
  NK: '圭',
  NG: '全',
  UM: '馬',
  RY: '竜',
};

export interface PieceDetail {
  fullName: string;
  kana: string;
  singleKanji: string;
  isPromoted: boolean;
  baseType: BasePieceType;
  promotedName?: string;
  description: string;
}

export const PIECE_DETAILS: Record<PieceType, PieceDetail> = {
  FU: {
    fullName: '歩兵',
    kana: 'ふひょう',
    singleKanji: '歩',
    isPromoted: false,
    baseType: 'FU',
    promotedName: 'と金',
    description: '前方に1マス進めます。敵陣（3段目以内）に入ると「と金」に成れます。',
  },
  KY: {
    fullName: '香車',
    kana: 'きょうしゃ',
    singleKanji: '香',
    isPromoted: false,
    baseType: 'KY',
    promotedName: '成香',
    description: '前方に何マスでも直進できます。敵陣に入ると「成香（金と同じ動き）」に成れます。',
  },
  KE: {
    fullName: '桂馬',
    kana: 'けいま',
    singleKanji: '桂',
    isPromoted: false,
    baseType: 'KE',
    promotedName: '成桂',
    description: '前方の斜め2マス先へ、他の駒を飛び越えて跳べます。敵陣に入ると「成桂（金と同じ）」に成れます。',
  },
  GI: {
    fullName: '銀将',
    kana: 'ぎんしょう',
    singleKanji: '銀',
    isPromoted: false,
    baseType: 'GI',
    promotedName: '成銀',
    description: '前と斜め4方向（計5方向）に1マス進めます。敵陣に入ると「成銀（金と同じ）」に成れます。',
  },
  KI: {
    fullName: '金将',
    kana: 'きんしょう',
    singleKanji: '金',
    isPromoted: false,
    baseType: 'KI',
    description: '縦横と斜め前（計6方向）に1マス進めます。成ることはできません。',
  },
  KA: {
    fullName: '角行',
    kana: 'かくぎょう',
    singleKanji: '角',
    isPromoted: false,
    baseType: 'KA',
    promotedName: '龍馬',
    description: '斜め4方向に何マスでも進めます。敵陣に入ると「龍馬（角＋縦横1マス）」に成れます。',
  },
  HI: {
    fullName: '飛車',
    kana: 'ひしゃ',
    singleKanji: '飛',
    isPromoted: false,
    baseType: 'HI',
    promotedName: '竜王',
    description: '縦横4方向に何マスでも進めます。敵陣に入ると「竜王（飛車＋斜め1マス）」に成れます。',
  },
  OU: {
    fullName: '玉将',
    kana: 'ぎょくしょう / おうしょう',
    singleKanji: '玉',
    isPromoted: false,
    baseType: 'OU',
    description: '周囲8方向すべてに1マス進めます。取られると対局終了（負け）になります。',
  },
  TO: {
    fullName: 'と金',
    kana: 'ときん',
    singleKanji: 'と',
    isPromoted: true,
    baseType: 'FU',
    description: '【成駒】金将と同じ動き（前後左右＋斜め前）ができます。取られると歩兵に戻ります。',
  },
  NY: {
    fullName: '成香',
    kana: 'なりきょう',
    singleKanji: '杏',
    isPromoted: true,
    baseType: 'KY',
    description: '【成駒】金将と同じ動き（前後左右＋斜め前）ができます。取られると香車に戻ります。',
  },
  NK: {
    fullName: '成桂',
    kana: 'なりけい',
    singleKanji: '圭',
    isPromoted: true,
    baseType: 'KE',
    description: '【成駒】金将と同じ動き（前後左右＋斜め前）ができます。取られると桂馬に戻ります。',
  },
  NG: {
    fullName: '成銀',
    kana: 'なりぎん',
    singleKanji: '全',
    isPromoted: true,
    baseType: 'GI',
    description: '【成駒】金将と同じ動き（前後左右＋斜め前）ができます。取られると銀将に戻ります。',
  },
  UM: {
    fullName: '龍馬',
    kana: 'りゅうま / うま',
    singleKanji: '馬',
    isPromoted: true,
    baseType: 'KA',
    description: '【成駒】角行の動き（斜め何マスでも）に加え、縦横に1マス進めます。',
  },
  RY: {
    fullName: '竜王',
    kana: 'りゅうおう / りゅう',
    singleKanji: '竜',
    isPromoted: true,
    baseType: 'HI',
    description: '【成駒】飛車の動き（縦横何マスでも）に加え、斜めに1マス進めます。',
  },
};

// 相手方の玉は「王将」とする伝統
export const GOTE_KING_PAIR: [string, string] = ['王', '将'];
export const GOTE_KING_NAME = '王';

export const PROMOTED_MAP: Partial<Record<BasePieceType, PieceType>> = {
  FU: 'TO',
  KY: 'NY',
  KE: 'NK',
  GI: 'NG',
  KA: 'UM',
  HI: 'RY',
};

export const UNPROMOTED_MAP: Record<PieceType, BasePieceType> = {
  FU: 'FU',
  KY: 'KY',
  KE: 'KE',
  GI: 'GI',
  KI: 'KI',
  KA: 'KA',
  HI: 'HI',
  OU: 'OU',
  TO: 'FU',
  NY: 'KY',
  NK: 'KE',
  NG: 'GI',
  UM: 'KA',
  RY: 'HI',
};

export const PROMOTABLE_PIECES: BasePieceType[] = ['FU', 'KY', 'KE', 'GI', 'KA', 'HI'];

export const DROP_PIECE_ORDER: BasePieceType[] = ['HI', 'KA', 'KI', 'GI', 'KE', 'KY', 'FU'];

export const INITIAL_HANDS: HandPieces = {
  FU: 0,
  KY: 0,
  KE: 0,
  GI: 0,
  KI: 0,
  KA: 0,
  HI: 0,
  OU: 0,
};

let pieceIdCounter = 0;
export const createPiece = (type: PieceType, color: Color, isPromoted = false): Piece => {
  pieceIdCounter++;
  return {
    id: `p-${pieceIdCounter}`,
    type,
    color,
    isPromoted,
  };
};

export const createInitialBoard = (): (Piece | null)[][] => {
  const board: (Piece | null)[][] = Array(9)
    .fill(null)
    .map(() => Array(9).fill(null));

  // Gote (color: 1) rank 0 (y = 0)
  const backRowGote: BasePieceType[] = ['KY', 'KE', 'GI', 'KI', 'OU', 'KI', 'GI', 'KE', 'KY'];
  for (let x = 0; x < 9; x++) {
    board[0][x] = createPiece(backRowGote[x], 1);
  }

  // Gote rank 1 (y = 1)
  board[1][1] = createPiece('HI', 1); // 8二飛
  board[1][7] = createPiece('KA', 1); // 2二角

  // Gote rank 2 (y = 2) Pawns
  for (let x = 0; x < 9; x++) {
    board[2][x] = createPiece('FU', 1);
  }

  // Sente rank 6 (y = 6) Pawns
  for (let x = 0; x < 9; x++) {
    board[6][x] = createPiece('FU', 0);
  }

  // Sente rank 7 (y = 7)
  board[7][1] = createPiece('KA', 0); // 8八角
  board[7][7] = createPiece('HI', 0); // 2八飛

  // Sente (color: 0) rank 8 (y = 8)
  const backRowSente: BasePieceType[] = ['KY', 'KE', 'GI', 'KI', 'OU', 'KI', 'GI', 'KE', 'KY'];
  for (let x = 0; x < 9; x++) {
    board[8][x] = createPiece(backRowSente[x], 0);
  }

  return board;
};

// AI用 駒の価値定義
export const PIECE_VALUES: Record<PieceType, number> = {
  FU: 100,
  KY: 300,
  KE: 350,
  GI: 480,
  KI: 550,
  KA: 820,
  HI: 1000,
  OU: 15000,
  TO: 480,
  NY: 480,
  NK: 490,
  NG: 500,
  UM: 1100,
  RY: 1300,
};
