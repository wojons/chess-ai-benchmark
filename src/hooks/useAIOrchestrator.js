import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStateStore, GAME_STATUS } from '../store/gameStateStore.js';
import { useBattleLogStore, LOG_TYPES } from '../store/battleLogStore.js';
import { useProviderStore } from '../store/providerStore.js';
import { ChessValidator } from '../engines/chessValidator.js';
import { providerRegistry } from '../providers/registry.js';
import { contextBuilder } from '../memory/contextBuilder.js';

/**
 * AI Orchestrator Hook
 * Main game loop with hallucination recovery and human intervention support
 */
export function useAIOrchestrator() {
  const { gameState, setGameState, advanceTurn, resetGame, setGameStatus, setGameResult } = useGameStateStore();
  const { addLog, addLogs, clearLogs, getRecentLogs } = useBattleLogStore();
  const { player1, player2, globalSettings, updateGlobalSettings, startRequest, endRequest } = useProviderStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [hallucinationRetries, setHallucinationRetries] = useState({ player1: 0, player2: 0 });
  const [directorOverride, setDirectorOverride] = useState(null);
  const [directorPrompt, setDirectorPrompt] = useState(null);

  const gameLoopRef = useRef(null);
  const activePlayerRef = useRef(null);

  /**
   * Parse AI response to extract MOVE, THOUGHT, and TRASH
   */
  const parseAIResponse = useCallback((content) => {
    const moveMatch = content.match(/MOVE:\s*([^\n]+)/i);
    const thoughtMatch = content.match(/THOUGHT:\s*([^\n]+)/i);
    const trashMatch = content.match(/TRASH:\s*([^\n]+)/i);

    return {
      move: moveMatch ? moveMatch[1].trim() : null,
      thought: thoughtMatch ? thoughtMatch[1].trim() : null,
      trash: trashMatch ? trashMatch[1].trim() : null,
      rawContent: content
    };
  }, []);

  /**
   * Execute a single turn for a player
   */
  const executeTurn = useCallback(async (playerId) => {
    const isPlayer1 = playerId === 'player1';
    const playerConfig = isPlayer1 ? player1 : player2;
    const playerName = isPlayer1 ? player1.name : player2.name;

    // Create validator instance from current FEN
    const validator = new ChessValidator(gameState.fen);

    // Check if game is already over
    const gameStateResult = validator.getGameState();
    if (gameStateResult.gameOver) {
      setGameStatus(GAME_STATUS.GAME_OVER);
      setGameResult(gameStateResult);
      addLog(LOG_TYPES.SYSTEM, `Game Over: ${gameStateResult.result} - ${gameStateResult.reason}`);
      setIsProcessing(false);
      return;
    }

    addLog(LOG_TYPES.TURN, `${playerName}'s turn (${gameState.turn})...`, playerName);

    // Build prompt
    const battleLogs = getRecentLogs(50);
    const prompt = contextBuilder.buildPrompt(playerConfig, isPlayer1, gameState, battleLogs);

    // Create provider adapter
    let adapter;
    try {
      adapter = providerRegistry.createAdapter(playerConfig);
    } catch (error) {
      addLog(LOG_TYPES.ERROR, `Failed to create adapter: ${error.message}`, playerName);
      setGameStatus(GAME_STATUS.ERROR);
      setIsProcessing(false);
      return;
    }

    // Handle director override
    if (directorOverride && directorOverride.playerId === playerId) {
      const overrideMove = directorOverride.move;
      addLog(LOG_TYPES.DIRECTOR, `Director Override: ${playerName} forced to play ${overrideMove}`, playerName);
      setDirectorOverride(null);

      const validation = validator.validateMove(overrideMove);
      if (!validation.valid) {
        addLog(LOG_TYPES.ERROR, `Director override invalid: ${validation.error}`, playerName);
        return;
      }

      // Apply move
      setGameState({ fen: validator.fen, turn: validator.turn });
      advanceTurn();
      addLog(LOG_TYPES.MOVE, overrideMove, playerName);
      return;
    }

    // Handle director prompt interception
    const finalPrompt = directorPrompt || prompt;
    if (directorPrompt) {
      addLog(LOG_TYPES.DIRECTOR, `Director intercepted and modified prompt`, playerName);
      setDirectorPrompt(null);
    }

    // Call LLM
    startRequest(playerId);
    const startTime = Date.now();

    try {
      const result = await adapter.complete(finalPrompt);
      const latency = Date.now() - startTime;

      endRequest(playerId, result.tokens);

      // Parse response
      const parsed = parseAIResponse(result.content);

      // Stream thoughts if available
      if (parsed.thought) {
        addLog(LOG_TYPES.THOUGHT, parsed.thought, playerName);
      }

      // Validate move
      if (!parsed.move) {
        throw new Error('No valid MOVE field found in response');
      }

      const validation = validator.validateMove(parsed.move);

      if (!validation.valid) {
        // Hallucination detected
        const retryKey = isPlayer1 ? 'player1' : 'player2';
        const currentRetries = hallucinationRetries[retryKey];

        if (currentRetries >= globalSettings.maxHallucinationRetries) {
          addLog(LOG_TYPES.ERROR, `Max hallucination retries (${globalSettings.maxHallucinationRetries}) exceeded. Director intervention required.`, playerName);
          setGameStatus(GAME_STATUS.WAITING_DIRECTOR);
          setIsProcessing(false);
          return;
        }

        addLog(LOG_TYPES.HALLUCINATION, validation.error, playerName);

        // Generate correction prompt
        const correctionPrompt = contextBuilder.buildCorrectionPrompt(
          playerConfig,
          validation.error,
          parsed.move,
          gameState
        );

        // Retry with correction
        const retryResult = await adapter.complete(correctionPrompt);
        const retryParsed = parseAIResponse(retryResult.content);

        if (!retryParsed.move) {
          throw new Error('Failed to extract valid move from correction response');
        }

        const retryValidation = validator.validateMove(retryParsed.move);

        if (!retryValidation.valid) {
          throw new Error(`Retry also failed: ${retryValidation.error}`);
        }

        setHallucinationRetries(prev => ({
          ...prev,
          [retryKey]: prev[retryKey] + 1
        }));

        // Apply corrected move
        if (retryParsed.thought) {
          addLog(LOG_TYPES.THOUGHT, retryParsed.thought, playerName);
        }

        setGameState({ fen: validator.fen, turn: validator.turn });
        advanceTurn();
        addLog(LOG_TYPES.MOVE, retryParsed.move, playerName);
      } else {
        // Valid move
        setHallucinationRetries(prev => ({
          ...prev,
          [isPlayer1 ? 'player1' : 'player2']: 0
        }));

        // Apply move
        setGameState({ fen: validator.fen, turn: validator.turn });
        advanceTurn();
        addLog(LOG_TYPES.MOVE, parsed.move, playerName);

        // Log trash talk
        if (parsed.trash) {
          addLog(LOG_TYPES.TRASH, parsed.trash, playerName);
        }
      }

    } catch (error) {
      addLog(LOG_TYPES.ERROR, `AI Error: ${error.message}`, playerName);
      endRequest(playerId, 0, error);

      if (globalSettings.maxHallucinationRetries > 0) {
        setGameStatus(GAME_STATUS.ERROR);
      }
      setIsProcessing(false);
    }
  }, [gameState, player1, player2, globalSettings, parseAIResponse, addLog, setGameState, advanceTurn, setGameStatus, setGameResult, getRecentLogs, startRequest, endRequest, directorOverride, directorPrompt, hallucinationRetries]);

  /**
   * Main game loop
   */
  const gameLoop = useCallback(async () => {
    if (gameState.status !== GAME_STATUS.RUNNING) {
      return;
    }

    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    const currentPlayerId = gameState.turn === 'white' ? 'player1' : 'player2';
    activePlayerRef.current = currentPlayerId;

    await executeTurn(currentPlayerId);

    // Schedule next turn
    if (gameState.status === GAME_STATUS.RUNNING) {
      gameLoopRef.current = setTimeout(() => {
        setIsProcessing(false);
        gameLoop();
      }, globalSettings.turnDelay);
    } else {
      setIsProcessing(false);
    }
  }, [gameState.status, gameState.turn, isProcessing, executeTurn, globalSettings.turnDelay]);

  /**
   * Start the game loop
   */
  const startGame = useCallback(() => {
    if (!player1.apiKey || !player2.apiKey) {
      addLog(LOG_TYPES.ERROR, 'Please enter API keys for both players');
      return;
    }

    setGameStatus(GAME_STATUS.RUNNING);
    addLog(LOG_TYPES.SYSTEM, '=== AI BATTLE ARENA STARTED ===');
    addLog(LOG_TYPES.SYSTEM, `${player1.name} vs ${player2.name}`);
    addLog(LOG_TYPES.SYSTEM, `${player1.name} plays White, ${player2.name} plays Black`);

    // Reset hallucination counters
    setHallucinationRetries({ player1: 0, player2: 0 });
  }, [player1, player2, setGameStatus, addLog]);

  /**
   * Pause the game loop
   */
  const pauseGame = useCallback(() => {
    setGameStatus(GAME_STATUS.PAUSED);
    addLog(LOG_TYPES.SYSTEM, '=== GAME PAUSED ===');

    if (gameLoopRef.current) {
      clearTimeout(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    setIsProcessing(false);
  }, [setGameStatus, addLog]);

  /**
   * Reset the game
   */
  const handleResetGame = useCallback(() => {
    if (gameLoopRef.current) {
      clearTimeout(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    resetGame();
    clearLogs();
    setHallucinationRetries({ player1: 0, player2: 0 });
    setDirectorOverride(null);
    setDirectorPrompt(null);
    setIsProcessing(false);
  }, [resetGame, clearLogs]);

  /**
   * Director: Force a specific move
   */
  const forceMove = useCallback((move, playerId) => {
    setDirectorOverride({ move, playerId });

    // If game is paused, execute immediately
    if (gameState.status === GAME_STATUS.PAUSED && activePlayerRef.current === playerId) {
      executeTurn(playerId);
    }
  }, [gameState.status, executeTurn]);

  /**
   * Director: Override the next prompt
   */
  const overridePrompt = useCallback((prompt) => {
    setDirectorPrompt(prompt);
  }, []);

  /**
   * Director: Skip current turn
   */
  const skipTurn = useCallback(() => {
    if (gameState.status === GAME_STATUS.PAUSED || gameState.status === GAME_STATUS.WAITING_DIRECTOR) {
      addLog(LOG_TYPES.DIRECTOR, `Director: Skipping current turn`);
      advanceTurn();
    }
  }, [gameState.status, advanceTurn, addLog]);

  /**
   * Update game speed (turn delay)
   */
  const setSpeed = useCallback((speed) => {
    updateGlobalSettings({ turnDelay: speed });
  }, [updateGlobalSettings]);

  // Start game loop when status changes to RUNNING
  useEffect(() => {
    if (gameState.status === GAME_STATUS.RUNNING && !isProcessing) {
      gameLoop();
    }

    return () => {
      if (gameLoopRef.current) {
        clearTimeout(gameLoopRef.current);
      }
    };
  }, [gameState.status, isProcessing, gameLoop]);

  return {
    // Game state
    gameState,
    isProcessing,
    currentTurn,
    hallucinationRetries,
    directorOverride,

    // Actions
    startGame,
    pauseGame,
    resetGame: handleResetGame,

    // Director controls
    forceMove,
    overridePrompt,
    skipTurn,

    // Settings
    setSpeed
  };
}
