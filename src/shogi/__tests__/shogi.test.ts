import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  generateLegalMoves,
  makeMove,
  isKingInCheck,
  applyMoveToBoardAndHands,
} from '../logic';
import { chooseBestMoveAsync } from '../ai';
import { createPiece, INITIAL_HANDS } from '../constants';
import type { GameState, HandPieces, Piece } from '../types';

describe('Shogi Logic Engine', () => {
  it('initializes game state correctly with 30 legal moves for Sente', () => {
    const state = createInitialGameState();
    expect(state.turn).toBe(0);
    expect(state.history.length).toBe(0);
    expect(state.status).toBe('playing');
    expect(state.isCheck).toBe(false);

    // Initial legal moves for Sente:
    // 9 pawns move forward 1 = 9
    // 2 knights move 2 squares each = 4
    // Rook move: blocked
    // Bishop move: blocked
    // In total: 9 + 4 = 13 (or let's check exact count)
    // Wait, let's verify pawn moves: 9 files, 7七 to 7六 etc.
    // Knights at 8九 and 2九: can they move? 8九 knight jumps to 7七 or 9七, but 7七 and 9七 have pawns!
    // So knights are blocked by pawns on rank 6!
    // Wait, can bishops or rooks move? No, surrounded.
    // What about pawns? 9 pawns can each move 1 step forward (rank 6 -> rank 5).
    // What about other pieces?
    // Let's see what legalMoves length actually is:
    expect(state.legalMoves.length).toBe(30); // Let's check or test
  });

  it('correctly executes a move and updates turn, board, and kifu', () => {
    const state = createInitialGameState();
    // 7七歩 (x=2, y=6) to 7六歩 (x=2, y=5)
    const move = state.legalMoves.find(
      (m) => m.from?.x === 2 && m.from?.y === 6 && m.to.x === 2 && m.to.y === 5
    );
    expect(move).toBeDefined();

    const nextState = makeMove(state, move!);
    expect(nextState.turn).toBe(1); // Gote's turn
    expect(nextState.board[6][2]).toBeNull();
    expect(nextState.board[5][2]?.type).toBe('FU');
    expect(nextState.board[5][2]?.color).toBe(0);
    expect(nextState.history.length).toBe(1);
    expect(nextState.history[0].kifuText).toContain('７六歩');
  });

  it('handles piece capture and adds unpromoted piece to hand', () => {
    // Custom board: Sente Bishop at 8八 (x=1, y=7) captures Gote Bishop at 2二 (x=7, y=1)
    const board: (Piece | null)[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    board[8][4] = createPiece('OU', 0);
    board[0][4] = createPiece('OU', 1);

    // Sente Bishop
    board[7][1] = createPiece('KA', 0);
    // Gote Bishop
    board[1][7] = createPiece('KA', 1);

    const hands: [HandPieces, HandPieces] = [
      { ...INITIAL_HANDS },
      { ...INITIAL_HANDS },
    ];

    const legalMoves = generateLegalMoves(board, hands, 0);
    const captureMove = legalMoves.find(
      (m) => m.from?.x === 1 && m.from?.y === 7 && m.to.x === 7 && m.to.y === 1
    );
    expect(captureMove).toBeDefined();

    const dummyState: any = {
      board,
      hands,
      turn: 0,
      history: [],
      status: 'playing',
      winner: null,
      isCheck: false,
      selectedSquare: null,
      selectedHandPiece: null,
      legalMoves,
      lastMove: null,
    };

    const nextState = makeMove(dummyState, captureMove!);
    // Sente should have captured Bishop in hand
    expect(nextState.hands[0].KA).toBe(1);
    expect(nextState.board[1][7]?.color).toBe(0);
  });

  it('promotes promotable pieces and enforces forced promotion (行き所のない駒)', () => {
    const board: (Piece | null)[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    board[8][4] = createPiece('OU', 0);
    board[0][4] = createPiece('OU', 1);

    // Sente pawn at y=1 (2段目)
    board[1][2] = createPiece('FU', 0);

    const hands: [HandPieces, HandPieces] = [
      { ...INITIAL_HANDS },
      { ...INITIAL_HANDS },
    ];

    const legalMoves = generateLegalMoves(board, hands, 0);
    const movesToRank0 = legalMoves.filter((m) => m.from?.x === 2 && m.to.y === 0);

    // For a pawn moving to rank 0 (一段目), it MUST promote (promote === true only)
    expect(movesToRank0.length).toBe(1);
    expect(movesToRank0[0].promote).toBe(true);

    // Test knight forced promotion on rank 1
    board[2][2] = createPiece('KE', 0);
    const knightMoves = generateLegalMoves(board, hands, 0).filter(
      (m) => m.from?.x === 2 && m.from?.y === 2
    );
    // Knight jumping from y=2 reaches y=0, which MUST promote
    for (const km of knightMoves) {
      if (km.to.y === 0) {
        expect(km.promote).toBe(true);
      }
    }
  });

  it('strictly forbids Nifu (二歩)', () => {
    const board: (Piece | null)[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    board[8][4] = createPiece('OU', 0);
    board[0][4] = createPiece('OU', 1);

    // Sente has an unpromoted pawn on file x=2 (7筋) at y=6
    board[6][2] = createPiece('FU', 0);

    // Sente has a pawn in hand
    const hands: [HandPieces, HandPieces] = [
      { ...INITIAL_HANDS, FU: 1 },
      { ...INITIAL_HANDS },
    ];

    const legalMoves = generateLegalMoves(board, hands, 0);
    // Check all pawn drops
    const pawnDropsOnFile2 = legalMoves.filter(
      (m) => m.isDrop && m.pieceType === 'FU' && m.to.x === 2
    );

    // Dropping a pawn on file 2 should be completely forbidden (0 moves)
    expect(pawnDropsOnFile2.length).toBe(0);

    // But dropping a pawn on file 3 (where Sente has no pawn) should be allowed
    const pawnDropsOnFile3 = legalMoves.filter(
      (m) => m.isDrop && m.pieceType === 'FU' && m.to.x === 3
    );
    expect(pawnDropsOnFile3.length).toBeGreaterThan(0);
  });

  it('allows dropping a pawn on a file if the existing pawn is promoted (と金)', () => {
    const board: (Piece | null)[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    board[8][4] = createPiece('OU', 0);
    board[0][4] = createPiece('OU', 1);

    // Sente has a PROMOTED pawn (TO) on file 2
    board[3][2] = createPiece('TO', 0, true);

    const hands: [HandPieces, HandPieces] = [
      { ...INITIAL_HANDS, FU: 1 },
      { ...INITIAL_HANDS },
    ];

    const legalMoves = generateLegalMoves(board, hands, 0);
    const pawnDropsOnFile2 = legalMoves.filter(
      (m) => m.isDrop && m.pieceType === 'FU' && m.to.x === 2
    );
    // Allowed because existing pawn is promoted!
    expect(pawnDropsOnFile2.length).toBeGreaterThan(0);
  });

  it('strictly forbids moving king into check or leaving king in check (自殺手の禁止)', () => {
    const board: (Piece | null)[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    // Sente King at 5九 (x=4, y=8)
    board[8][4] = createPiece('OU', 0);

    // Gote Rook at 4一 (x=5, y=0), attacking the whole x=5 file
    board[0][5] = createPiece('HI', 1);
    board[0][0] = createPiece('OU', 1);

    const hands: [HandPieces, HandPieces] = [
      { ...INITIAL_HANDS },
      { ...INITIAL_HANDS },
    ];

    const legalMoves = generateLegalMoves(board, hands, 0);
    // Sente King cannot move to (x=5, y=8) or (x=5, y=7) because Rook attacks file 5!
    const illegalMovesToRookLine = legalMoves.filter((m) => m.to.x === 5);
    expect(illegalMovesToRookLine.length).toBe(0);
  });

  it('strictly forbids Uchifuzume (打ち歩詰め) while allowing moving pawn mate (突歩詰め)', () => {
    // Board setup for mate:
    // Gote King at 5一 (x=4, y=0) surrounded:
    // 4一 (x=5, y=0) wall: Gote Lance
    // 6一 (x=3, y=0) wall: Gote Lance
    // Sente Gold at 5三 (x=4, y=2) defending 5二
    // Sente Gold at 4三 (x=5, y=2) defending 5二
    const board: (Piece | null)[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    board[0][4] = createPiece('OU', 1); // 5一 Gote King
    board[0][5] = createPiece('KY', 1); // 4一
    board[0][3] = createPiece('KY', 1); // 6一
    board[1][5] = createPiece('KY', 1); // 4二
    board[1][3] = createPiece('KY', 1); // 6二

    // Sente King far away
    board[8][4] = createPiece('OU', 0);

    // Sente Gold defending 5二 (x=4, y=1)
    board[2][4] = createPiece('KI', 0); // 5三 金 (attacks 5二, 4二, 6二)

    // Sente has FU in hand
    const hands: [HandPieces, HandPieces] = [
      { ...INITIAL_HANDS, FU: 1 },
      { ...INITIAL_HANDS },
    ];

    // Dropping FU on 5二 (x=4, y=1) would check the Gote King at 5一.
    // Can Gote King escape?
    // 5一 king cannot move to 4一 (occupied), 6一 (occupied), 4二 (occupied), 6二 (occupied).
    // Can Gote King capture the dropped pawn on 5二?
    // No, because 5二 is protected by the Gold at 5三!
    // Does Gote have any pieces to interpose? No, adjacent.
    // So dropping FU at 5二 would be CHECKMATE!
    // By the Uchifuzume rule, dropping this pawn MUST be forbidden!
    const legalMoves = generateLegalMoves(board, hands, 0);
    const dropPawnMate = legalMoves.find(
      (m) => m.isDrop && m.pieceType === 'FU' && m.to.x === 4 && m.to.y === 1
    );
    expect(dropPawnMate).toBeUndefined(); // Must be filtered out as Uchifuzume!

    // But if Sente has a Gold in hand, dropping Gold on 5二 is LEGAL (頭金詰め is legal!)
    hands[0].KI = 1;
    const legalMovesWithGold = generateLegalMoves(board, hands, 0);
    const dropGoldMate = legalMovesWithGold.find(
      (m) => m.isDrop && m.pieceType === 'KI' && m.to.x === 4 && m.to.y === 1
    );
    expect(dropGoldMate).toBeDefined(); // Gold drop mate is completely legal!
  });

  it('correctly detects checkmate and ends game', () => {
    // Setup simple checkmate (頭金)
    const board: (Piece | null)[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    board[0][4] = createPiece('OU', 1); // Gote King 5一
    board[1][4] = createPiece('KI', 0); // Sente Gold 5二 (giving check)
    board[2][4] = createPiece('FU', 0); // Sente Pawn 5三 (protecting Gold)
    board[8][4] = createPiece('OU', 0); // Sente King 5九

    // Surrounding squares blocked or attacked:
    board[0][3] = createPiece('KY', 1); // 6一
    board[0][5] = createPiece('KY', 1); // 4一
    board[1][3] = createPiece('KY', 1); // 6二
    board[1][5] = createPiece('KY', 1); // 4二

    const hands: [HandPieces, HandPieces] = [
      { ...INITIAL_HANDS },
      { ...INITIAL_HANDS },
    ];

    expect(isKingInCheck(board, 1)).toBe(true);
    const goteMoves = generateLegalMoves(board, hands, 1, null, null, 'checkmate');
    expect(goteMoves.length).toBe(0); // 0 legal moves = Checkmate!
  });

  it('AI chooses a legal and sensible move asynchronously without errors', async () => {
    const state = createInitialGameState();
    // Execute ▲7六歩
    const senteMove = state.legalMoves.find(
      (m) => m.from?.x === 2 && m.from?.y === 6 && m.to.x === 2 && m.to.y === 5
    );
    expect(senteMove).toBeDefined();
    const afterSenteState = makeMove(state, senteMove!);

    // Let AI choose for Gote (turn: 1)
    const aiMove = await chooseBestMoveAsync(
      afterSenteState.board,
      afterSenteState.hands,
      1,
      'easy'
    );
    expect(aiMove).not.toBeNull();
    expect(aiMove?.color).toBe(1);

    // Ensure the chosen AI move is among legal moves
    const goteLegalMoves = generateLegalMoves(
      afterSenteState.board,
      afterSenteState.hands,
      1
    );
    const isLegal = goteLegalMoves.some(
      (m) =>
        m.to.x === aiMove?.to.x &&
        m.to.y === aiMove?.to.y &&
        m.from?.x === aiMove?.from?.x &&
        m.from?.y === aiMove?.from?.y
    );
    expect(isLegal).toBe(true);

    // Apply AI move
    const afterAiState = makeMove(afterSenteState, aiMove!);
    expect(afterAiState.turn).toBe(0); // Returned to Sente
    expect(afterAiState.history.length).toBe(2);
  });

  it('correctly distinguishes moves when multiple pieces (e.g., Rook and Silver) can move to the same destination', () => {
    // Setup a board where Rook at 2八 and Silver at 7九 can BOTH move to 8八
    const board: (Piece | null)[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));

    // Sente King
    board[8][4] = createPiece('OU', 0); // 5九
    // Gote King
    board[0][4] = createPiece('OU', 1); // 5一

    // Sente Silver at 7九 (x=2, y=8)
    board[8][2] = createPiece('GI', 0);
    // Sente Rook at 2八 (x=7, y=7)
    board[7][7] = createPiece('HI', 0);
    // Note: 8八 (x=1, y=7) is empty.
    // 3八〜7八 are empty so Rook at 2八 (x=7, y=7) can slide horizontally to 8八 (x=1, y=7).
    // Silver at 7九 (x=2, y=8) can step diagonally to 8八 (x=1, y=7).

    const hands: [HandPieces, HandPieces] = [
      { ...INITIAL_HANDS },
      { ...INITIAL_HANDS },
    ];

    const legalMoves = generateLegalMoves(board, hands, 0);

    // Both moves should be legal
    const silverMovesTo88 = legalMoves.filter(
      (m) => m.from?.x === 2 && m.from?.y === 8 && m.to.x === 1 && m.to.y === 7
    );
    const rookMovesTo88 = legalMoves.filter(
      (m) => m.from?.x === 7 && m.from?.y === 7 && m.to.x === 1 && m.to.y === 7
    );

    expect(silverMovesTo88.length).toBe(1);
    expect(rookMovesTo88.length).toBe(1);

    // Selecting Silver should ONLY yield the Silver move
    const selectedSquare = { x: 2, y: 8 }; // 7九 銀
    const targetSquare = { x: 1, y: 7 }; // 8八

    const matchingSilverMove = legalMoves.filter(
      (m) =>
        m.to.x === targetSquare.x &&
        m.to.y === targetSquare.y &&
        m.from !== null &&
        m.from.x === selectedSquare.x &&
        m.from.y === selectedSquare.y
    );

    expect(matchingSilverMove.length).toBe(1);
    expect(matchingSilverMove[0].pieceType).toBe('GI');
    expect(matchingSilverMove[0].from).toEqual({ x: 2, y: 8 });
    expect(matchingSilverMove[0].to).toEqual({ x: 1, y: 7 });

    // Apply the Silver move
    const nextState = applyMoveToBoardAndHands(board, hands, matchingSilverMove[0]);
    // Silver should now be at 8八
    expect(nextState.newBoard[7][1]?.type).toBe('GI');
    // 7九 should now be empty
    expect(nextState.newBoard[8][2]).toBeNull();
    // Rook should STILL be at 2八!
    expect(nextState.newBoard[7][7]?.type).toBe('HI');
  });

  it('correctly generates moves for Promoted Rook (RY / 竜王) and Promoted Bishop (UM / 龍馬)', () => {
    // Test Promoted Rook (RY / 竜王): vertical/horizontal rays + 1 diagonal step
    const boardRY: (Piece | null)[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    boardRY[4][4] = createPiece('RY', 0, true); // 5五 竜
    boardRY[8][4] = createPiece('OU', 0); // 5九 玉
    boardRY[0][4] = createPiece('OU', 1); // 5一 玉 (Gote)

    const hands: [HandPieces, HandPieces] = [
      { ...INITIAL_HANDS },
      { ...INITIAL_HANDS },
    ];

    const movesRY = generateLegalMoves(boardRY, hands, 0).filter(
      (m) => m.from?.x === 4 && m.from?.y === 4
    );

    // Diagonal 1-steps around 5五: (3,3), (5,3), (3,5), (5,5)
    expect(movesRY.some((m) => m.to.x === 3 && m.to.y === 3)).toBe(true);
    expect(movesRY.some((m) => m.to.x === 5 && m.to.y === 3)).toBe(true);
    expect(movesRY.some((m) => m.to.x === 3 && m.to.y === 5)).toBe(true);
    expect(movesRY.some((m) => m.to.x === 5 && m.to.y === 5)).toBe(true);

    // Vertical / Horizontal rays:
    // Can move along row y=4 all the way to x=0 and x=8
    expect(movesRY.some((m) => m.to.x === 0 && m.to.y === 4)).toBe(true);
    expect(movesRY.some((m) => m.to.x === 8 && m.to.y === 4)).toBe(true);
    // Can capture Gote King at (4, 0)
    expect(movesRY.some((m) => m.to.x === 4 && m.to.y === 0)).toBe(true);
    // Blocked by friendly King at (4, 8), so can move to (4, 5), (4, 6), (4, 7), but NOT (4, 8)
    expect(movesRY.some((m) => m.to.x === 4 && m.to.y === 7)).toBe(true);
    expect(movesRY.some((m) => m.to.x === 4 && m.to.y === 8)).toBe(false);

    // Test Promoted Bishop (UM / 龍馬): diagonal rays + 1 orthogonal step
    const boardUM: (Piece | null)[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    boardUM[4][4] = createPiece('UM', 0, true); // 5五 馬
    boardUM[8][8] = createPiece('OU', 0); // 1九 玉
    boardUM[0][0] = createPiece('OU', 1); // 9一 玉 (Gote)

    const movesUM = generateLegalMoves(boardUM, hands, 0).filter(
      (m) => m.from?.x === 4 && m.from?.y === 4
    );

    // Orthogonal 1-steps around 5五: (4,3), (4,5), (3,4), (5,4)
    expect(movesUM.some((m) => m.to.x === 4 && m.to.y === 3)).toBe(true);
    expect(movesUM.some((m) => m.to.x === 4 && m.to.y === 5)).toBe(true);
    expect(movesUM.some((m) => m.to.x === 3 && m.to.y === 4)).toBe(true);
    expect(movesUM.some((m) => m.to.x === 5 && m.to.y === 4)).toBe(true);

    // Diagonal rays:
    // Can capture Gote King at (0, 0)
    expect(movesUM.some((m) => m.to.x === 0 && m.to.y === 0)).toBe(true);
    // Blocked by friendly King at (8, 8)
    expect(movesUM.some((m) => m.to.x === 7 && m.to.y === 7)).toBe(true);
    expect(movesUM.some((m) => m.to.x === 8 && m.to.y === 8)).toBe(false);
  });

  it('handles King capture mode: continues game when checkmated until the King is physically captured', () => {
    // Setup a checkmate position (頭金: Gote King at 5一, Sente Gold at 5二 supported by Sente King)
    const board: (Piece | null)[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    board[0][4] = createPiece('OU', 1); // 5一 玉 (Gote)
    board[1][4] = createPiece('KI', 0); // 5二 金 (Sente, giving check)
    board[2][4] = createPiece('OU', 0); // 5三 玉 (Sente, protecting 5二 金)

    const hands: [HandPieces, HandPieces] = [
      { ...INITIAL_HANDS },
      { ...INITIAL_HANDS },
    ];

    // Under traditional checkmate rule:
    const movesCheckmateMode = generateLegalMoves(board, hands, 1, null, null, 'checkmate');
    expect(movesCheckmateMode.length).toBe(0); // 詰み (no moves)

    // Under 'capture_king' rule:
    // Gote has no safe moves, but is given fallback desperation moves so the game does not freeze
    const movesCaptureKingMode = generateLegalMoves(board, hands, 1, null, null, 'capture_king');
    expect(movesCaptureKingMode.length).toBeGreaterThan(0);

    // Gote makes a desperation move (e.g. stepping King or passing)
    const goteDesperationMove = movesCaptureKingMode[0];
    const dummyState: GameState = {
      board,
      hands,
      turn: 1,
      history: [],
      status: 'playing',
      winner: null,
      isCheck: true,
      selectedSquare: null,
      selectedHandPiece: null,
      legalMoves: movesCaptureKingMode,
      lastMove: null,
      winCondition: 'capture_king',
    };

    const afterGoteState = makeMove(dummyState, goteDesperationMove, 'capture_king');
    // Game is STILL playing because King has not been captured yet!
    expect(afterGoteState.status).toBe('playing');
    expect(afterGoteState.turn).toBe(0); // Sente's turn now

    // Sente can now capture Gote's King!
    const senteLegalMoves = generateLegalMoves(afterGoteState.board, afterGoteState.hands, 0, null, null, 'capture_king');
    const kingCaptureMove = senteLegalMoves.find((m) => m.captured?.type === 'OU');
    expect(kingCaptureMove).toBeDefined();

    // Sente captures the King
    const finalState = makeMove(afterGoteState, kingCaptureMove!, 'capture_king');
    expect(finalState.status).toBe('checkmate');
    expect(finalState.winner).toBe(0); // Sente won
    expect(finalState.hands[0].OU).toBe(1); // Sente captured Gote's King into hand!
    expect(finalState.history[finalState.history.length - 1].kifuText).toContain('（王取り）');
  });
});

