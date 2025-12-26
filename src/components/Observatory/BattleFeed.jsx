import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useBattleLogStore, LOG_TYPES } from "../../store/battleLogStore.js";
import {
  Brain,
  MessageSquare,
  AlertTriangle,
  Terminal,
  Zap,
  User,
} from "lucide-react";

/**
 * BattleFeed Component
 * Virtualized log display with dual-layer rendering (Whisper + Shout)
 */
export function BattleFeed({ showRawJson = false, autoScroll = true }) {
  const { logs, stats } = useBattleLogStore();
  const [filterTypes, setFilterTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const feedRef = useRef(null);

  /**
   * Filter logs based on selected types and search query
   */
  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Apply type filter
    if (filterTypes.length > 0) {
      filtered = filtered.filter((log) => filterTypes.includes(log.type));
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.content.toLowerCase().includes(query) ||
          (log.player && log.player.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [logs, filterTypes, searchQuery]);

  /**
   * Auto-scroll to bottom
   */
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  /**
   * Toggle filter type
   */
  const toggleFilter = useCallback((type) => {
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilterTypes([]);
    setSearchQuery("");
  }, []);

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  /**
   * Get log type icon
   */
  const getLogIcon = (type) => {
    const icons = {
      [LOG_TYPES.SYSTEM]: Terminal,
      [LOG_TYPES.TURN]: Zap,
      [LOG_TYPES.MOVE]: MessageSquare,
      [LOG_TYPES.THOUGHT]: Brain,
      [LOG_TYPES.TRASH]: MessageSquare,
      [LOG_TYPES.HALLUCINATION]: AlertTriangle,
      [LOG_TYPES.ERROR]: AlertTriangle,
      [LOG_TYPES.WARNING]: AlertTriangle,
      [LOG_TYPES.DIRECTOR]: User,
      [LOG_TYPES.TELEMETRY]: Terminal,
    };

    return icons[type] || Terminal;
  };

  /**
   * Get log type color
   */
  const getLogColor = (type) => {
    const colors = {
      [LOG_TYPES.SYSTEM]: "text-gray-500",
      [LOG_TYPES.TURN]: "text-blue-500",
      [LOG_TYPES.MOVE]: "text-emerald-500",
      [LOG_TYPES.THOUGHT]: "text-amber-500/70",
      [LOG_TYPES.TRASH]: "text-purple-500",
      [LOG_TYPES.HALLUCINATION]: "text-amber-500",
      [LOG_TYPES.ERROR]: "text-red-500",
      [LOG_TYPES.WARNING]: "text-amber-500",
      [LOG_TYPES.DIRECTOR]: "text-cyan-500",
      [LOG_TYPES.TELEMETRY]: "text-gray-600",
    };

    return colors[type] || "text-gray-500";
  };

  /**
   * Render log entry based on type
   */
  const renderLogEntry = (log, index) => {
    const Icon = getLogIcon(log.type);
    const timestamp = formatTimestamp(log.timestamp);

    switch (log.type) {
      case LOG_TYPES.SYSTEM:
        return (
          <div key={log.id} className="log-entry system">
            <div className="log-header">
              <Icon className="log-icon system" />
              <span className="log-timestamp">{timestamp}</span>
              <span className="log-type">SYSTEM</span>
            </div>
            <div className="log-content">{log.content}</div>
          </div>
        );

      case LOG_TYPES.TURN:
        return (
          <div key={log.id} className="log-entry turn">
            <div className="log-header">
              <Icon className="log-icon turn" />
              <span className="log-timestamp">{timestamp}</span>
              <span className="log-player">{log.player}</span>
            </div>
            <div className="log-content turn-divider">{log.content}</div>
          </div>
        );

      case LOG_TYPES.MOVE:
        return (
          <div key={log.id} className="log-entry move">
            <div className="log-header">
              <Icon className="log-icon move" />
              <span className="log-timestamp">{timestamp}</span>
              <span className="log-player">{log.player}</span>
            </div>
            <div className="log-content move-content">
              <span className="move-san">{log.content}</span>
            </div>
          </div>
        );

      case LOG_TYPES.THOUGHT:
        return (
          <div key={log.id} className="log-entry thought">
            <div className="log-header">
              <Icon className="log-icon thought" />
              <span className="log-timestamp">{timestamp}</span>
              <span className="log-type">AI WHISPER</span>
              <span className="log-player">{log.player}</span>
            </div>
            <div className="log-content thought-content">"{log.content}"</div>
          </div>
        );

      case LOG_TYPES.TRASH:
        return (
          <div key={log.id} className="log-entry trash">
            <div className="log-header">
              <Icon className="log-icon trash" />
              <span className="log-timestamp">{timestamp}</span>
              <span className="log-type">PUBLIC TAUNT</span>
              <span className="log-player">{log.player}</span>
            </div>
            <div className="log-content trash-content">**"{log.content}"**</div>
          </div>
        );

      case LOG_TYPES.HALLUCINATION:
        return (
          <div key={log.id} className="log-entry hallucination">
            <div className="log-header">
              <Icon className="log-icon hallucination" />
              <span className="log-timestamp">{timestamp}</span>
              <span className="log-type">HALLUCINATION</span>
              <span className="log-player">{log.player}</span>
            </div>
            <div className="log-content">{log.content}</div>
          </div>
        );

      case LOG_TYPES.ERROR:
        return (
          <div key={log.id} className="log-entry error">
            <div className="log-header">
              <Icon className="log-icon error" />
              <span className="log-timestamp">{timestamp}</span>
              <span className="log-type">ERROR</span>
              <span className="log-player">{log.player}</span>
            </div>
            <div className="log-content">{log.content}</div>
          </div>
        );

      case LOG_TYPES.WARNING:
        return (
          <div key={log.id} className="log-entry warning">
            <div className="log-header">
              <Icon className="log-icon warning" />
              <span className="log-timestamp">{timestamp}</span>
              <span className="log-type">WARNING</span>
              <span className="log-player">{log.player}</span>
            </div>
            <div className="log-content">{log.content}</div>
          </div>
        );

      case LOG_TYPES.DIRECTOR:
        return (
          <div key={log.id} className="log-entry director">
            <div className="log-header">
              <Icon className="log-icon director" />
              <span className="log-timestamp">{timestamp}</span>
              <span className="log-type">DIRECTOR</span>
            </div>
            <div className="log-content">{log.content}</div>
          </div>
        );

      default:
        return (
          <div key={log.id} className="log-entry">
            <div className="log-header">
              <Icon className="log-icon" />
              <span className="log-timestamp">{timestamp}</span>
              <span className="log-type">{log.type}</span>
            </div>
            <div className="log-content">{log.content}</div>
          </div>
        );
    }
  };

  return (
    <div className="battle-feed">
      {/* Header */}
      <div className="battle-feed-header">
        <div className="feed-title">
          <MessageSquare className="feed-icon" />
          <span>BATTLE FEED</span>
          <span className="log-count">({filteredLogs.length})</span>
        </div>

        {/* Filter Controls */}
        <div className="feed-filters">
          {Object.values(LOG_TYPES).map((type) => (
            <button
              key={type}
              className={`
                filter-btn
                ${filterTypes.includes(type) ? "active" : ""}
              `}
              onClick={() => toggleFilter(type)}
              title={`Filter ${type} logs`}
            >
              {type}
            </button>
          ))}

          <button
            className="filter-btn clear"
            onClick={clearFilters}
            title="Clear filters"
          >
            Clear
          </button>
        </div>

        {/* Search */}
        <div className="feed-search">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Stats Bar */}
      <div className="feed-stats">
        <div className="stat-item">
          <span className="stat-label">Total Moves:</span>
          <span className="stat-value">{stats.totalMoves}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Exchanges:</span>
          <span className="stat-value">{stats.totalExchanges}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Hallucinations:</span>
          <span className="stat-value error">
            {stats.hallucinationsByPlayer.player1 +
              stats.hallucinationsByPlayer.player2}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">P1 Hallus:</span>
          <span className="stat-value">
            {stats.hallucinationsByPlayer.player1}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">P2 Hallus:</span>
          <span className="stat-value">
            {stats.hallucinationsByPlayer.player2}
          </span>
        </div>
      </div>

      {/* Feed Container */}
      <div className="feed-container" ref={feedRef}>
        {filteredLogs.length === 0 ? (
          <div className="feed-empty">
            <Terminal className="empty-icon" />
            <p>No logs yet. Configure players and start the battle.</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => renderLogEntry(log, index))
        )}
      </div>
    </div>
  );
}

export default BattleFeed;
