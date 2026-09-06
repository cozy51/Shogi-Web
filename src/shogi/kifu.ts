import type { Move, MoveRecord } from './types';
import { PIECE_NAMES } from './constants';

const FILE_KANJI = ['９', '８', '７', '６', '５', '４', '３', '２', '１'];
const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

export const toJapaneseSquare = (x: number, y: number): string => {
  return `${FILE_KANJI[x]}${RANK_KANJI[y]}`;
};

export const generateKifuText = (
  move: Move,
  history: MoveRecord[],
  isCheck: boolean = false
): string => {
  const mark = move.color === 0 ? '☗' : '☖';
  const { to, from, pieceType, promote, isDrop } = move;

  // 直前の着手先と同じマスか判定
  const lastMove = history.length > 0 ? history[history.length - 1].move : null;
  const isSameSquare =
    lastMove !== null && lastMove.to.x === to.x && lastMove.to.y === to.y;

  let posText = isSameSquare ? '同　' : toJapaneseSquare(to.x, to.y);

  // 駒の表記
  const pieceName = PIECE_NAMES[pieceType];

  let actionText = '';
  if (isDrop) {
    actionText = '打';
  } else if (promote === true) {
    actionText = '成';
  } else if (promote === false) {
    // 成れるのに成らなかった場合のみ「不成」と付ける
    // 移動元または移動先が敵陣で、かつ成れる駒の場合
    const promotable = ['FU', 'KY', 'KE', 'GI', 'KA', 'HI'].includes(pieceType);
    const inZone =
      move.color === 0
        ? (from && from.y <= 2) || to.y <= 2
        : (from && from.y >= 6) || to.y >= 6;
    if (promotable && inZone) {
      actionText = '不成';
    }
  }

  // 移動元の表記 (筋段)
  let fromText = '';
  if (from) {
    const fromFile = 9 - from.x;
    const fromRank = from.y + 1;
    fromText = `(${fromFile}${fromRank})`;
  }

  const checkText = isCheck ? ' [王手]' : '';

  return `${mark}${posText}${pieceName}${actionText}${fromText}${checkText}`;
};
