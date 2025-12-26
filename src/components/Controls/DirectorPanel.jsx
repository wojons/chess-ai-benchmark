import React, { useState } from "react";
import { useGameStateStore, GAME_STATUS } from "../../store/gameStateStore.js";
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Settings,
  User,
  Zap,
} from "lucide-react";

/**
 * DirectorPanel Component
 * Human intervention controls for AI battle
 */
export function DirectorPanel({
  onDownloadLogs,
  onToggleSettings,
  gameState,
  player1,
  player2,
  globalSettings,
  updateGlobalSettings,
  onStartGame,
  onPauseGame,
  onResetGame,
}) {
  const isPlayer1Turn = gameState?.turn === "white";
  const currentPlayer = isPlayer1Turn ? player1 : player2;

  return (
    <div className="director-panel">
      {/* Header */}
      <div className="director-header">
        <User className="director-icon" />
        <span className="director-title">DIRECTOR CONTROLS</span>
        <span className="game-status-badge">
          {gameState?.status?.toUpperCase() || "IDLE"}
        </span>
      </div>

      {/* Main Control Buttons */}
      <div className="director-controls-main">
        {gameState?.status === GAME_STATUS.IDLE ||
        gameState?.status === GAME_STATUS.PAUSED ? (
          <button
            onClick={onStartGame}
            disabled={!player1.apiKey || !player2.apiKey}
            className="control-btn control-btn-start"
            title="Start battle"
          >
            <Play className="control-icon" />
            <span>Start Battle</span>
          </button>
        ) : (
          <button
            onClick={onPauseGame}
            className="control-btn control-btn-pause"
            title="Pause battle"
          >
            <Pause className="control-icon" />
            <span>Pause</span>
          </button>
        )}

        <button
          onClick={onResetGame}
          className="control-btn control-btn-reset"
          title="Reset game"
        >
          <RotateCcw className="control-icon" />
          <span>Reset</span>
        </button>

        <button
          onClick={onDownloadLogs}
          className="control-btn control-btn-download"
          title="Download battle logs"
        >
          <Download className="control-icon" />
          <span>Download Log</span>
        </button>

        <button
          onClick={onToggleSettings}
          className="control-btn control-btn-settings"
          title="Toggle settings panel"
        >
          <Settings className="control-icon" />
          <span>Settings</span>
        </button>
      </div>

      {/* Current Turn Info */}
      <div className="director-section">
        <h3 className="director-section-title">CURRENT TURN</h3>
        <div className="current-turn-info">
          <div className="turn-player">
            <span className="turn-label">Player:</span>
            <span className="turn-value">{currentPlayer.name}</span>
          </div>
          <div className="turn-color">
            <span className="turn-label">Color:</span>
            <span className="turn-value">
              {gameState?.turn === "white" ? "White" : "Black"}
            </span>
          </div>
          <div className="turn-number">
            <span className="turn-label">Move:</span>
            <span className="turn-value">{gameState?.moveNumber || 1}</span>
          </div>
          {gameState?.status === GAME_STATUS.RUNNING && (
            <div className="turn-processing">
              <Zap className="processing-icon animate-pulse" />
              <span>AI is thinking...</span>
            </div>
          )}
        </div>
      </div>

      {/* Speed Control */}
      <div className="director-section">
        <h3 className="director-section-title">BATTLE SPEED</h3>
        <div className="speed-controls">
          <button
            className={`speed-btn ${globalSettings.turnDelay === 5000 ? "active" : ""}`}
            onClick={() => updateGlobalSettings({ turnDelay: 5000 })}
          >
            Slow
          </button>
          <button
            className={`speed-btn ${globalSettings.turnDelay === 2000 ? "active" : ""}`}
            onClick={() => updateGlobalSettings({ turnDelay: 2000 })}
          >
            Normal
          </button>
          <button
            className={`speed-btn ${globalSettings.turnDelay === 1000 ? "active" : ""}`}
            onClick={() => updateGlobalSettings({ turnDelay: 1000 })}
          >
            Fast
          </button>
          <button
            className={`speed-btn ${globalSettings.turnDelay === 0 ? "active" : ""}`}
            onClick={() => updateGlobalSettings({ turnDelay: 0 })}
          >
            Instant
          </button>
          <div className="speed-custom">
            <label className="speed-label">Custom:</label>
            <input
              type="number"
              min="0"
              max="10000"
              step="100"
              value={globalSettings.turnDelay}
              onChange={(e) =>
                updateGlobalSettings({
                  turnDelay: parseInt(e.target.value) || 0,
                })
              }
              className="speed-input"
            />
            <span className="speed-unit">ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DirectorPanel;
