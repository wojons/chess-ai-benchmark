import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStateStore, GAME_STATUS } from "./store/gameStateStore.js";
import { useBattleLogStore, LOG_TYPES } from "./store/battleLogStore.js";
import { useProviderStore, PERSONAS } from "./store/providerStore.js";
import "./cyber-brutalist.css";

/**
 * AI Battle Arena - Cyber-Brutalist Observatory
 * High-density, high-contrast, unapologetically technical
 */
export default function App() {
  const storeState = useGameStateStore();
  const { setGameStatus } = storeState;

  const gameState = {
    status: storeState.status,
    turn: storeState.turn,
    fen: storeState.fen,
    moveNumber: storeState.moveNumber,
  };

  const { logs, stats, addLog } = useBattleLogStore();
  const {
    player1,
    player2,
    globalSettings,
    updatePlayerConfig,
    updateGlobalSettings,
  } = useProviderStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [isThinking, setIsThinking] = useState(false);
  const [directorHudOpen, setDirectorHudOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowSettings(false);
        setDirectorHudOpen(false);
      }
      if (e.key === "d" && e.altKey) {
        setDirectorHudOpen(!directorHudOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleStartGame = () => {
    if (!player1.apiKey || !player2.apiKey) {
      alert("Please enter API keys for both players");
      return;
    }
    setGameStatus(GAME_STATUS.RUNNING);
    addLog(LOG_TYPES.SYSTEM, "=== AI BATTLE ARENA INITIALIZED ===");
    addLog(LOG_TYPES.SYSTEM, `${player1.name} vs ${player2.name}`);
    addLog(
      LOG_TYPES.SYSTEM,
      `${player1.name} plays White, ${player2.name} plays Black`,
    );
  };

  return (
    <div className="observatory-background">
      <div className="fluid-grid">
        {/* ============================
            LEFT PANEL: GAME STAGE
           ============================ */}
        <div className="flex flex-col gap-px brutalist-border bg-void p-4">
          {/* Game Stage */}
          <div className="game-stage">
            <GameStage />
          </div>

          {/* Director Controls */}
          <DirectorControls />
        </div>

        {/* ============================
            CENTER PANEL: THE NEURAL STREAM
           ============================ */}
        <div className="flex flex-col gap-px brutalist-border bg-void p-4">
          {/* Header */}
          <div className="brutalist-box p-4 mb-4">
            <h1 className="text-2xl font-bold text-cyan mb-2">
              AI BATTLE ARENA
            </h1>
            <p className="text-ghost-50 text-sm mb-2">
              LLM vs LLM Research Observatory
            </p>
            <div className="flex items-center gap-2">
              <div
                className={`px-3 py-1 text-xs font-mono font-bold ${
                  gameState.status === "running"
                    ? "bg-neon-vermilion text-obsidian"
                    : "bg-obsidian text-ghost"
                }`}
              >
                {gameState.status.toUpperCase()}
              </div>
              {gameState.status === "running" && (
                <div className="thinking-pulse">
                  <div className="text-xs font-mono text-cyan">
                    ● NEURAL PROCESSING
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Battle Feed - Dual Layer */}
          <BattleFeed
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            showRawJson={showRawJson}
            setShowRawJson={setShowRawJson}
          />
        </div>

        {/* ============================
            RIGHT PANEL: TELEMETRY
           ============================ */}
        <div className="flex flex-col gap-px brutalist-border bg-void p-4">
          {activeTab === "telemetry" ? (
            <TelemetryPanel />
          ) : (
            <div className="brutalist-box p-4">
              <h3 className="text-lg font-bold text-ghost mb-4">
                BATTLE METRICS
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-3 brutalist-border">
                  <div className="text-ghost-50 text-xs mb-1">TOTAL MOVES</div>
                  <div className="text-2xl font-mono text-cyan">
                    {stats.totalMoves}
                  </div>
                </div>
                <div className="bg-slate-900 p-3 brutalist-border">
                  <div className="text-ghost-50 text-xs mb-1">EXCHANGES</div>
                  <div className="text-2xl font-mono text-vermilion">
                    {stats.totalExchanges}
                  </div>
                </div>
                <div className="bg-slate-900 p-3 brutalist-border">
                  <div className="text-ghost-50 text-xs mb-1">
                    HALLUCINATIONS
                  </div>
                  <div className="text-2xl font-mono text-neon-vermilion">
                    {stats.hallucinationsByPlayer.player1 +
                      stats.hallucinationsByPlayer.player2}
                  </div>
                </div>
                <div className="bg-slate-900 p-3 brutalist-border">
                  <div className="text-ghost-50 text-xs mb-1">TOKENS/MOVE</div>
                  <div className="text-2xl font-mono text-cyan">
                    {stats.totalMoves > 0
                      ? Math.round(stats.totalTokens / stats.totalMoves)
                      : 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================
          DIRECTOR HUD - SLIDE-OUT TRAY
         ============================ */}
      <AnimatePresence>
        {directorHudOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="director-hud"
          >
            <DirectorHud />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================
          SETTINGS PANEL (COLLAPSIBLE)
         ============================ */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-obsidian brutalist-border p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
              <SettingsPanel
                player1={player1}
                player2={player2}
                globalSettings={globalSettings}
                updatePlayerConfig={updatePlayerConfig}
                updateGlobalSettings={updateGlobalSettings}
                onClose={() => setShowSettings(false)}
                onStartGame={handleStartGame}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mono-background-noise */}
      <div className="mono-background-noise" />
    </div>
  );
}

/**
 * Game Stage Component
 * Grid of Light with glowing pieces
 */
function GameStage() {
  return (
    <div className="game-stage">
      <div className="text-ghost-50 text-xs mb-2 font-mono">
        // GRID_OF_LIGHT_RENDERED
      </div>
      <GameBoard />
    </div>
  );
}

/**
 * Battle Feed Component
 * Dual-layer: Whisper (internal) + Shout (public)
 */
function BattleFeed({ activeTab, setActiveTab, showRawJson, setShowRawJson }) {
  const { logs, stats } = useBattleLogStore();
  const [filterTypes, setFilterTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = logs.filter((log) => {
    if (filterTypes.length > 0 && !filterTypes.includes(log.type)) {
      return false;
    }
    if (
      searchQuery &&
      !log.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex gap-px mb-4">
        <button
          onClick={() => setActiveTab("feed")}
          className={`flex-1 px-4 py-2 font-mono text-xs font-bold sharp-corners transition-all ${
            activeTab === "feed"
              ? "bg-cyan text-obsidian"
              : "bg-slate-900 text-ghost hover:bg-slate-800"
          }`}
        >
          FEED
        </button>
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex-1 px-4 py-2 font-mono text-xs font-bold sharp-corners transition-all ${
            activeTab === "telemetry"
              ? "bg-vermilion text-obsidian"
              : "bg-slate-900 text-ghost hover:bg-slate-800"
          }`}
        >
          TELEMETRY
        </button>
      </div>

      {/* Neural Stream - Dual Layer */}
      <div className="flex-1 overflow-y-auto brutalist-border bg-slate-950 p-3">
        {filteredLogs.length === 0 ? (
          <div className="text-ghost-50 font-mono text-sm text-center py-8">
            [ NO LOGS YET ]
            <br />
            <span className="text-xs">
              // Configure players and start battle
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`border-l-2 border-cyan-500 pl-3 py-2 ${log.type === LOG_TYPES.THOUGHT ? "whisper-layer" : "shout-layer"}`}
              >
                <div className="text-xs font-mono text-ghost-50 mb-1">
                  [{new Date(log.timestamp).toLocaleTimeString()}] [
                  {log.type.toUpperCase()}]
                </div>
                {log.type === LOG_TYPES.THOUGHT ? (
                  <div className="whisper-layer">&gt; {log.content}</div>
                ) : (
                  <div className="shout-layer">{log.content}</div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex gap-px bg-slate-900 p-2 mt-auto">
        <div className="text-xs font-mono text-ghost-50">
          MOVES: <span className="text-cyan">{stats.totalMoves}</span>
        </div>
        <div className="text-xs font-mono text-ghost-50">
          HALLUS:{" "}
          <span className="text-vermilion">
            {stats.hallucinationsByPlayer.player1 +
              stats.hallucinationsByPlayer.player2}
          </span>
        </div>
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className={`text-xs font-mono px-2 sharp-corners ${
            showRawJson ? "bg-cyan text-obsidian" : "bg-slate-800 text-ghost"
          }`}
        >
          {showRawJson ? "[JSON]" : "[RAW]"}
        </button>
      </div>
    </div>
  );
}

/**
 * Director Controls Component
 */
function DirectorControls() {
  return (
    <div className="brutalist-box p-4">
      <h3 className="text-lg font-bold text-ghost mb-4 font-mono">
        DIRECTOR_CONTROLS
      </h3>
      <div className="space-y-4">
        <button className="w-full px-4 py-3 font-mono text-sm text-cyan bg-slate-900 hover:bg-slate-800 sharp-corners transition-all brutalist-border-cyan">
          ▸ START BATTLE
        </button>
        <button className="w-full px-4 py-3 font-mono text-sm text-vermilion bg-slate-900 hover:bg-slate-800 sharp-corners transition-all brutalist-border-vermilion">
          ▸ PAUSE
        </button>
        <button className="w-full px-4 py-3 font-mono text-sm text-ghost bg-slate-900 hover:bg-slate-800 sharp-corners transition-all">
          ▸ RESET GAME
        </button>
      </div>
    </div>
  );
}

/**
 * Director HUD - Slide-out Tray
 */
function DirectorHud() {
  const { globalSettings, updateGlobalSettings } = useProviderStore();
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Speed Control - Tactical Slider */}
        <div className="brutalist-box p-4">
          <h3 className="text-sm font-bold text-cyan mb-4 font-mono">
            TURN_DELAY_MS
          </h3>
          <div className="speed-control-tactical relative mb-4">
            <div
              className="speed-control-tactical"
              style={{
                width: `${Math.min(globalSettings.turnDelay / 100, 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-ghost-50">
            <span>INSTANT</span>
            <span>10s</span>
          </div>
        </div>

        {/* Prompt Peek - Glass-morphism */}
        <div className="prompt-peek">
          <div className="text-xs text-ghost-50 mb-2 font-mono">
            [ PROMPT INTERCEPT ]
          </div>
          <div className="text-xs font-mono text-cyan">
            // System: You are playing as {player1.name}
            // Move: [calculate next move in SAN notation] // Context: Last 20
            moves summarized...
          </div>
        </div>

        {/* Persona Sliders */}
        <div className="brutalist-box p-4">
          <h3 className="text-sm font-bold text-vermilion mb-4 font-mono">
            PERSONA_TWEAKS
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono text-ghost-50 block mb-2">
                SARCASM_LEVEL
              </label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="50"
                className="persona-slider"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-ghost-50 block mb-2">
                AGGRESSION
              </label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="70"
                className="persona-slider"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-ghost-50 block mb-2">
                LOGIC_DEPTH
              </label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="85"
                className="persona-slider"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Settings Panel - Brutalist Configuration
 */
function SettingsPanel({
  player1,
  player2,
  globalSettings,
  updatePlayerConfig,
  updateGlobalSettings,
  onClose,
  onStartGame,
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-cyan font-mono">
          // SYSTEM_CONFIGURATION
        </h2>
        <button
          onClick={onClose}
          className="text-ghost hover:text-cyan font-mono text-sm"
        >
          [CLOSE] ×
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* Player 1 */}
        <div className="brutalist-box p-4">
          <h3 className="text-lg font-bold text-cyan mb-4 font-mono">
            PLAYER_1 [WHITE] - {player1.name}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-ghost-50 block">
                PROVIDER
              </label>
              <select
                value={player1.providerType}
                onChange={(e) =>
                  updatePlayerConfig("player1", {
                    providerType: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-900 text-ghost text-xs font-mono brutalist-border"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="groq">Groq</option>
                <option value="xai">xAI</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono text-ghost-50 block">
                MODEL
              </label>
              <input
                type="text"
                value={player1.model}
                onChange={(e) =>
                  updatePlayerConfig("player1", { model: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 text-ghost text-xs font-mono brutalist-border"
              />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <label className="text-xs font-mono text-ghost-50 block">
              API_KEY
            </label>
            <input
              type="password"
              value={player1.apiKey}
              onChange={(e) =>
                updatePlayerConfig("player1", { apiKey: e.target.value })
              }
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-slate-900 text-ghost text-xs font-mono brutalist-border"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-ghost-50 block">
              TEMPERATURE: {player1.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={player1.temperature}
              onChange={(e) =>
                updatePlayerConfig("player1", {
                  temperature: parseFloat(e.target.value),
                })
              }
              className="persona-slider"
            />
          </div>
        </div>

        {/* Player 2 */}
        <div className="brutalist-box p-4">
          <h3 className="text-lg font-bold text-vermilion mb-4 font-mono">
            PLAYER_2 [BLACK] - {player2.name}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-ghost-50 block">
                PROVIDER
              </label>
              <select
                value={player2.providerType}
                onChange={(e) =>
                  updatePlayerConfig("player2", {
                    providerType: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-900 text-ghost text-xs font-mono brutalist-border"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="groq">Groq</option>
                <option value="xai">xAI</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono text-ghost-50 block">
                MODEL
              </label>
              <input
                type="text"
                value={player2.model}
                onChange={(e) =>
                  updatePlayerConfig("player2", { model: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 text-ghost text-xs font-mono brutalist-border"
              />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <label className="text-xs font-mono text-ghost-50 block">
              API_KEY
            </label>
            <input
              type="password"
              value={player2.apiKey}
              onChange={(e) =>
                updatePlayerConfig("player2", { apiKey: e.target.value })
              }
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 bg-slate-900 text-ghost text-xs font-mono brutalist-border"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-ghost-50 block">
              TEMPERATURE: {player2.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={player2.temperature}
              onChange={(e) =>
                updatePlayerConfig("player2", {
                  temperature: parseFloat(e.target.value),
                })
              }
              className="persona-slider"
            />
          </div>
        </div>

        {/* Global Settings */}
        <div className="brutalist-box p-4">
          <h3 className="text-lg font-bold text-ghost mb-4 font-mono">
            // GLOBAL_PARAMETERS
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-ghost-50">
                ENABLE_TELEMETRY
              </label>
              <input
                type="checkbox"
                checked={globalSettings.enableTelemetry}
                onChange={(e) =>
                  updateGlobalSettings({ enableTelemetry: e.target.checked })
                }
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-ghost-50">
                AUTO_SCROLL_LOGS
              </label>
              <input
                type="checkbox"
                checked={globalSettings.autoScroll}
                onChange={(e) =>
                  updateGlobalSettings({ autoScroll: e.target.checked })
                }
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-ghost-50">
                STREAM_RESPONSES
              </label>
              <input
                type="checkbox"
                checked={globalSettings.streamResponses}
                onChange={(e) =>
                  updateGlobalSettings({ streamResponses: e.target.checked })
                }
                className="w-4 h-4"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <button
          onClick={onStartGame}
          className="w-full px-6 py-4 font-mono text-lg text-obsidian bg-cyan hover:bg-electric-cyan-600 sharp-corners transition-all font-bold brutalist-border-cyan"
        >
          ▶ INITIALIZE_BATTLE_SEQUENCE
        </button>
      </div>
    </div>
  );
}

/**
 * Telemetry Panel Component
 */
function TelemetryPanel() {
  const { telemetry } = useProviderStore();
  const { stats } = useBattleLogStore();

  const p1Stats = telemetry.player1;
  const p2Stats = telemetry.player2;

  return (
    <div className="brutalist-box p-4">
      <h3 className="text-lg font-bold text-ghost mb-4 font-mono">
        // PERFORMANCE_TELEMETRY
      </h3>
      <div className="space-y-4">
        {/* Player 1 Stats */}
        <div className="bg-slate-900 p-3 brutalist-border">
          <div className="text-xs font-mono text-cyan mb-2">
            PLAYER_1: {p1Stats.totalRequests > 0 ? "ACTIVE" : "IDLE"}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-ghost-50">REQUESTS</div>
              <div className="font-mono text-ghost">
                {p1Stats.totalRequests}
              </div>
            </div>
            <div>
              <div className="text-ghost-50">TOKENS</div>
              <div className="font-mono text-cyan">{p1Stats.totalTokens}</div>
            </div>
            <div>
              <div className="text-ghost-50">LATENCY</div>
              <div className="font-mono text-cyan">
                {p1Stats.totalLatency}ms
              </div>
            </div>
            <div>
              <div className="text-ghost-50">ERRORS</div>
              <div className="font-mono text-vermilion">
                {p1Stats.errorCount}
              </div>
            </div>
          </div>
        </div>

        {/* Player 2 Stats */}
        <div className="bg-slate-900 p-3 brutalist-border">
          <div className="text-xs font-mono text-vermilion mb-2">
            PLAYER_2: {p2Stats.totalRequests > 0 ? "ACTIVE" : "IDLE"}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-ghost-50">REQUESTS</div>
              <div className="font-mono text-ghost">
                {p2Stats.totalRequests}
              </div>
            </div>
            <div>
              <div className="text-ghost-50">TOKENS</div>
              <div className="font-mono text-vermilion">
                {p2Stats.totalTokens}
              </div>
            </div>
            <div>
              <div className="text-ghost-50">LATENCY</div>
              <div className="font-mono text-vermilion">
                {p2Stats.totalLatency}ms
              </div>
            </div>
            <div>
              <div className="text-ghost-50">ERRORS</div>
              <div className="font-mono text-vermilion">
                {p2Stats.errorCount}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import GameBoard from existing component
import GameBoard from "./components/Arena/GameBoard.jsx";
