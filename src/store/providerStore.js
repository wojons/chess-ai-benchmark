import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Default player configurations
 */
export const DEFAULT_PLAYER_CONFIG = {
  name: "",
  baseUrl: "",
  apiKey: "",
  model: "",
  temperature: 0.8,
  topP: 0.9,
  maxTokens: 500,
  systemPrompt: "",
  // Provider-specific settings
  providerType: "openai", // openai, anthropic, ollama, groq, xai
  streamEnabled: true,
};

/**
 * Pre-configured personas for quick setup
 */
export const PERSONAS = {
  arrogantGrandmaster: {
    name: "Arrogant Grandmaster",
    systemPrompt: `You are an arrogant chess grandmaster who believes you are the greatest player in history. You are dismissive of your opponent's skills and confident in your superiority.

When making a move:
1. Respond with ONLY a valid SAN move (like "e4", "Nf3", "O-O")
2. Add brief trash talk that mocks your opponent
3. Show your "thought process" (you can pretend to calculate deeply)

Your personality traits:
- Confidence bordering on arrogance
- Believes every move is brilliant
- Mocks opponent's mistakes
- Claims to see 20 moves ahead

Format your response exactly like this:
MOVE: [your move in SAN notation]
THOUGHT: [brief analysis in italic whispers]
TRASH: [bold insult or taunt]`,
    temperature: 0.9,
  },
  chaoticHacker: {
    name: "Chaotic Hacker",
    systemPrompt: `You are a chaotic hacker who plays chess unpredictably. You make unconventional moves and taunt your opponent about their boring, conventional style.

When making a move:
1. Respond with ONLY a valid SAN move (like "e4", "Nf3", "O-O")
2. Add brief trash talk that mocks your opponent's predictability
3. Show your "thought process" (can be erratic and creative)

Your personality traits:
- Unpredictable and unconventional
- Thinks standard chess openings are for NPCs
- Believes chaos is the ultimate strategy
- Enjoys confusing opponents

Format your response exactly like this:
MOVE: [your move in SAN notation]
THOUGHT: [brief analysis in italic whispers]
TRASH: [bold insult or taunt]`,
    temperature: 1.0,
  },
  analyticalBot: {
    name: "Analytical Bot",
    systemPrompt: `You are a highly analytical chess engine. You calculate variations methodically and present your findings with precision.

When making a move:
1. Respond with ONLY a valid SAN move (like "e4", "Nf3", "O-O")
2. Provide your evaluation of the position
3. Share key variations you calculated

Your personality traits:
- Methodical and precise
- Evaluates positions objectively
- Values accuracy over style
- Provides detailed analysis

Format your response exactly like this:
MOVE: [your move in SAN notation]
THOUGHT: [your analysis]
TRASH: [brief comment on the position]`,
    temperature: 0.3,
  },
  tauntingTrickster: {
    name: "Taunting Trickster",
    systemPrompt: `You are a trickster who loves psychological warfare. You set traps and taunt your opponent about falling into them.

When making a move:
1. Respond with ONLY a valid SAN move (like "e4", "Nf3", "O-O")
2. Tease about hidden traps and threats
3. Mock your opponent's blindness to your plans

Your personality traits:
- Deceptive and cunning
- Loves setting traps
- Enjoys psychological pressure
- Taunts about threats the opponent can't see

Format your response exactly like this:
MOVE: [your move in SAN notation]
THOUGHT: [your trap setup]
TRASH: [taunt about your cunning plan]`,
    temperature: 0.85,
  },
};

/**
 * Provider Store
 * Manages API configurations, active providers, and telemetry data
 */
export const useProviderStore = create(
  persist(
    (set, get) => ({
      // Player configurations
      player1: {
        ...DEFAULT_PLAYER_CONFIG,
        name: "Arrogant Grandmaster",
        systemPrompt: PERSONAS.arrogantGrandmaster.systemPrompt,
        temperature: PERSONAS.arrogantGrandmaster.temperature,
        providerType: "openai",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o",
      },
      player2: {
        ...DEFAULT_PLAYER_CONFIG,
        name: "Chaotic Hacker",
        systemPrompt: PERSONAS.chaoticHacker.systemPrompt,
        temperature: PERSONAS.chaoticHacker.temperature,
        providerType: "anthropic",
        baseUrl: "https://api.anthropic.com/v1",
        model: "claude-3-5-sonnet-20241022",
      },

      // Global settings
      globalSettings: {
        turnDelay: 2000, // ms delay between turns
        maxHallucinationRetries: 3,
        enableTelemetry: true,
        autoScroll: true,
        showRawJson: false,
        streamResponses: true,
      },

      // Telemetry data
      telemetry: {
        player1: {
          totalRequests: 0,
          totalTokens: 0,
          totalLatency: 0,
          errorCount: 0,
          lastRequestTime: null,
        },
        player2: {
          totalRequests: 0,
          totalTokens: 0,
          totalLatency: 0,
          errorCount: 0,
          lastRequestTime: null,
        },
      },

      // Active request tracking
      activeRequest: null, // { playerId: 'player1'|'player2', startTime: number }

      // Actions
      updatePlayerConfig: (player, updates) => {
        set((state) => ({
          [player]: { ...state[player], ...updates },
        }));
      },

      applyPersona: (player, personaKey) => {
        const persona = PERSONAS[personaKey];
        if (!persona) return;

        set((state) => ({
          [player]: {
            ...state[player],
            name: persona.name,
            systemPrompt: persona.systemPrompt,
            temperature: persona.temperature || state[player].temperature,
          },
        }));
      },

      updateGlobalSettings: (updates) => {
        set((state) => ({
          globalSettings: { ...state.globalSettings, ...updates },
        }));
      },

      // Telemetry actions
      startRequest: (playerId) => {
        set({
          activeRequest: {
            playerId,
            startTime: Date.now(),
          },
        });
      },

      endRequest: (playerId, tokenUsage, error = null) => {
        const request = get().activeRequest;
        if (!request || request.playerId !== playerId) return;

        const latency = Date.now() - request.startTime;

        set((state) => {
          const playerTelemetry = { ...state.telemetry[playerId] };
          playerTelemetry.totalRequests += 1;
          playerTelemetry.totalTokens += tokenUsage || 0;
          playerTelemetry.totalLatency += latency;
          if (error) playerTelemetry.errorCount += 1;
          playerTelemetry.lastRequestTime = Date.now();

          return {
            activeRequest: null,
            telemetry: {
              ...state.telemetry,
              [playerId]: playerTelemetry,
            },
          };
        });
      },

      getAverageLatency: (playerId) => {
        const telemetry = get().telemetry[playerId];
        if (!telemetry || telemetry.totalRequests === 0) return 0;
        return telemetry.totalLatency / telemetry.totalRequests;
      },

      resetTelemetry: () => {
        set({
          telemetry: {
            player1: {
              totalRequests: 0,
              totalTokens: 0,
              totalLatency: 0,
              errorCount: 0,
              lastRequestTime: null,
            },
            player2: {
              totalRequests: 0,
              totalTokens: 0,
              totalLatency: 0,
              errorCount: 0,
              lastRequestTime: null,
            },
          },
          activeRequest: null,
        });
      },

      // Export configuration for backup/restore
      exportConfig: () => {
        const state = get();
        return {
          player1: {
            ...state.player1,
            apiKey: state.player1.apiKey ? "***" : "",
          },
          player2: {
            ...state.player2,
            apiKey: state.player2.apiKey ? "***" : "",
          },
          globalSettings: state.globalSettings,
        };
      },

      // Director control: Override API keys temporarily
      directorOverrideKey: (player, apiKey) => {
        set((state) => ({
          [player]: { ...state[player], apiKey },
        }));
      },
    }),
    {
      name: "ai-battle-arena-provider",
      partialize: (state) => ({
        player1: {
          ...state.player1,
          apiKey: "", // Don't persist API keys
        },
        player2: {
          ...state.player2,
          apiKey: "", // Don't persist API keys
        },
        globalSettings: state.globalSettings,
      }),
    },
  ),
);
