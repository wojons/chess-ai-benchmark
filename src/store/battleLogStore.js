import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Log types for categorization
 */
export const LOG_TYPES = {
  SYSTEM: 'system',
  TURN: 'turn',
  MOVE: 'move',
  THOUGHT: 'thought',      // Internal monologue (The Whisper)
  TRASH: 'trash',          // Public taunt (The Shout)
  HALLUCINATION: 'hallucination',
  ERROR: 'error',
  WARNING: 'warning',
  DIRECTOR: 'director',    // Human intervention
  TELEMETRY: 'telemetry'
};

/**
 * BattleLog Store
 * Manages the battle feed, whisper stack, and trash history
 * Optimized for virtualized rendering with 10,000+ entries
 */
export const useBattleLogStore = create(
  persist(
    (set, get) => ({
      // All logs (ordered chronologically)
      logs: [],

      // Sliding window caches for context building
      whisperStack: [],      // Last 6 internal thoughts
      trashHistory: [],      // Last 12 public exchanges
      moveHistory: [],       // Last 20 moves (without dialogue)

      // Aggregated statistics
      stats: {
        totalMoves: 0,
        totalExchanges: 0,
        hallucinationsByPlayer: { player1: 0, player2: 0 },
        averageLatency: 0,
        totalTokens: 0
      },

      // Actions
      addLog: (type, content, player = null, metadata = {}) => {
        const logEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type,
          content,
          player,
          metadata
        };

        set((state) => {
          const newLogs = [...state.logs, logEntry];

          // Update sliding windows
          let newWhisperStack = [...state.whisperStack];
          let newTrashHistory = [...state.trashHistory];
          let newMoveHistory = [...state.moveHistory];

          if (type === LOG_TYPES.THOUGHT) {
            newWhisperStack = [...state.whisperStack, logEntry].slice(-6);
          } else if (type === LOG_TYPES.TRASH) {
            newTrashHistory = [...state.trashHistory, logEntry].slice(-12);
          } else if (type === LOG_TYPES.MOVE) {
            newMoveHistory = [...state.moveHistory, logEntry].slice(-20);
          } else if (type === LOG_TYPES.HALLUCINATION) {
            const playerKey = player === 'Player 1' ? 'player1' : 'player2';
            return {
              logs: newLogs,
              whisperStack: newWhisperStack,
              trashHistory: newTrashHistory,
              moveHistory: newMoveHistory,
              stats: {
                ...state.stats,
                hallucinationsByPlayer: {
                  ...state.stats.hallucinationsByPlayer,
                  [playerKey]: state.stats.hallucinationsByPlayer[playerKey] + 1
                }
              }
            };
          }

          return {
            logs: newLogs,
            whisperStack: newWhisperStack,
            trashHistory: newTrashHistory,
            moveHistory: newMoveHistory,
            stats: {
              ...state.stats,
              totalMoves: type === LOG_TYPES.MOVE ? state.stats.totalMoves + 1 : state.stats.totalMoves,
              totalExchanges: type === LOG_TYPES.TRASH ? state.stats.totalExchanges + 1 : state.stats.totalExchanges
            }
          };
        });

        return logEntry;
      },

      // Batch add logs (for stream responses)
      addLogs: (logsArray) => {
        const newLogs = [...get().logs, ...logsArray];

        let newWhisperStack = [...get().whisperStack];
        let newTrashHistory = [...get().trashHistory];
        let newMoveHistory = [...get().moveHistory];

        logsArray.forEach(log => {
          if (log.type === LOG_TYPES.THOUGHT) {
            newWhisperStack = [...newWhisperStack, log].slice(-6);
          } else if (log.type === LOG_TYPES.TRASH) {
            newTrashHistory = [...newTrashHistory, log].slice(-12);
          } else if (log.type === LOG_TYPES.MOVE) {
            newMoveHistory = [...newMoveHistory, log].slice(-20);
          }
        });

        set({
          logs: newLogs,
          whisperStack: newWhisperStack,
          trashHistory: newTrashHistory,
          moveHistory: newMoveHistory
        });
      },

      clearLogs: () => {
        set({
          logs: [],
          whisperStack: [],
          trashHistory: [],
          moveHistory: [],
          stats: {
            totalMoves: 0,
            totalExchanges: 0,
            hallucinationsByPlayer: { player1: 0, player2: 0 },
            averageLatency: 0,
            totalTokens: 0
          }
        });
      },

      // Director control: add manual log entry
      directorLog: (type, content) => {
        get().addLog(type, content, 'Director', { manual: true });
      },

      // Update stats (called by provider telemetry)
      updateStats: (updates) => {
        set((state) => ({
          stats: { ...state.stats, ...updates }
        }));
      },

      // Get logs for virtualization (with filtering)
      getFilteredLogs: (filterTypes = null) => {
        const logs = get().logs;
        if (!filterTypes) return logs;
        return logs.filter(log => filterTypes.includes(log.type));
      },

      // Get recent logs (for context building)
      getRecentLogs: (count = 12, types = null) => {
        let logs = get().logs;
        if (types) {
          logs = logs.filter(log => types.includes(log.type));
        }
        return logs.slice(-count);
      }
    }),
    {
      name: 'ai-battle-arena-battle-log',
      partialize: (state) => ({
        logs: state.logs.slice(-500), // Only persist last 500 logs
        stats: state.stats
      })
    }
  )
);
