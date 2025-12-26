import React, { useMemo } from "react";
import { useProviderStore } from "../../store/providerStore.js";
import { useBattleLogStore } from "../../store/battleLogStore.js";
import { useGameStateStore } from "../../store/gameStateStore.js";
import {
  BarChart3,
  Activity,
  Clock,
  Zap,
  AlertTriangle,
  Cpu,
  TrendingUp,
} from "lucide-react";

/**
 * TelemetryPanel Component
 * Real-time metrics and performance visualization
 */
export function TelemetryPanel() {
  const { telemetry, getAverageLatency, player1, player2 } = useProviderStore();
  const { stats } = useBattleLogStore();
  const { gameState } = useGameStateStore();

  /**
   * Calculate latency bar width percentage
   */
  const getLatencyBarWidth = (latency) => {
    const maxLatency = 10000; // 10 seconds
    return Math.min((latency / maxLatency) * 100, 100);
  };

  /**
   * Get latency color based on value
   */
  const getLatencyColor = (latency) => {
    if (latency < 1000) return "text-emerald-500";
    if (latency < 3000) return "text-amber-500";
    return "text-red-500";
  };

  /**
   * Calculate token usage rate
   */
  const getTokenUsageRate = () => {
    const totalTokens =
      telemetry.player1.totalTokens + telemetry.player2.totalTokens;
    const totalMoves = stats.totalMoves;
    if (totalMoves === 0) return 0;
    return Math.round(totalTokens / totalMoves);
  };

  /**
   * Calculate error rate
   */
  const getErrorRate = () => {
    const totalRequests =
      telemetry.player1.totalRequests + telemetry.player2.totalRequests;
    const totalErrors =
      telemetry.player1.errorCount + telemetry.player2.errorCount;
    if (totalRequests === 0) return 0;
    return ((totalErrors / totalRequests) * 100).toFixed(1);
  };

  /**
   * Calculate hallucination rate
   */
  const getHallucinationRate = () => {
    const totalMoves = stats.totalMoves;
    const totalHallucinations =
      stats.hallucinationsByPlayer.player1 +
      stats.hallucinationsByPlayer.player2;
    if (totalMoves === 0) return 0;
    return ((totalHallucinations / totalMoves) * 100).toFixed(1);
  };

  /**
   * Get player stats
   */
  const getPlayerStats = (playerId) => {
    const playerData =
      playerId === "player1" ? telemetry.player1 : telemetry.player2;
    const playerConfig = playerId === "player1" ? player1 : player2;

    return {
      name: playerConfig.name,
      requests: playerData.totalRequests,
      tokens: playerData.totalTokens,
      latency: getAverageLatency(playerId),
      errors: playerData.errorCount,
      lastRequest: playerData.lastRequestTime,
    };
  };

  const p1Stats = getPlayerStats("player1");
  const p2Stats = getPlayerStats("player2");

  const tokenUsageRate = getTokenUsageRate();
  const errorRate = getErrorRate();
  const hallucinationRate = getHallucinationRate();

  /**
   * Format latency
   */
  const formatLatency = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="telemetry-panel">
      {/* Header */}
      <div className="telemetry-header">
        <BarChart3 className="telemetry-icon" />
        <span className="telemetry-title">TELEMETRY</span>
        <span
          className={`status-indicator ${gameState.status === "running" ? "active" : "inactive"}`}
        />
      </div>

      {/* Overall Stats */}
      <div className="telemetry-section">
        <h3 className="telemetry-section-title">OVERALL METRICS</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <Activity className="metric-icon" />
            <div className="metric-value">{stats.totalMoves}</div>
            <div className="metric-label">Total Moves</div>
          </div>

          <div className="metric-card">
            <Zap className="metric-icon" />
            <div className="metric-value">{tokenUsageRate}</div>
            <div className="metric-label">Tokens/Move</div>
          </div>

          <div className="metric-card">
            <Clock className="metric-icon" />
            <div className="metric-value">
              {formatLatency(p1Stats.latency + p2Stats.latency)}
            </div>
            <div className="metric-label">Avg Latency</div>
          </div>

          <div className="metric-card">
            <TrendingUp className="metric-icon" />
            <div className="metric-value">{gameState.moveNumber}</div>
            <div className="metric-label">Move Number</div>
          </div>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="telemetry-section">
        <h3 className="telemetry-section-title">QUALITY METRICS</h3>
        <div className="quality-metrics">
          <div className="quality-metric">
            <div className="quality-metric-header">
              <span className="quality-metric-label">Error Rate</span>
              <span
                className={`quality-metric-value ${parseFloat(errorRate) > 10 ? "error" : "ok"}`}
              >
                {errorRate}%
              </span>
            </div>
            <div className="quality-metric-bar">
              <div
                className="quality-metric-bar-fill error"
                style={{ width: `${Math.min(errorRate, 100)}%` }}
              />
            </div>
          </div>

          <div className="quality-metric">
            <div className="quality-metric-header">
              <span className="quality-metric-label">Hallucination Rate</span>
              <span
                className={`quality-metric-value ${parseFloat(hallucinationRate) > 15 ? "warning" : "ok"}`}
              >
                {hallucinationRate}%
              </span>
            </div>
            <div className="quality-metric-bar">
              <div
                className="quality-metric-bar-fill warning"
                style={{ width: `${Math.min(hallucinationRate, 100)}%` }}
              />
            </div>
          </div>

          <div className="quality-metric">
            <div className="quality-metric-header">
              <span className="quality-metric-label">P1 Hallucinations</span>
              <span className="quality-metric-value">
                {stats.hallucinationsByPlayer.player1}
              </span>
            </div>
          </div>

          <div className="quality-metric">
            <div className="quality-metric-header">
              <span className="quality-metric-label">P2 Hallucinations</span>
              <span className="quality-metric-value">
                {stats.hallucinationsByPlayer.player2}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Player 1 Stats */}
      <div className="telemetry-section">
        <h3 className="telemetry-section-title">PLAYER 1: {p1Stats.name}</h3>
        <div className="player-stats">
          <div className="player-stat-row">
            <span className="player-stat-label">Requests</span>
            <span className="player-stat-value">{p1Stats.requests}</span>
          </div>
          <div className="player-stat-row">
            <span className="player-stat-label">Total Tokens</span>
            <span className="player-stat-value">{p1Stats.tokens}</span>
          </div>
          <div className="player-stat-row">
            <span className="player-stat-label">Errors</span>
            <span
              className={`player-stat-value ${p1Stats.errors > 0 ? "error" : "ok"}`}
            >
              {p1Stats.errors}
            </span>
          </div>
          <div className="player-stat-row">
            <span className="player-stat-label">Avg Latency</span>
            <span
              className={`player-stat-value ${getLatencyColor(p1Stats.latency)}`}
            >
              {formatLatency(p1Stats.latency)}
            </span>
          </div>
          <div className="player-stat-row">
            <span className="player-stat-label">Last Request</span>
            <span className="player-stat-value timestamp">
              {formatTimestamp(p1Stats.lastRequest)}
            </span>
          </div>

          {/* Latency Bar */}
          {p1Stats.latency > 0 && (
            <div className="latency-bar-container">
              <span className="latency-bar-label">Latency:</span>
              <div className="latency-bar">
                <div
                  className={`latency-bar-fill ${p1Stats.latency < 1000 ? "good" : p1Stats.latency < 3000 ? "warning" : "error"}`}
                  style={{ width: `${getLatencyBarWidth(p1Stats.latency)}%` }}
                />
              </div>
              <span className="latency-bar-value">
                {formatLatency(p1Stats.latency)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Player 2 Stats */}
      <div className="telemetry-section">
        <h3 className="telemetry-section-title">PLAYER 2: {p2Stats.name}</h3>
        <div className="player-stats">
          <div className="player-stat-row">
            <span className="player-stat-label">Requests</span>
            <span className="player-stat-value">{p2Stats.requests}</span>
          </div>
          <div className="player-stat-row">
            <span className="player-stat-label">Total Tokens</span>
            <span className="player-stat-value">{p2Stats.tokens}</span>
          </div>
          <div className="player-stat-row">
            <span className="player-stat-label">Errors</span>
            <span
              className={`player-stat-value ${p2Stats.errors > 0 ? "error" : "ok"}`}
            >
              {p2Stats.errors}
            </span>
          </div>
          <div className="player-stat-row">
            <span className="player-stat-label">Avg Latency</span>
            <span
              className={`player-stat-value ${getLatencyColor(p2Stats.latency)}`}
            >
              {formatLatency(p2Stats.latency)}
            </span>
          </div>
          <div className="player-stat-row">
            <span className="player-stat-label">Last Request</span>
            <span className="player-stat-value timestamp">
              {formatTimestamp(p2Stats.lastRequest)}
            </span>
          </div>

          {/* Latency Bar */}
          {p2Stats.latency > 0 && (
            <div className="latency-bar-container">
              <span className="latency-bar-label">Latency:</span>
              <div className="latency-bar">
                <div
                  className={`latency-bar-fill ${p2Stats.latency < 1000 ? "good" : p2Stats.latency < 3000 ? "warning" : "error"}`}
                  style={{ width: `${getLatencyBarWidth(p2Stats.latency)}%` }}
                />
              </div>
              <span className="latency-bar-value">
                {formatLatency(p2Stats.latency)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Token Usage Chart */}
      <div className="telemetry-section">
        <h3 className="telemetry-section-title">TOKEN USAGE</h3>
        <div className="token-usage-chart">
          <div className="token-usage-bar">
            <div className="token-usage-bar-label">P1 ({p1Stats.name})</div>
            <div className="token-usage-bar-track">
              <div
                className="token-usage-bar-fill player1"
                style={{
                  width: `${(p1Stats.tokens / (p1Stats.tokens + p2Stats.tokens)) * 100 || 0}%`,
                }}
              >
                <span className="token-usage-bar-value">{p1Stats.tokens}</span>
              </div>
            </div>
          </div>

          <div className="token-usage-bar">
            <div className="token-usage-bar-label">P2 ({p2Stats.name})</div>
            <div className="token-usage-bar-track">
              <div
                className="token-usage-bar-fill player2"
                style={{
                  width: `${(p2Stats.tokens / (p1Stats.tokens + p2Stats.tokens)) * 100 || 0}%`,
                }}
              >
                <span className="token-usage-bar-value">{p2Stats.tokens}</span>
              </div>
            </div>
          </div>

          <div className="token-usage-summary">
            <span className="token-usage-total">
              Total: {p1Stats.tokens + p2Stats.tokens} tokens
            </span>
            <span className="token-usage-rate">
              Avg: {tokenUsageRate} tokens/move
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TelemetryPanel;
