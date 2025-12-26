import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Initial FEN for standard chess
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Game states for the state machine
export const GAME_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  ERROR: 'error',
  WAITING_DIRECTOR: 'waiting_director',
  GAME_OVER: 'game_over'
};

/**
 * GameState Store
 * Manages the game state machine, board position, and turn logic
 */
export const useGameStateStore = create(
  persist(
    (set, get) => ({
      // Core game state
      fen: INITIAL_FEN,
      turn: 'white',
      moveNumber: 1,
      castling: 'KQkq',
      enPassant: '-',
      halfMoveClock: 0,
      fullMoveNumber: 1,

      // State machine status
      status: GAME_STATUS.IDLE,
      lastValidFen: INITIAL_FEN,
      stateHash: generateStateHash(INITIAL_FEN),

      // Game outcome (when game over)
      gameResult: null, // { winner: 'white'|'black'|'draw', reason: string }

      // State history for rollback (max 20 entries)
      stateHistory: [],

      // Actions
      setGameState: (updates) => {
        const newState = { ...get(), ...updates };
        if (updates.fen) {
          const newHash = generateStateHash(updates.fen);
          newState.stateHash = newHash;

          // Add to history if it's a valid new state
          if (get().lastValidFen !== updates.fen) {
            const historyEntry = {
              fen: updates.fen,
              turn: updates.turn || get().turn,
              moveNumber: updates.moveNumber || get().moveNumber,
              timestamp: Date.now()
            };
            newState.stateHistory = [...get().stateHistory, historyEntry].slice(-20);
          }
        }
        set(newState);
      },

      resetGame: () => {
        set({
          fen: INITIAL_FEN,
          turn: 'white',
          moveNumber: 1,
          castling: 'KQkq',
          enPassant: '-',
          halfMoveClock: 0,
          fullMoveNumber: 1,
          status: GAME_STATUS.IDLE,
          lastValidFen: INITIAL_FEN,
          stateHash: generateStateHash(INITIAL_FEN),
          stateHistory: [],
          gameResult: null
        });
      },

      advanceTurn: () => {
        const current = get();
        const nextTurn = current.turn === 'white' ? 'black' : 'white';
        const nextMoveNumber = nextTurn === 'white' ? current.moveNumber + 1 : current.moveNumber;

        set({
          turn: nextTurn,
          moveNumber: nextMoveNumber,
          fullMoveNumber: nextTurn === 'white' ? current.fullMoveNumber + 1 : current.fullMoveNumber
        });
      },

      setGameStatus: (status) => set({ status }),

      setGameResult: (result) => set({ gameResult: result, status: GAME_STATUS.GAME_OVER }),

      rollback: (steps = 1) => {
        const history = get().stateHistory;
        if (history.length <= steps) {
          get().resetGame();
          return;
        }

        const targetState = history[history.length - 1 - steps];
        if (targetState) {
          set({
            fen: targetState.fen,
            turn: targetState.turn,
            moveNumber: targetState.moveNumber,
            lastValidFen: targetState.fen,
            stateHash: generateStateHash(targetState.fen),
            stateHistory: history.slice(0, -steps)
          });
        }
      },

      // Director control: manually set FEN (God Mode)
      directorSetFen: (fen) => {
        const hash = generateStateHash(fen);
        set({
          fen,
          lastValidFen: fen,
          stateHash: hash,
          stateHistory: [...get().stateHistory, { fen, turn: get().turn, moveNumber: get().moveNumber, timestamp: Date.now() }].slice(-20)
        });
      },

      // Director control: force a specific turn
      directorSetTurn: (turn) => set({ turn }),

      // Director control: override move number
      directorSetMoveNumber: (moveNumber) => set({ moveNumber })
    }),
    {
      name: 'ai-battle-arena-game-state',
      partialize: (state) => ({
        fen: state.fen,
        turn: state.turn,
        moveNumber: state.moveNumber,
        status: state.status
      })
    }
  )
);

// Helper: Generate hash for state integrity verification
function generateStateHash(fen) {
  const position = fen.split(' ')[0];
  let hash = 0;
  for (let i = 0; i < position.length; i++) {
    const char = position.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}
