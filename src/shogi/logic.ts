import type {
  BasePieceType,
  Color,
  GameState,
  HandPieces,
  Move,
  Piece,
  Square,
  WinCondition,
} from './types';
import {
  createInitialBoard,
  createPiece,
  DROP_PIECE_ORDER,
  INITIAL_HANDS,
  PROMOTABLE_PIECES,
  PROMOTED_MAP,
  UNPROMOTED_MAP,
} from './constants';
import { generateKifuText } from './kifu';

export const inBounds = (x: number, y: number): boolean => {
  return x >= 0 && x < 9 && y >= 0 && y < 9;
};

export const cloneBoard = (board: (Piece | null)[][]): (Piece | null)[][] => {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
};

export const cloneHands = (hands: [HandPieces, HandPieces]): [HandPieces, HandPieces] => {
  return [{ ...hands[0] }, { ...hands[1] }];
};

// 特定のマスが指定された手番の駒から利いているか判定
export const isSquareAttacked = (
  board: (Piece | null)[][],
  target: Square,
  byColor: Color
): boolean => {
  const dir = byColor === 0 ? -1 : 1;

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (!piece || piece.color !== byColor) continue;

      const dx = target.x - x;
      const dy = target.y - y;
      const type = piece.type;

      // 歩
      if (type === 'FU') {
        if (dx === 0 && dy === dir) return true;
        continue;
      }

      // 香車
      if (type === 'KY') {
        if (dx === 0 && (dir === -1 ? dy < 0 : dy > 0)) {
          // 間のマスが空いているか確認
          let clear = true;
          const stepY = dir;
          let curY = y + stepY;
          while (curY !== target.y) {
            if (board[curY][x] !== null) {
              clear = false;
              break;
            }
            curY += stepY;
          }
          if (clear) return true;
        }
        continue;
      }

      // 桂馬
      if (type === 'KE') {
        if ((dx === -1 || dx === 1) && dy === 2 * dir) return true;
        continue;
      }

      // 銀将
      if (type === 'GI') {
        // 前3方向 + 斜め後ろ2方向
        if (
          (dy === dir && (dx === -1 || dx === 0 || dx === 1)) ||
          (dy === -dir && (dx === -1 || dx === 1))
        ) {
          return true;
        }
        continue;
      }

      // 金将、成駒 (TO, NY, NK, NG)
      if (type === 'KI' || type === 'TO' || type === 'NY' || type === 'NK' || type === 'NG') {
        // 前3方向 + 左右 + 真後ろ
        if (
          (dy === dir && (dx === -1 || dx === 0 || dx === 1)) ||
          (dy === 0 && (dx === -1 || dx === 1)) ||
          (dy === -dir && dx === 0)
        ) {
          return true;
        }
        continue;
      }

      // 玉将
      if (type === 'OU') {
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
          return true;
        }
        continue;
      }

      // 角行・馬
      if (type === 'KA' || type === 'UM') {
        if (Math.abs(dx) === Math.abs(dy) && dx !== 0) {
          const stepX = dx > 0 ? 1 : -1;
          const stepY = dy > 0 ? 1 : -1;
          let curX = x + stepX;
          let curY = y + stepY;
          let clear = true;
          while (curX !== target.x && curY !== target.y) {
            if (board[curY][curX] !== null) {
              clear = false;
              break;
            }
            curX += stepX;
            curY += stepY;
          }
          if (clear) return true;
        }
        if (type === 'UM') {
          // 馬は十字1マスも利く
          if ((Math.abs(dx) === 1 && dy === 0) || (Math.abs(dy) === 1 && dx === 0)) {
            return true;
          }
        }
        continue;
      }

      // 飛車・竜
      if (type === 'HI' || type === 'RY') {
        if ((dx === 0 && dy !== 0) || (dy === 0 && dx !== 0)) {
          const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
          const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
          let curX = x + stepX;
          let curY = y + stepY;
          let clear = true;
          while (curX !== target.x || curY !== target.y) {
            if (board[curY][curX] !== null) {
              clear = false;
              break;
            }
            curX += stepX;
            curY += stepY;
          }
          if (clear) return true;
        }
        if (type === 'RY') {
          // 竜は斜め1マスも利く
          if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
            return true;
          }
        }
        continue;
      }
    }
  }

  return false;
};

// 王のマスを見つける
export const findKing = (board: (Piece | null)[][], color: Color): Square | null => {
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (piece && piece.type === 'OU' && piece.color === color) {
        return { x, y };
      }
    }
  }
  return null;
};

// 自玉が王手されているか
export const isKingInCheck = (board: (Piece | null)[][], kingColor: Color): boolean => {
  const kingPos = findKing(board, kingColor);
  if (!kingPos) return false;
  const opponentColor: Color = kingColor === 0 ? 1 : 0;
  return isSquareAttacked(board, kingPos, opponentColor);
};

// 行き所のない駒判定（強制成りまたは打ち禁止）
export const isDeadEnd = (pieceType: BasePieceType, toY: number, color: Color): boolean => {
  if (color === 0) {
    // 先手: 奥段(y=0)に行き所なし
    if ((pieceType === 'FU' || pieceType === 'KY') && toY === 0) return true;
    if (pieceType === 'KE' && toY <= 1) return true;
  } else {
    // 後手: 手前段(y=8)に行き所なし
    if ((pieceType === 'FU' || pieceType === 'KY') && toY === 8) return true;
    if (pieceType === 'KE' && toY >= 7) return true;
  }
  return false;
};

// 成り可能か判定
export const canPromoteMove = (
  pieceType: BasePieceType,
  fromY: number,
  toY: number,
  color: Color
): boolean => {
  if (!PROMOTABLE_PIECES.includes(pieceType)) return false;
  if (color === 0) {
    return fromY <= 2 || toY <= 2;
  } else {
    return fromY >= 6 || toY >= 6;
  }
};

// 盤上の1つの駒から可能な擬似合法手を生成
export const getPiecePseudoMoves = (
  board: (Piece | null)[][],
  from: Square,
  piece: Piece
): Move[] => {
  const moves: Move[] = [];
  const color = piece.color;
  const dir = color === 0 ? -1 : 1;
  const { x, y } = from;
  const type = piece.type;
  const baseType = UNPROMOTED_MAP[type];

  const addMoveOrPromote = (to: Square) => {
    if (!inBounds(to.x, to.y)) return;
    const dest = board[to.y][to.x];
    if (dest && dest.color === color) return; // 味方の駒がある

    const captured = dest ? { ...dest } : null;

    if (piece.isPromoted || !PROMOTABLE_PIECES.includes(baseType)) {
      // 既に成っている駒、または金・玉
      moves.push({
        from,
        to,
        pieceType: type,
        color,
        promote: false,
        captured,
      });
    } else {
      // 成れる可能性がある駒
      const canProm = canPromoteMove(baseType, y, to.y, color);
      const mustProm = isDeadEnd(baseType, to.y, color);

      if (mustProm) {
        // 行き所のない駒は強制成り
        moves.push({
          from,
          to,
          pieceType: type,
          color,
          promote: true,
          captured,
        });
      } else if (canProm) {
        // 成る手と成らない手を選択可能
        moves.push({
          from,
          to,
          pieceType: type,
          color,
          promote: true,
          captured,
        });
        moves.push({
          from,
          to,
          pieceType: type,
          color,
          promote: false,
          captured,
        });
      } else {
        // 成れない位置
        moves.push({
          from,
          to,
          pieceType: type,
          color,
          promote: false,
          captured,
        });
      }
    }
  };

  const addRayMoves = (dx: number, dy: number) => {
    let curX = x + dx;
    let curY = y + dy;
    while (inBounds(curX, curY)) {
      const dest = board[curY][curX];
      if (dest) {
        if (dest.color !== color) {
          addMoveOrPromote({ x: curX, y: curY });
        }
        break; // 遮られる
      }
      addMoveOrPromote({ x: curX, y: curY });
      curX += dx;
      curY += dy;
    }
  };

  if (type === 'FU') {
    addMoveOrPromote({ x, y: y + dir });
  } else if (type === 'KY') {
    addRayMoves(0, dir);
  } else if (type === 'KE') {
    addMoveOrPromote({ x: x - 1, y: y + 2 * dir });
    addMoveOrPromote({ x: x + 1, y: y + 2 * dir });
  } else if (type === 'GI') {
    addMoveOrPromote({ x: x - 1, y: y + dir });
    addMoveOrPromote({ x, y: y + dir });
    addMoveOrPromote({ x: x + 1, y: y + dir });
    addMoveOrPromote({ x: x - 1, y: y - dir });
    addMoveOrPromote({ x: x + 1, y: y - dir });
  } else if (type === 'KI' || type === 'TO' || type === 'NY' || type === 'NK' || type === 'NG') {
    addMoveOrPromote({ x: x - 1, y: y + dir });
    addMoveOrPromote({ x, y: y + dir });
    addMoveOrPromote({ x: x + 1, y: y + dir });
    addMoveOrPromote({ x: x - 1, y });
    addMoveOrPromote({ x: x + 1, y });
    addMoveOrPromote({ x, y: y - dir });
  } else if (type === 'OU') {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        addMoveOrPromote({ x: x + dx, y: y + dy });
      }
    }
  } else if (type === 'KA') {
    addRayMoves(-1, -1);
    addRayMoves(1, -1);
    addRayMoves(-1, 1);
    addRayMoves(1, 1);
  } else if (type === 'UM') {
    addRayMoves(-1, -1);
    addRayMoves(1, -1);
    addRayMoves(-1, 1);
    addRayMoves(1, 1);
    addMoveOrPromote({ x: x - 1, y });
    addMoveOrPromote({ x: x + 1, y });
    addMoveOrPromote({ x, y: y - 1 });
    addMoveOrPromote({ x, y: y + 1 });
  } else if (type === 'HI') {
    addRayMoves(0, -1);
    addRayMoves(0, 1);
    addRayMoves(-1, 0);
    addRayMoves(1, 0);
  } else if (type === 'RY') {
    addRayMoves(0, -1);
    addRayMoves(0, 1);
    addRayMoves(-1, 0);
    addRayMoves(1, 0);
    addMoveOrPromote({ x: x - 1, y: y - 1 });
    addMoveOrPromote({ x: x + 1, y: y - 1 });
    addMoveOrPromote({ x: x - 1, y: y + 1 });
    addMoveOrPromote({ x: x + 1, y: y + 1 });
  }

  return moves;
};

// 持ち駒を打つ擬似合法手を生成
export const getDropPseudoMoves = (
  board: (Piece | null)[][],
  hands: [HandPieces, HandPieces],
  color: Color,
  filterPieceType?: BasePieceType
): Move[] => {
  const moves: Move[] = [];
  const playerHand = hands[color];

  const pieceTypesToDrop = filterPieceType ? [filterPieceType] : DROP_PIECE_ORDER;

  for (const pieceType of pieceTypesToDrop) {
    if ((playerHand[pieceType] || 0) <= 0) continue;

    // 二歩チェック用の筋情報キャッシュ
    const nifuFiles = new Set<number>();
    if (pieceType === 'FU') {
      for (let x = 0; x < 9; x++) {
        for (let y = 0; y < 9; y++) {
          const piece = board[y][x];
          if (piece && piece.color === color && piece.type === 'FU') {
            nifuFiles.add(x);
            break;
          }
        }
      }
    }

    for (let y = 0; y < 9; y++) {
      // 行き所のない段には打てない
      if (isDeadEnd(pieceType, y, color)) continue;

      for (let x = 0; x < 9; x++) {
        if (board[y][x] !== null) continue; // 空マスのみ

        // 二歩の禁止
        if (pieceType === 'FU' && nifuFiles.has(x)) continue;

        moves.push({
          from: null,
          to: { x, y },
          pieceType,
          color,
          isDrop: true,
          promote: false,
        });
      }
    }
  }

  return moves;
};

// 仮着手を適用した盤面・持ち駒を計算
export const applyMoveToBoardAndHands = (
  board: (Piece | null)[][],
  hands: [HandPieces, HandPieces],
  move: Move
): { newBoard: (Piece | null)[][]; newHands: [HandPieces, HandPieces] } => {
  const newBoard = cloneBoard(board);
  const newHands = cloneHands(hands);
  const { from, to, pieceType, color, promote, isDrop } = move;

  if (isDrop || from === null) {
    // 持ち駒を打つ
    const baseType = UNPROMOTED_MAP[pieceType];
    newHands[color][baseType]--;
    newBoard[to.y][to.x] = createPiece(baseType, color, false);
  } else {
    // 盤上の駒を移動
    const movingPiece = newBoard[from.y][from.x]!;
    const capturedPiece = newBoard[to.y][to.x];

    if (capturedPiece) {
      // 取った駒は生駒に戻して持ち駒に加える
      const baseCaptured = UNPROMOTED_MAP[capturedPiece.type];
      newHands[color][baseCaptured]++;
    }

    let finalType = movingPiece.type;
    let finalIsPromoted = movingPiece.isPromoted;

    if (promote) {
      const base = UNPROMOTED_MAP[movingPiece.type];
      finalType = PROMOTED_MAP[base] || movingPiece.type;
      finalIsPromoted = true;
    }

    newBoard[to.y][to.x] = {
      ...movingPiece,
      type: finalType,
      isPromoted: finalIsPromoted,
    };
    newBoard[from.y][from.x] = null;
  }

  return { newBoard, newHands };
};

// 相手に合法手が残っているかを判定（打ち歩詰め判定および詰み判定に使用）
// checkOnly: true の場合、合法手が1つでも見つかれば即 true を返す
export const hasAnyLegalMoves = (
  board: (Piece | null)[][],
  hands: [HandPieces, HandPieces],
  color: Color
): boolean => {
  // 1. 盤上の駒の移動
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (!piece || piece.color !== color) continue;

      const pseudoMoves = getPiecePseudoMoves(board, { x, y }, piece);
      for (const move of pseudoMoves) {
        const { newBoard } = applyMoveToBoardAndHands(board, hands, move);
        if (!isKingInCheck(newBoard, color)) {
          return true; // 自玉が王手されない手が存在
        }
      }
    }
  }

  // 2. 持ち駒を打つ手
  const dropMoves = getDropPseudoMoves(board, hands, color);
  for (const move of dropMoves) {
    const { newBoard } = applyMoveToBoardAndHands(board, hands, move);
    if (!isKingInCheck(newBoard, color)) {
      return true;
    }
  }

  return false;
};

// 厳密な合法手を全生成
export const generateLegalMoves = (
  board: (Piece | null)[][],
  hands: [HandPieces, HandPieces],
  color: Color,
  filterFromSquare?: Square | null,
  filterHandPiece?: BasePieceType | null,
  winCondition: WinCondition = 'capture_king'
): Move[] => {
  const legalMoves: Move[] = [];
  const opponentColor: Color = color === 0 ? 1 : 0;
  const fallbackMoves: Move[] = []; // 王を取るまでモード用のあがき手

  // 1. 盤上の駒
  if (!filterHandPiece) {
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (filterFromSquare && (filterFromSquare.x !== x || filterFromSquare.y !== y)) {
          continue;
        }

        const piece = board[y][x];
        if (!piece || piece.color !== color) continue;

        const pseudoMoves = getPiecePseudoMoves(board, { x, y }, piece);
        for (const move of pseudoMoves) {
          // 相手玉の捕獲手は無条件で合法（即座に勝利となる最重要着手）
          if (move.captured?.type === 'OU') {
            legalMoves.push(move);
            continue;
          }

          // 自玉を王手にさらす手は通常の合法手からは除外
          const { newBoard } = applyMoveToBoardAndHands(board, hands, move);
          if (!isKingInCheck(newBoard, color)) {
            legalMoves.push(move);
          } else if (winCondition === 'capture_king') {
            // 王を取るまでルール用のフォールバック手として保持
            fallbackMoves.push(move);
          }
        }
      }
    }
  }

  // 2. 持ち駒を打つ
  if (!filterFromSquare) {
    const dropMoves = getDropPseudoMoves(board, hands, color, filterHandPiece || undefined);
    for (const move of dropMoves) {
      const { newBoard, newHands } = applyMoveToBoardAndHands(board, hands, move);

      // 自玉を王手にさらす手は通常の合法手からは除外
      if (isKingInCheck(newBoard, color)) {
        if (winCondition === 'capture_king') {
          fallbackMoves.push(move);
        }
        continue;
      }

      // 打ち歩詰め判定: 歩を打って相手玉が詰む（相手に合法手がない）場合は反則！
      if (move.pieceType === 'FU') {
        const putsOpponentInCheck = isKingInCheck(newBoard, opponentColor);
        if (putsOpponentInCheck) {
          const opponentHasMoves = hasAnyLegalMoves(newBoard, newHands, opponentColor);
          if (!opponentHasMoves) {
            // 打ち歩詰めのため禁止
            continue;
          }
        }
      }

      legalMoves.push(move);
    }
  }

  // 王を取るまでルールで、通常の安全手が1つもない（伝統的詰み状態）場合:
  // 盤面をロックさせず、あがき手（王の移動や駒の移動）を可能にして相手に王を取らせる
  if (legalMoves.length === 0 && winCondition === 'capture_king' && fallbackMoves.length > 0) {
    // 王自体の移動手を最優先、なければ他の駒の移動手を返す
    const kingMoves = fallbackMoves.filter((m) => m.pieceType === 'OU');
    return kingMoves.length > 0 ? kingMoves : fallbackMoves;
  }

  return legalMoves;
};

// 盤面に着手を適用し、次のゲームステートを生成
export const makeMove = (
  state: GameState,
  move: Move,
  winCondition: WinCondition = state.winCondition ?? 'capture_king'
): GameState => {
  const { newBoard, newHands } = applyMoveToBoardAndHands(state.board, state.hands, move);
  const nextTurn: Color = state.turn === 0 ? 1 : 0;

  const opponentInCheck = isKingInCheck(newBoard, nextTurn);
  let kifuText = generateKifuText(move, state.history, opponentInCheck);

  const nextLegalMoves = generateLegalMoves(newBoard, newHands, nextTurn, null, null, winCondition);
  let status: 'playing' | 'checkmate' | 'resigned' = 'playing';
  let winner: Color | null = null;

  // 1. 王将（玉将）を捕獲した場合、即座に決着・勝利！
  if (move.captured?.type === 'OU') {
    status = 'checkmate';
    winner = move.color;
    kifuText += '（王取り）';
  } else if (winCondition === 'checkmate') {
    // 2. 伝統ルール（詰みで終了）の場合、合法手0手で即終了
    if (nextLegalMoves.length === 0) {
      status = 'checkmate';
      winner = state.turn; // 王手を掛けた側の勝ち
    }
  } else {
    // 3. 王を取るまでルールの場合、王が取られるまで対局継続
    // （万一、駒が全くなく王も動けない完全手詰まりの場合のみフェールセーフで終了）
    if (nextLegalMoves.length === 0) {
      status = 'checkmate';
      winner = state.turn;
    }
  }

  return {
    ...state,
    board: newBoard,
    hands: newHands,
    turn: nextTurn,
    history: [
      ...state.history,
      {
        move,
        kifuText,
        isCheck: opponentInCheck,
      },
    ],
    status,
    winner,
    isCheck: opponentInCheck,
    selectedSquare: null,
    selectedHandPiece: null,
    legalMoves: nextLegalMoves,
    lastMove: move,
    winCondition,
  };
};

// 初期ゲームステート生成
export const createInitialGameState = (winCondition: WinCondition = 'capture_king'): GameState => {
  const board = createInitialBoard();
  const hands: [HandPieces, HandPieces] = [
    { ...INITIAL_HANDS },
    { ...INITIAL_HANDS },
  ];
  const turn: Color = 0; // 先手からスタート
  const legalMoves = generateLegalMoves(board, hands, turn, null, null, winCondition);

  return {
    board,
    hands,
    turn,
    history: [],
    status: 'playing',
    winner: null,
    isCheck: false,
    selectedSquare: null,
    selectedHandPiece: null,
    legalMoves,
    lastMove: null,
    winCondition,
  };
};
