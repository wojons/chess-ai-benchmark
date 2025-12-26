import React, { useState, useEffect } from "react";
import { useGameStateStore, GAME_STATUS } from "./store/gameStateStore.js";
import { useBattleLogStore, LOG_TYPES } from "./store/battleLogStore.js";
import { useProviderStore, PERSONAS } from "./store/providerStore.js";
import GameBoard from "./components/Arena/GameBoard.jsx";
import BattleFeed from "./components/Observatory/BattleFeed.jsx";
import DirectorPanel from "./components/Controls/DirectorPanel.jsx";
import TelemetryPanel from "./components/Telemetry/TelemetryPanel.jsx";
import { Settings, Eye, EyeOff, ChevronUp, Download } from "lucide-react";

/**
 * Main App Component
 * Orchestrates AI Battle Arena
 */
function App() {
  const storeState = useGameStateStore();
  const { setGameStatus } = storeState;

  // Create a gameState object for consistency
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

  const [showSettings, setShowSettings] = useState(true);
  const [showRawJson, setShowRawJson] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close settings
      if (e.key === "Escape" && showSettings) {
        setShowSettings(false);
      }

      // Space to toggle play/pause
      if (e.key === " " && !e.repeat) {
        e.preventDefault();
        if (gameState.status === GAME_STATUS.RUNNING) {
          setGameStatus(GAME_STATUS.PAUSED);
          addLog(LOG_TYPES.SYSTEM, "Game paused");
        } else if (gameState.status === GAME_STATUS.PAUSED) {
          setGameStatus(GAME_STATUS.RUNNING);
          addLog(LOG_TYPES.SYSTEM, "Game resumed");
        }
      }

      // R to reset
      if (e.key === "r" && e.ctrlKey) {
        e.preventDefault();
        window.location.reload();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettings, gameState.status]);

  /**
   * Toggle settings panel
   */
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  /**
   * Toggle raw JSON panel
   */
  const toggleRawJson = () => {
    setShowRawJson(!showRawJson);
  };

  /**
   * Download battle logs
   */
  const downloadLogs = () => {
    const logContent = logs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toISOString()}] [${log.type.toUpperCase()}] ${log.player ? log.player + ": " : ""}${log.content}`,
      )
      .join("\n");

    const fullContent = `AI BATTLE ARENA - BATTLE LOG
${"=".repeat(50)}

Generated: ${new Date().toISOString()}
Game Status: ${gameState.status.toUpperCase()}
Move Number: ${gameState.moveNumber}
Current Turn: ${gameState.turn}

${"=".repeat(50)}

${logContent}`;

    const blob = new Blob([fullContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-battle-arena-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Handle start game
   */
  const handleStartGame = () => {
    if (!player1.apiKey || !player2.apiKey) {
      alert("Please enter API keys for both players");
      return;
    }
    setGameStatus(GAME_STATUS.RUNNING);
    addLog(LOG_TYPES.SYSTEM, "=== AI BATTLE ARENA STARTED ===");
    addLog(LOG_TYPES.SYSTEM, `${player1.name} vs ${player2.name}`);
    addLog(
      LOG_TYPES.SYSTEM,
      `${player1.name} plays White, ${player2.name} plays Black`,
    );
  };

  /**
   * Handle pause game
   */
  const handlePauseGame = () => {
    setGameStatus(GAME_STATUS.PAUSED);
    addLog(LOG_TYPES.SYSTEM, "=== GAME PAUSED ===");
  };

  /**
   * Handle reset game
   */
  const handleResetGame = () => {
    if (window.confirm("Are you sure you want to reset the game?")) {
      window.location.reload();
    }
  };

  /**
   * Handle settings input change
   */
  const handleSettingChange = (player, field, value) => {
    updatePlayerConfig(player, { [field]: value });
  };

  /**
   * Apply persona to player
   */
  const applyPersona = (player, personaKey) => {
    const persona = PERSONAS[personaKey];
    if (persona) {
      updatePlayerConfig(player, {
        name: persona.name,
        systemPrompt: persona.systemPrompt,
        temperature:
          persona.temperature ||
          (player === "player1" ? player1.temperature : player2.temperature),
      });
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">AI BATTLE ARENA</h1>
          <span className="app-subtitle">LLM vs LLM Research Observatory</span>
        </div>

        <div className="header-center">
          <div className={`status-badge ${gameState.status}`}>
            <div className="status-dot" />
            <span className="status-text">
              {gameState.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="header-right">
          <button
            onClick={toggleSettings}
            className="header-btn"
            title="Toggle Settings"
          >
            <Settings className="header-icon" />
          </button>
          <button
            onClick={downloadLogs}
            className="header-btn"
            title="Download Logs"
          >
            <Download className="header-icon" />
          </button>
          <button
            onClick={toggleRawJson}
            className={`header-btn ${showRawJson ? "active" : ""}`}
            title="Toggle Raw JSON"
          >
            {showRawJson ? (
              <EyeOff className="header-icon" />
            ) : (
              <Settings className="header-icon" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-content">
        {/* Left Panel - Game Board & Director */}
        <div className="left-panel">
          {/* Player Info */}
          <div className="player-info-row">
            <div
              className={`player-info ${gameState.turn === "white" ? "active" : ""}`}
            >
              <div className="player-indicator" />
              <span className="player-name">{player1.name}</span>
              <span className="player-model">{player1.model}</span>
            </div>

            <div
              className={`player-info ${gameState.turn === "black" ? "active" : ""}`}
            >
              <div className="player-indicator" />
              <span className="player-name">{player2.name}</span>
              <span className="player-model">{player2.model}</span>
            </div>
          </div>

          {/* Game Board */}
          <div className="game-board-section">
            <GameBoard showLastMove={true} showLegalMoves={false} />
          </div>

          {/* Director Panel */}
          <div className="director-panel-section">
            <DirectorPanel
              onDownloadLogs={downloadLogs}
              onToggleSettings={toggleSettings}
              onToggleRawJson={toggleRawJson}
              showRawJson={showRawJson}
              gameState={gameState}
              player1={player1}
              player2={player2}
              globalSettings={globalSettings}
              updateGlobalSettings={updateGlobalSettings}
              onStartGame={handleStartGame}
              onPauseGame={handlePauseGame}
              onResetGame={handleResetGame}
              onSettingChange={handleSettingChange}
              onApplyPersona={applyPersona}
            />
          </div>
        </div>

        {/* Right Panel - Battle Feed & Telemetry */}
        <div className="right-panel">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-btn ${activeTab === "feed" ? "active" : ""}`}
              onClick={() => setActiveTab("feed")}
            >
              Battle Feed
            </button>
            <button
              className={`tab-btn ${activeTab === "telemetry" ? "active" : ""}`}
              onClick={() => setActiveTab("telemetry")}
            >
              Telemetry
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === "feed" && (
              <BattleFeed
                showRawJson={showRawJson}
                autoScroll={globalSettings.autoScroll}
              />
            )}

            {activeTab === "telemetry" && <TelemetryPanel />}
          </div>

          {/* Raw JSON Panel */}
          {showRawJson && (
            <div className="raw-json-panel">
              <div className="raw-json-header">
                <h3 className="raw-json-title">Raw State</h3>
                <button onClick={toggleRawJson} className="raw-json-close">
                  <EyeOff className="raw-json-close-icon" />
                </button>
              </div>
              <div className="raw-json-content">
                <pre className="raw-json-pre">
                  {JSON.stringify(
                    {
                      gameState,
                      player1: {
                        ...player1,
                        apiKey: player1.apiKey ? "***" : "",
                      },
                      player2: {
                        ...player2,
                        apiKey: player2.apiKey ? "***" : "",
                      },
                      globalSettings,
                      stats: {
                        moves: logs.filter((l) => l.type === LOG_TYPES.MOVE)
                          .length,
                        totalLogs: logs.length,
                        hallucinations:
                          stats.hallucinationsByPlayer.player1 +
                          stats.hallucinationsByPlayer.player2,
                      },
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel (Collapsible) */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-header">
            <h2 className="settings-title">Settings</h2>
            <button onClick={toggleSettings} className="settings-close-btn">
              <ChevronUp className="settings-close-icon" />
            </button>
          </div>

          <div className="settings-content">
            {/* Player 1 Settings */}
            <div className="settings-section">
              <h3 className="settings-section-title">
                Player 1 (White) - {player1.name}
              </h3>

              <div className="settings-grid">
                <div className="settings-field">
                  <label className="settings-label">Persona</label>
                  <select
                    className="settings-select"
                    value={player1.name}
                    onChange={(e) => {
                      const personaKey = Object.keys(PERSONAS).find(
                        (k) => PERSONAS[k].name === e.target.value,
                      );
                      if (personaKey) applyPersona("player1", personaKey);
                    }}
                  >
                    {Object.values(PERSONAS).map((persona) => (
                      <option key={persona.name} value={persona.name}>
                        {persona.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="settings-field">
                  <label className="settings-label">Provider</label>
                  <select
                    className="settings-select"
                    value={player1.providerType}
                    onChange={(e) =>
                      handleSettingChange(
                        "player1",
                        "providerType",
                        e.target.value,
                      )
                    }
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="groq">Groq</option>
                    <option value="xai">xAI</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label className="settings-label">Base URL</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={player1.baseUrl}
                    onChange={(e) =>
                      handleSettingChange("player1", "baseUrl", e.target.value)
                    }
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-label">Model</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={player1.model}
                    onChange={(e) =>
                      handleSettingChange("player1", "model", e.target.value)
                    }
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-label">API Key</label>
                  <input
                    type="password"
                    className="settings-input"
                    value={player1.apiKey}
                    onChange={(e) =>
                      handleSettingChange("player1", "apiKey", e.target.value)
                    }
                    placeholder="Enter API key..."
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-label">
                    Temperature: {player1.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    className="settings-range"
                    value={player1.temperature}
                    onChange={(e) =>
                      handleSettingChange(
                        "player1",
                        "temperature",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Player 2 Settings */}
            <div className="settings-section">
              <h3 className="settings-section-title">
                Player 2 (Black) - {player2.name}
              </h3>

              <div className="settings-grid">
                <div className="settings-field">
                  <label className="settings-label">Persona</label>
                  <select
                    className="settings-select"
                    value={player2.name}
                    onChange={(e) => {
                      const personaKey = Object.keys(PERSONAS).find(
                        (k) => PERSONAS[k].name === e.target.value,
                      );
                      if (personaKey) applyPersona("player2", personaKey);
                    }}
                  >
                    {Object.values(PERSONAS).map((persona) => (
                      <option key={persona.name} value={persona.name}>
                        {persona.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="settings-field">
                  <label className="settings-label">Provider</label>
                  <select
                    className="settings-select"
                    value={player2.providerType}
                    onChange={(e) =>
                      handleSettingChange(
                        "player2",
                        "providerType",
                        e.target.value,
                      )
                    }
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="groq">Groq</option>
                    <option value="xai">xAI</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label className="settings-label">Base URL</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={player2.baseUrl}
                    onChange={(e) =>
                      handleSettingChange("player2", "baseUrl", e.target.value)
                    }
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-label">Model</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={player2.model}
                    onChange={(e) =>
                      handleSettingChange("player2", "model", e.target.value)
                    }
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-label">API Key</label>
                  <input
                    type="password"
                    className="settings-input"
                    value={player2.apiKey}
                    onChange={(e) =>
                      handleSettingChange("player2", "apiKey", e.target.value)
                    }
                    placeholder="Enter API key..."
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-label">
                    Temperature: {player2.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    className="settings-range"
                    value={player2.temperature}
                    onChange={(e) =>
                      handleSettingChange(
                        "player2",
                        "temperature",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Global Settings */}
            <div className="settings-section">
              <h3 className="settings-section-title">Global Settings</h3>

              <div className="settings-grid">
                <div className="settings-field">
                  <label className="settings-label">Turn Delay (ms)</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="100"
                    className="settings-input"
                    value={globalSettings.turnDelay}
                    onChange={(e) =>
                      updateGlobalSettings({
                        turnDelay: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-label">
                    Max Hallucination Retries
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="settings-input"
                    value={globalSettings.maxHallucinationRetries}
                    onChange={(e) =>
                      updateGlobalSettings({
                        maxHallucinationRetries: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="settings-field checkbox">
                  <label className="settings-checkbox-label">
                    <input
                      type="checkbox"
                      checked={globalSettings.enableTelemetry}
                      onChange={(e) =>
                        updateGlobalSettings({
                          enableTelemetry: e.target.checked,
                        })
                      }
                      className="settings-checkbox"
                    />
                    Enable Telemetry
                  </label>
                </div>

                <div className="settings-field checkbox">
                  <label className="settings-checkbox-label">
                    <input
                      type="checkbox"
                      checked={globalSettings.autoScroll}
                      onChange={(e) =>
                        updateGlobalSettings({ autoScroll: e.target.checked })
                      }
                      className="settings-checkbox"
                    />
                    Auto-scroll Logs
                  </label>
                </div>

                <div className="settings-field checkbox">
                  <label className="settings-checkbox-label">
                    <input
                      type="checkbox"
                      checked={globalSettings.streamResponses}
                      onChange={(e) =>
                        updateGlobalSettings({
                          streamResponses: e.target.checked,
                        })
                      }
                      className="settings-checkbox"
                    />
                    Stream Responses
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-left">
          <span className="footer-info">
            {gameState.moveNumber} moves • {player1.name} vs {player2.name}
          </span>
        </div>
        <div className="footer-right">
          <span className="footer-info">
            {stats.hallucinationsByPlayer.player1 +
              stats.hallucinationsByPlayer.player2}{" "}
            hallucinations •{globalSettings.turnDelay}ms delay
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
