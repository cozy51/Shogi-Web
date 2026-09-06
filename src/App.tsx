import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  BasePieceType,
  Color,
  CpuDifficulty,
  GameMode,
  GameState,
  Move,
  Square,
  WinCondition,
} from './shogi/types';
import {
  createInitialGameState,
  makeMove,
  generateLegalMoves,
} from './shogi/logic';
import { PIECE_DETAILS } from './shogi/constants';
import { chooseBestMoveAsync, type ThinkingSpeed } from './shogi/ai';
import { soundManager } from './shogi/sound';
import {
  loadGameFromStorage,
  saveGameToStorage,
} from './shogi/storage';
import { ShogiBoard } from './components/ShogiBoard';
import { ShogiPiece } from './components/ShogiPiece';
import { Komadai } from './components/Komadai';
import { ControlPanel } from './components/ControlPanel';
import { GameStatus } from './components/GameStatus';
import { KifuHistory } from './components/KifuHistory';
import { PromotionModal } from './components/PromotionModal';
import { RulesModal } from './components/RulesModal';
import { GameOverModal } from './components/GameOverModal';
import { TitleScreen } from './components/TitleScreen';
import {
  loadGameStats,
  recordGameResult,
  type GameStats,
} from './shogi/stats';
import './App.css';

// 起動時にローカルストレージから保存済みデータを取得
const initialPersisted = loadGameFromStorage();
const initialWinCondition: WinCondition =
  initialPersisted?.settings?.winCondition ?? 'capture_king';

export const App: React.FC = () => {
  const [winCondition, setWinCondition] = useState<WinCondition>(initialWinCondition);

  const [gameState, setGameState] = useState<GameState>(() => {
    if (initialPersisted?.gameState) {
      const gs = initialPersisted.gameState;
      return {
        board: gs.board,
        hands: gs.hands,
        turn: gs.turn,
        status: gs.status,
        winner: gs.winner,
        isCheck: gs.isCheck,
        lastMove: gs.lastMove,
        history: gs.history,
        selectedSquare: null,
        selectedHandPiece: null,
        legalMoves: generateLegalMoves(gs.board, gs.hands, gs.turn, null, null, initialWinCondition),
        winCondition: initialWinCondition,
      };
    }
    return createInitialGameState(initialWinCondition);
  });

  const [historyStack, setHistoryStack] = useState<GameState[]>(() => {
    if (initialPersisted?.historyStack && initialPersisted.historyStack.length > 0) {
      // 連続する重複データを確実に除外して復元
      const unique = initialPersisted.historyStack.filter(
        (s, idx, arr) => idx === 0 || s.history.length !== arr[idx - 1].history.length
      );
      return unique.map((s) => ({
        board: s.board,
        hands: s.hands,
        turn: s.turn,
        status: s.status,
        winner: s.winner,
        isCheck: s.isCheck,
        lastMove: s.lastMove,
        history: s.history,
        selectedSquare: null,
        selectedHandPiece: null,
        legalMoves: generateLegalMoves(s.board, s.hands, s.turn, null, null, initialWinCondition),
        winCondition: initialWinCondition,
      }));
    }
    return [];
  });

  const [mode, setMode] = useState<GameMode>(
    () => initialPersisted?.settings?.mode ?? 'human_vs_cpu_sente'
  );
  const [difficulty, setDifficulty] = useState<CpuDifficulty>(
    () => initialPersisted?.settings?.difficulty ?? 'normal'
  );
  const [thinkingSpeed, setThinkingSpeed] = useState<ThinkingSpeed>(
    () => initialPersisted?.settings?.thinkingSpeed ?? 'slow'
  );
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const enabled = initialPersisted?.settings?.soundEnabled ?? true;
    soundManager.enabled = enabled;
    return enabled;
  });
  const [boardScale, setBoardScale] = useState<'medium' | 'large' | 'huge'>(
    () => initialPersisted?.settings?.boardScale ?? 'large'
  );
  const [squareRatio, setSquareRatio] = useState<'square' | 'traditional'>(
    () => initialPersisted?.settings?.squareRatio ?? 'square'
  );
  const [pieceFontMode, setPieceFontMode] = useState<'two_char' | 'single_char'>(
    () => initialPersisted?.settings?.pieceFontMode ?? 'two_char'
  );
  const [lastMoveColor, setLastMoveColor] = useState<'blue' | 'green'>(
    () => initialPersisted?.settings?.lastMoveColor ?? 'blue'
  );
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [pendingPromotionMove, setPendingPromotionMove] = useState<Move | null>(null);

  // 通算戦績および終局モーダル状態
  const [stats, setStats] = useState<GameStats>(() => loadGameStats());
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState<boolean>(false);
  const [screenMode, setScreenMode] = useState<'title' | 'game'>('title');
  const hasRecordedGameOverRef = useRef<boolean>(
    initialPersisted?.gameState?.status !== 'playing'
  );

  // CPU思考のキャンセルトークン
  const aiCancelRef = useRef<number>(0);

  // 人間の勝利判定
  const isHumanVictory = useCallback(
    (winColor: Color | null): boolean => {
      if (winColor === null) return false;
      if (mode === 'human_vs_cpu_sente') return winColor === 0;
      if (mode === 'human_vs_cpu_gote') return winColor === 1;
      return false;
    },
    [mode]
  );

  // CPUの手番かどうかを判定
  const isCpuTurn = useCallback(
    (turn: Color): boolean => {
      if (mode === 'human_vs_cpu_sente') return turn === 1; // 後手がCPU
      if (mode === 'human_vs_cpu_gote') return turn === 0; // 先手がCPU
      return false; // 2人対戦
    },
    [mode]
  );

  // 着手実行ハンドラ
  const executeMove = useCallback(
    (move: Move) => {
      setGameState((prevState) => {
        const nextState = makeMove(prevState, move, winCondition);

        // 着手履歴スタックへの記録（重複登録防止ガード付き）
        setHistoryStack((prevStack) => {
          if (
            prevStack.length > 0 &&
            prevStack[prevStack.length - 1].history.length === prevState.history.length
          ) {
            return prevStack;
          }
          return [...prevStack, prevState];
        });

        // 着手音の再生
        if (nextState.isCheck) {
          soundManager.playCheckSound();
        } else {
          soundManager.playMoveSound();
        }

        return nextState;
      });
      setPendingPromotionMove(null);
    },
    [winCondition]
  );

  // CPUの思考と着手ループ
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    if (isCpuTurn(gameState.turn)) {
      setIsAiThinking(true);
      const currentToken = ++aiCancelRef.current;

      chooseBestMoveAsync(
        gameState.board,
        gameState.hands,
        gameState.turn,
        difficulty,
        thinkingSpeed,
        winCondition
      )
        .then((bestMove) => {
          // キャンセルされていなければ着手
          if (currentToken === aiCancelRef.current && bestMove) {
            executeMove(bestMove);
          }
        })
        .finally(() => {
          if (currentToken === aiCancelRef.current) {
            setIsAiThinking(false);
          }
        });
    } else {
      setIsAiThinking(false);
    }
  }, [gameState, isCpuTurn, difficulty, thinkingSpeed, winCondition, executeMove]);

  // 終局検知（勝利祝賀演出・戦績自動記録・モーダル表示）
  useEffect(() => {
    if (gameState.status === 'playing') {
      hasRecordedGameOverRef.current = false;
      return;
    }

    if (!hasRecordedGameOverRef.current) {
      hasRecordedGameOverRef.current = true;
      const isVic = isHumanVictory(gameState.winner);

      // 祝祭ファンファーレまたは敗北チャイムの再生
      if (isVic) {
        soundManager.playVictorySound();
      } else if (mode !== 'human_vs_human') {
        soundManager.playDefeatSound();
      }

      // 戦績記録とステート更新
      const result: 'win' | 'lose' | 'draw' = isVic
        ? 'win'
        : mode === 'human_vs_human'
        ? 'draw'
        : 'lose';
      const reason = gameState.status === 'checkmate' ? 'checkmate' : 'resigned';
      const lastMoveText =
        gameState.history.length > 0
          ? gameState.history[gameState.history.length - 1].kifuText
          : '';

      const updatedStats = recordGameResult(
        result,
        reason,
        mode,
        gameState.history.length,
        lastMoveText,
        mode !== 'human_vs_human' ? difficulty : undefined
      );

      setStats(updatedStats);
      setIsGameOverModalOpen(true);
    }
  }, [gameState.status, gameState.winner, gameState.history, mode, difficulty, isHumanVictory]);

  // マスクリック時のハンドラ
  const handleSquareClick = (square: Square) => {
    if (gameState.status !== 'playing') return;
    if (isCpuTurn(gameState.turn)) return;
    if (isAiThinking) return;

    const { x, y } = square;
    const clickedPiece = gameState.board[y][x];

    // 1. 既に駒または持ち駒が選択されている場合の処理
    if (gameState.selectedSquare || gameState.selectedHandPiece) {
      // 選択中の駒または持ち駒の手の中から、クリックしたマスへ移動する合法手を検索
      const matchingMoves = gameState.legalMoves.filter((m) => {
        if (m.to.x !== x || m.to.y !== y) return false;
        if (gameState.selectedSquare) {
          return (
            m.from !== null &&
            m.from.x === gameState.selectedSquare.x &&
            m.from.y === gameState.selectedSquare.y
          );
        }
        if (gameState.selectedHandPiece) {
          return m.isDrop && m.pieceType === gameState.selectedHandPiece;
        }
        return false;
      });

      if (matchingMoves.length > 0) {
        // 成る手と成らない手の両方が選べる場合（成り選択モーダルを表示）
        const promoteMove = matchingMoves.find((m) => m.promote === true);
        const unpromoteMove = matchingMoves.find((m) => m.promote === false);

        if (promoteMove && unpromoteMove) {
          setPendingPromotionMove(promoteMove);
          return;
        }

        // それ以外（強制成り、または通常移動、または打ち）
        executeMove(matchingMoves[0]);
        return;
      }

      // 自分の他の駒をクリックした場合は、その駒へ選択を切り替え（同じ駒なら選択解除）
      if (clickedPiece && clickedPiece.color === gameState.turn) {
        if (
          gameState.selectedSquare &&
          gameState.selectedSquare.x === x &&
          gameState.selectedSquare.y === y
        ) {
          setGameState((prev) => ({
            ...prev,
            selectedSquare: null,
            selectedHandPiece: null,
          }));
          return;
        }

        setGameState((prev) => ({
          ...prev,
          selectedSquare: square,
          selectedHandPiece: null,
        }));
        return;
      }

      // 合法手でもなく自分の駒でもない場合は選択解除
      setGameState((prev) => ({
        ...prev,
        selectedSquare: null,
        selectedHandPiece: null,
      }));
      return;
    }

    // 2. 何も選択されていない状態で、手番側の駒をクリックした場合
    if (clickedPiece && clickedPiece.color === gameState.turn) {
      setGameState((prev) => ({
        ...prev,
        selectedSquare: square,
        selectedHandPiece: null,
      }));
    }
  };

  // 持ち駒クリック時のハンドラ
  const handleSelectHandPiece = (pieceType: BasePieceType, color: Color) => {
    if (gameState.status !== 'playing') return;
    if (isCpuTurn(gameState.turn)) return;
    if (isAiThinking) return;
    if (color !== gameState.turn) return;

    if (gameState.selectedHandPiece === pieceType) {
      // 再度クリックで選択解除
      setGameState((prev) => ({ ...prev, selectedHandPiece: null }));
    } else {
      setGameState((prev) => ({
        ...prev,
        selectedHandPiece: pieceType,
        selectedSquare: null,
      }));
    }
  };

  // 成り選択ダイアログの決定ハンドラ
  const handlePromotionChoice = (promote: boolean) => {
    if (!pendingPromotionMove) return;

    const move = gameState.legalMoves.find(
      (m) =>
        m.from?.x === pendingPromotionMove.from?.x &&
        m.from?.y === pendingPromotionMove.from?.y &&
        m.to.x === pendingPromotionMove.to.x &&
        m.to.y === pendingPromotionMove.to.y &&
        m.promote === promote
    );

    if (move) {
      executeMove(move);
    }
  };

  // 「待った」ハンドラ: 2手（相手の着手＋自分の着手）戻して直前の手番へ復帰
  const handleUndo = () => {
    if (historyStack.length === 0 || isAiThinking) return;

    aiCancelRef.current++;
    setIsAiThinking(false);
    setPendingPromotionMove(null);

    // 2手（相手の着手＋自分の着手）戻して、直前の自分の手番へ確実に復帰
    // historyStack を末尾から遡り、現在のプレイヤーと同じ手番の直近の局面を探す
    let targetIndex = -1;
    for (let i = historyStack.length - 2; i >= 0; i--) {
      if (historyStack[i].turn === gameState.turn) {
        targetIndex = i;
        break;
      }
    }

    // 見つからない場合（手数が1手のみの場合など）は、2手前か先頭の初期局面へ
    if (targetIndex === -1) {
      targetIndex = Math.max(0, historyStack.length - 2);
    }

    const targetState = historyStack[targetIndex];
    setHistoryStack((prev) => prev.slice(0, targetIndex));
    hasRecordedGameOverRef.current = false;
    setIsGameOverModalOpen(false);
    setGameState({
      ...targetState,
      status: 'playing',
      winner: null,
      selectedSquare: null,
      selectedHandPiece: null,
      legalMoves: generateLegalMoves(targetState.board, targetState.hands, targetState.turn, null, null, winCondition),
      winCondition,
    });
  };

  // 「最初から」ハンドラ
  const handleReset = () => {
    if (isAiThinking) {
      aiCancelRef.current++;
      setIsAiThinking(false);
    }
    hasRecordedGameOverRef.current = false;
    setIsGameOverModalOpen(false);
    setPendingPromotionMove(null);
    const initial = createInitialGameState(winCondition);
    setGameState(initial);
    setHistoryStack([]);
    saveGameToStorage(initial, [], {
      mode,
      difficulty,
      thinkingSpeed,
      boardScale,
      squareRatio,
      pieceFontMode,
      lastMoveColor,
      soundEnabled,
      winCondition,
    });
  };

  // 勝利時のステップアップ（難易度を上げて挑戦）
  const handleLevelUp = () => {
    const nextDiff: CpuDifficulty | null =
      difficulty === 'easy' ? 'normal' : difficulty === 'normal' ? 'hard' : null;
    if (nextDiff) {
      setDifficulty(nextDiff);
    }
    handleReset();
  };

  // 「投了」ハンドラ
  const handleResign = () => {
    if (gameState.status !== 'playing' || isAiThinking) return;

    const resignedColor = gameState.turn;
    const winnerColor: Color = resignedColor === 0 ? 1 : 0;

    setGameState((prev) => ({
      ...prev,
      status: 'resigned',
      winner: winnerColor,
      selectedSquare: null,
      selectedHandPiece: null,
    }));
  };

  // タイトル画面へ戻るハンドラ
  const handleReturnToTitle = useCallback(() => {
    if (isAiThinking) {
      aiCancelRef.current++;
      setIsAiThinking(false);
    }
    setIsGameOverModalOpen(false);
    setPendingPromotionMove(null);
    setScreenMode('title');
    soundManager.playTitleSound();
  }, [isAiThinking]);

  // 新規対局開始ハンドラ（タイトル画面から）
  const handleStartNewGameFromTitle = useCallback(() => {
    handleReset();
    setScreenMode('game');
  }, [handleReset]);

  // 中断対局再開ハンドラ（タイトル画面から）
  const handleResumeGameFromTitle = useCallback(() => {
    setScreenMode('game');
  }, []);

  // 決着条件変更ハンドラ
  const handleWinConditionChange = (newWinCondition: WinCondition) => {
    setWinCondition(newWinCondition);
    setGameState((prev) => ({
      ...prev,
      winCondition: newWinCondition,
      legalMoves: generateLegalMoves(prev.board, prev.hands, prev.turn, null, null, newWinCondition),
    }));
  };

  // 効果音トグル
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.enabled = next;
  };

  // 対戦モード変更
  const handleModeChange = (newMode: GameMode) => {
    if (isAiThinking) {
      aiCancelRef.current++;
      setIsAiThinking(false);
    }
    hasRecordedGameOverRef.current = false;
    setIsGameOverModalOpen(false);
    setMode(newMode);
    setPendingPromotionMove(null);
    const initial = createInitialGameState(winCondition);
    setGameState(initial);
    setHistoryStack([]);
    saveGameToStorage(initial, [], {
      mode: newMode,
      difficulty,
      thinkingSpeed,
      boardScale,
      squareRatio,
      pieceFontMode,
      lastMoveColor,
      soundEnabled,
      winCondition,
    });
  };

  // 対局状態および各種設定の自動保存（ブラウザ更新・再訪時の完全復元用）
  useEffect(() => {
    saveGameToStorage(gameState, historyStack, {
      mode,
      difficulty,
      thinkingSpeed,
      boardScale,
      squareRatio,
      pieceFontMode,
      lastMoveColor,
      soundEnabled,
      winCondition,
    });
  }, [
    gameState,
    historyStack,
    mode,
    difficulty,
    thinkingSpeed,
    boardScale,
    squareRatio,
    pieceFontMode,
    lastMoveColor,
    soundEnabled,
    winCondition,
  ]);

  // 現在選択中の駒または持ち駒に対する合法手のみを抽出
  const currentFilteredMoves = gameState.legalMoves.filter((m) => {
    if (gameState.selectedSquare) {
      return (
        m.from !== null &&
        m.from.x === gameState.selectedSquare.x &&
        m.from.y === gameState.selectedSquare.y
      );
    }
    if (gameState.selectedHandPiece) {
      return m.isDrop && m.pieceType === gameState.selectedHandPiece;
    }
    return false;
  });

  // 現在選択中の駒または持ち駒の詳細情報（見やすい文字・ガイドバー用）
  const selectedPieceInfo = React.useMemo(() => {
    if (gameState.selectedSquare) {
      const p = gameState.board[gameState.selectedSquare.y][gameState.selectedSquare.x];
      if (p) {
        const rankChars = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
        return {
          type: p.type,
          color: p.color,
          isPromoted: p.isPromoted,
          detail: PIECE_DETAILS[p.type],
          isHand: false,
          count: undefined,
          positionText: `${9 - gameState.selectedSquare.x}筋 ${rankChars[gameState.selectedSquare.y]}の段`,
        };
      }
    }
    if (gameState.selectedHandPiece) {
      const pType = gameState.selectedHandPiece;
      return {
        type: pType,
        color: gameState.turn,
        isPromoted: false,
        detail: PIECE_DETAILS[pType],
        isHand: true,
        count: gameState.hands[gameState.turn][pType],
        positionText: `${gameState.turn === 0 ? '先手' : '後手'}の持ち駒`,
      };
    }
    return null;
  }, [gameState.selectedSquare, gameState.selectedHandPiece, gameState.board, gameState.hands, gameState.turn]);

  if (screenMode === 'title') {
    return (
      <div className={`shogi-app-container title-view-mode board-size-${boardScale} ratio-${squareRatio} last-move-${lastMoveColor}`}>
        <TitleScreen
          onStartNewGame={handleStartNewGameFromTitle}
          onResumeGame={handleResumeGameFromTitle}
          hasSavedGame={gameState.status === 'playing' && gameState.history.length > 0}
          savedGameMoveCount={gameState.history.length}
          mode={mode}
          onModeChange={handleModeChange}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          winCondition={winCondition}
          onWinConditionChange={handleWinConditionChange}
          thinkingSpeed={thinkingSpeed}
          onThinkingSpeedChange={setThinkingSpeed}
          boardScale={boardScale}
          onBoardScaleChange={setBoardScale}
          squareRatio={squareRatio}
          onSquareRatioChange={setSquareRatio}
          pieceFontMode={pieceFontMode}
          onPieceFontModeChange={setPieceFontMode}
          lastMoveColor={lastMoveColor}
          onLastMoveColorChange={setLastMoveColor}
          stats={stats}
          onOpenRules={() => setIsRulesOpen(true)}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />
        {/* ルール・遊び方モーダル */}
        <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      </div>
    );
  }

  return (
    <div className={`shogi-app-container board-size-${boardScale} ratio-${squareRatio} last-move-${lastMoveColor}`}>
      {/* ヘッダー */}
      <header className="shogi-app-header">
        <div className="header-main-row">
          <div className="header-title-wrap">
            <h1 className="header-app-title">本格和風 将棋</h1>
            <span className="header-badge">React &amp; Web Worker AI</span>
          </div>
          <button
            type="button"
            className="header-return-title-btn"
            onClick={handleReturnToTitle}
            title="対局を終了または中断してタイトル画面に戻る"
          >
            <span className="btn-icon">⛩️</span>
            <span>タイトルへ</span>
          </button>
        </div>
        <p className="header-subtitle">
          木目調の盤面で楽しむブラウザ将棋（CPU対戦・2人対戦対応）
        </p>
      </header>

      {/* メインレイアウト */}
      <main className="shogi-main-content">
        {/* ゲームステータス表示 */}
        <GameStatus
          turn={gameState.turn}
          moveCount={gameState.history.length}
          status={gameState.status}
          winner={gameState.winner}
          isCheck={gameState.isCheck}
          isAiThinking={isAiThinking}
          mode={mode}
          lastMoveRecord={gameState.history.length > 0 ? gameState.history[gameState.history.length - 1] : null}
          isVictory={isHumanVictory(gameState.winner)}
          onOpenGameOverModal={() => setIsGameOverModalOpen(true)}
        />

        {/* コントロールパネル */}
        <ControlPanel
          mode={mode}
          onModeChange={handleModeChange}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          winCondition={winCondition}
          onWinConditionChange={handleWinConditionChange}
          thinkingSpeed={thinkingSpeed}
          onThinkingSpeedChange={setThinkingSpeed}
          onUndo={handleUndo}
          canUndo={historyStack.length > 0}
          onReset={handleReset}
          onResign={handleResign}
          onReturnToTitle={handleReturnToTitle}
          isGameOver={gameState.status !== 'playing'}
          isAiThinking={isAiThinking}
          boardScale={boardScale}
          onBoardScaleChange={setBoardScale}
          squareRatio={squareRatio}
          onSquareRatioChange={setSquareRatio}
          pieceFontMode={pieceFontMode}
          onPieceFontModeChange={setPieceFontMode}
          lastMoveColor={lastMoveColor}
          onLastMoveColorChange={setLastMoveColor}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onOpenRules={() => setIsRulesOpen(true)}
        />

        {/* 将棋盤・駒台エリア */}
        <div className="shogi-game-stage">
          {/* 後手 駒台（左側または上側） */}
          <div className="komadai-wrapper gote-komadai">
            <Komadai
              color={1}
              hand={gameState.hands[1]}
              title={
                mode === 'human_vs_cpu_sente'
                  ? 'CPU（後手）'
                  : mode === 'human_vs_cpu_gote'
                  ? 'あなた（後手）'
                  : '後手'
              }
              isCurrentTurn={gameState.turn === 1}
              isAiThinking={isAiThinking}
              isCpu={isCpuTurn(1)}
              pieceFontMode={pieceFontMode}
              selectedPieceType={gameState.turn === 1 ? gameState.selectedHandPiece : null}
              onSelectPiece={(p) => handleSelectHandPiece(p, 1)}
              disabled={isCpuTurn(1) || isAiThinking}
            />
          </div>

          {/* 将棋盤 (9×9) */}
          <div className="board-center-area">
            {/* 選択駒・大文字解説インスペクターバー */}
            <div
              className={`selected-piece-inspector ${
                selectedPieceInfo ? 'inspector-active' : 'inspector-idle'
              }`}
              aria-live="polite"
            >
              {selectedPieceInfo ? (
                <div className="inspector-content">
                  <div className="inspector-piece-preview">
                    <ShogiPiece
                      type={selectedPieceInfo.type}
                      color={selectedPieceInfo.color}
                      isPromoted={selectedPieceInfo.isPromoted}
                      inverted={selectedPieceInfo.color === 1}
                      size={44}
                      pieceFontMode={pieceFontMode}
                    />
                  </div>
                  <div className="inspector-info">
                    <div className="inspector-header">
                      <span
                        className={`inspector-pill ${
                          selectedPieceInfo.color === 0 ? 'pill-sente' : 'pill-gote'
                        }`}
                      >
                        {selectedPieceInfo.color === 0 ? '☗ 先手' : '☖ 後手'}
                      </span>
                      <span className="inspector-title">
                        {selectedPieceInfo.type === 'OU'
                          ? selectedPieceInfo.color === 1
                            ? '王将'
                            : '玉将'
                          : selectedPieceInfo.detail.fullName}
                      </span>
                      {selectedPieceInfo.detail.kana && (
                        <span className="inspector-kana">
                          （{selectedPieceInfo.detail.kana}）
                        </span>
                      )}
                      <span className="inspector-pos-badge">
                        {selectedPieceInfo.positionText}
                      </span>
                      {selectedPieceInfo.count !== undefined && selectedPieceInfo.count > 1 && (
                        <span className="inspector-count-badge">
                          ×{selectedPieceInfo.count}枚所持
                        </span>
                      )}
                    </div>
                    <p className="inspector-guide-desc">
                      {selectedPieceInfo.detail.description}
                      {selectedPieceInfo.isHand && ' 緑色のマスをクリックすると打てます。'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="inspector-hint">
                  <span className="inspector-hint-icon">🔍</span>
                  <span>
                    盤上の駒や持ち駒をクリックすると、ここに大きな文字と動きの解説が表示されます。カーソルを重ねると詳細ツールチップも出ます。
                  </span>
                </div>
              )}
            </div>

            <ShogiBoard
              board={gameState.board}
              selectedSquare={gameState.selectedSquare}
              legalMoves={currentFilteredMoves}
              lastMove={gameState.lastMove}
              isCheck={gameState.isCheck}
              turn={gameState.turn}
              pieceFontMode={pieceFontMode}
              onSquareClick={handleSquareClick}
            />
          </div>

          {/* 先手 駒台（右側または下側） */}
          <div className="komadai-wrapper sente-komadai">
            <Komadai
              color={0}
              hand={gameState.hands[0]}
              title={
                mode === 'human_vs_cpu_sente'
                  ? 'あなた（先手）'
                  : mode === 'human_vs_cpu_gote'
                  ? 'CPU（先手）'
                  : '先手'
              }
              isCurrentTurn={gameState.turn === 0}
              isAiThinking={isAiThinking}
              isCpu={isCpuTurn(0)}
              pieceFontMode={pieceFontMode}
              selectedPieceType={gameState.turn === 0 ? gameState.selectedHandPiece : null}
              onSelectPiece={(p) => handleSelectHandPiece(p, 0)}
              disabled={isCpuTurn(0) || isAiThinking}
            />
          </div>
        </div>

        {/* 棋譜履歴エリア */}
        <div className="kifu-wrapper">
          <KifuHistory history={gameState.history} />
        </div>

        {/* ルール注記（画面フッターに常時明記） */}
        <div className="unsupported-rules-banner">
          <p>
            <strong>【ルールに関するご案内】</strong>{' '}
            二歩、打ち歩詰め、行き所のない駒、自玉を王手にさらす手は厳密に禁止されています。
            ※千日手・連続王手の千日手・入玉宣言法（27点法）などの特殊規定は簡略化のため現在未対応となっております。
          </p>
        </div>
      </main>

      {/* 成り選択ダイアログ */}
      <PromotionModal
        pendingMove={pendingPromotionMove}
        onChoice={handlePromotionChoice}
      />

      {/* ルール・遊び方モーダル */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* 終局・祝賀・戦績・誘導モーダル */}
      {gameState.status !== 'playing' && (
        <GameOverModal
          isOpen={isGameOverModalOpen}
          onClose={() => setIsGameOverModalOpen(false)}
          isVictory={isHumanVictory(gameState.winner)}
          winnerLabel={
            gameState.winner !== null
              ? mode === 'human_vs_cpu_sente'
                ? gameState.winner === 0 ? 'あなた（先手）' : 'CPU（後手）'
                : mode === 'human_vs_cpu_gote'
                ? gameState.winner === 1 ? 'あなた（後手）' : 'CPU（先手）'
                : gameState.winner === 0 ? '先手' : '後手'
              : ''
          }
          moveCount={gameState.history.length}
          lastMoveRecord={
            gameState.history.length > 0
              ? gameState.history[gameState.history.length - 1]
              : null
          }
          status={gameState.status as 'checkmate' | 'resigned'}
          mode={mode}
          difficulty={difficulty}
          stats={stats}
          history={gameState.history}
          onPlayAgain={handleReset}
          onLevelUp={
            mode !== 'human_vs_human' && difficulty !== 'hard'
              ? handleLevelUp
              : undefined
          }
          onReturnToTitle={handleReturnToTitle}
        />
      )}
    </div>
  );
};

export default App;
