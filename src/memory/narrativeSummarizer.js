import { useBattleLogStore, LOG_TYPES } from '../store/battleLogStore.js';

/**
 * Narrative Summarizer
 * Handles early game compaction and strategic narrative generation
 * Reduces token usage while preserving tactical context
 */
export class NarrativeSummarizer {
  constructor() {
    this.compactionThreshold = 30; // Start compacting after 30 moves
    this.compactionBatchSize = 20; // Compact in batches of 20 moves
    this.maxEarlyMoves = 15; // Keep first 15 moves verbatim
  }

  /**
   * Compact battle log into narrative summary
   * @param {Array} battleLogs - All battle log entries
   * @returns {object} Compaction result
   */
  compactLogs(battleLogs) {
    const moveLogs = battleLogs.filter(log => log.type === LOG_TYPES.MOVE);

    if (moveLogs.length < this.compactionThreshold) {
      return {
        needsCompaction: false,
        earlyMoves: moveLogs,
        summary: null,
        remainingLogs: battleLogs
      };
    }

    const earlyMoves = moveLogs.slice(0, this.maxEarlyMoves);
    const compactedMoves = moveLogs.slice(this.maxEarlyMoves, -this.compactionBatchSize);
    const recentMoves = moveLogs.slice(-this.compactionBatchSize);

    const summary = this.generateSummary(compactedMoves);

    // Reconstruct logs: early moves + summary marker + recent moves + non-move logs
    const compactedLogs = [
      ...battleLogs.filter(log => !this.isMoveLog(log)),
      ...earlyMoves,
      {
        id: `summary-${Date.now()}`,
        type: 'summary',
        timestamp: compactedMoves[0]?.timestamp || Date.now(),
        content: summary,
        metadata: {
          moveRange: `${this.maxEarlyMoves + 1}-${moveLogs.length - this.compactionBatchSize}`,
          moveCount: compactedMoves.length
        }
      },
      ...recentMoves
    ];

    return {
      needsCompaction: true,
      earlyMoves,
      summary,
      summaryStart: this.maxEarlyMoves + 1,
      summaryEnd: moveLogs.length - this.compactionBatchSize,
      compactedLogs
    };
  }

  /**
   * Generate narrative summary from moves
   * @param {Array} moves - Array of move logs
   * @returns {string} Narrative summary
   */
  generateSummary(moves) {
    if (moves.length === 0) return '';

    const tacticalEvents = this.identifyTacticalEvents(moves);
    const openingPhase = this.identifyOpeningPhase(moves);
    const middlegameTheme = this.identifyMiddlegameTheme(moves);
    const endgameTransition = this.checkEndgameTransition(moves);

    let summary = `=== GAME NARRATIVE (Moves ${this.maxEarlyMoves + 1}-${moves[moves.length - 1]?.metadata?.moveNumber || '?'}) ===\n\n`;

    if (openingPhase) {
      summary += `**Opening Phase**: ${openingPhase}\n\n`;
    }

    if (middlegameTheme) {
      summary += `**Middlegame Theme**: ${middlegameTheme}\n\n`;
    }

    if (tacticalEvents.length > 0) {
      summary += `**Key Events**:\n`;
      tacticalEvents.forEach(event => {
        summary += `- ${event}\n`;
      });
      summary += '\n';
    }

    if (endgameTransition) {
      summary += `**Endgame Transition**: ${endgameTransition}\n\n`;
    }

    summary += `**Summary**: ${this.generateOverallSummary(moves)}`;

    return summary;
  }

  /**
   * Identify tactical events in a sequence of moves
   * @param {Array} moves - Move logs
   * @returns {Array<string>} Tactical event descriptions
   */
  identifyTacticalEvents(moves) {
    const events = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const moveText = move.content;

      // Captures
      if (moveText.includes('x')) {
        const pieceType = this.getPieceTypeFromSan(moveText);
        events.push(`Capture by ${pieceType} at ${moveText}`);
      }

      // Castling
      if (moveText.includes('O-O')) {
        events.push(`Castling ${moveText === 'O-O-O' ? 'queenside' : 'kingside'}`);
      }

      // Checks
      if (moveText.includes('+')) {
        events.push(`Check delivered with ${moveText}`);
      }

      // Queen promotions
      if (moveText.includes('=Q')) {
        events.push(`Queen promotion at ${moveText}`);
      }

      // Knight moves in center
      if (moveText.toLowerCase().startsWith('n')) {
        const targetSquare = moveText.slice(-2);
        const centerSquares = ['d4', 'e4', 'd5', 'e5'];
        if (centerSquares.includes(targetSquare.toLowerCase())) {
          events.push(`Knight centralized to ${targetSquare}`);
        }
      }
    }

    return events;
  }

  /**
   * Identify opening phase
   * @param {Array} moves - Move logs
   * @returns {string|null} Opening description
   */
  identifyOpeningPhase(moves) {
    if (moves.length < 2) return null;

    const firstMoves = moves.slice(0, 4).map(m => m.content);

    // Common opening patterns
    const openings = {
      'Sicilian Defense': ['e4', 'c5'],
      'King\'s Pawn Opening': ['e4', 'e5'],
      'Queen\'s Pawn Opening': ['d4', 'd5'],
      'French Defense': ['e4', 'e6'],
      'Caro-Kann Defense': ['e4', 'c6'],
      'Indian Defenses': ['d4', 'Nf6'],
      'English Opening': ['c4'],
      'Reti Opening': ['Nf3'],
      'Dutch Defense': ['d4', 'f5']
    };

    for (const [name, pattern] of Object.entries(openings)) {
      if (this.matchesPattern(firstMoves, pattern)) {
        return name;
      }
    }

    return 'Unknown opening system';
  }

  /**
   * Identify middlegame theme
   * @param {Array} moves - Move logs
   * @returns {string|null} Theme description
   */
  identifyMiddlegameTheme(moves) {
    const captures = moves.filter(m => m.content.includes('x')).length;
    const checks = moves.filter(m => m.content.includes('+')).length;
    const pieceActivity = moves.filter(m => /[QRBN]/.test(m.content)).length;

    if (captures > moves.length * 0.3) {
      return 'Highly tactical with multiple captures';
    }

    if (checks > moves.length * 0.2) {
      return 'Aggressive attacking play';
    }

    if (pieceActivity > moves.length * 0.7) {
      return 'Active piece development';
    }

    if (captures < moves.length * 0.1 && checks < 2) {
      return 'Positional maneuvering';
    }

    return 'Balanced middlegame';
  }

  /**
   * Check for endgame transition
   * @param {Array} moves - Move logs
   * @returns {string|null} Transition description
   */
  checkEndgameTransition(moves) {
    const lastMoves = moves.slice(-5);
    const promotions = lastMoves.filter(m => m.content.includes('=')).length;
    const exchanges = lastMoves.filter(m => m.content.includes('x')).length;

    if (promotions > 0) {
      return 'Pawn promotion activity suggests endgame phase';
    }

    if (exchanges >= 4) {
      return 'Heavy piece exchange reducing material';
    }

    return null;
  }

  /**
   * Generate overall summary
   * @param {Array} moves - Move logs
   * @returns {string} Summary text
   */
  generateOverallSummary(moves) {
    const totalMoves = moves.length;
    const captures = moves.filter(m => m.content.includes('x')).length;
    const checks = moves.filter(m => m.content.includes('+')).length;
    const castlings = moves.filter(m => m.content.includes('O-O')).length;

    let summary = `${totalMoves} moves played`;

    if (captures > 0) {
      summary += ` with ${captures} captures`;
    }

    if (checks > 0) {
      summary += `, ${checks} checks delivered`;
    }

    if (castlings > 0) {
      summary += `, ${castlings} castlings`;
    }

    const captureRate = captures / totalMoves;
    if (captureRate > 0.4) {
      summary += '. Highly tactical sequence with frequent material exchange.';
    } else if (captureRate < 0.1) {
      summary += '. Positional play with minimal material exchange.';
    } else {
      summary += '. Balanced mix of tactical and positional play.';
    }

    return summary;
  }

  /**
   * Extract piece type from SAN notation
   * @param {string} san - SAN notation
   * @returns {string} Piece type
   */
  getPieceTypeFromSan(san) {
    const pieceChars = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };
    const firstChar = san.charAt(0).toUpperCase();
    return pieceChars[firstChar] || 'Pawn';
  }

  /**
   * Check if moves match an opening pattern
   * @param {Array} moves - Actual moves
   * @param {Array} pattern - Expected pattern
   * @returns {boolean}
   */
  matchesPattern(moves, pattern) {
    for (let i = 0; i < pattern.length && i < moves.length; i++) {
      if (moves[i].content.toLowerCase() !== pattern[i].toLowerCase()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if log is a move log
   * @param {object} log - Log entry
   * @returns {boolean}
   */
  isMoveLog(log) {
    return log.type === LOG_TYPES.MOVE;
  }

  /**
   * Build context prompt with compaction
   * @param {object} playerConfig - Player config
   * @param {boolean} isPlayer1 - Player ID
   * @param {object} gameState - Game state
   * @param {Array} battleLogs - Battle logs (may include summaries)
   * @returns {string} Context prompt
   */
  buildCompactedContext(playerConfig, isPlayer1, gameState, battleLogs) {
    const prompt = [];

    prompt.push(this.buildSystemAnchor(playerConfig));
    prompt.push(this.buildGameStateSection(gameState, isPlayer1));
    prompt.push(this.buildCompactedMoveHistory(battleLogs));
    prompt.push(this.buildActiveDialogueWindow(battleLogs, isPlayer1));
    prompt.push(this.buildTaskInstruction(gameState, isPlayer1));

    return prompt.join('\n\n');
  }

  /**
   * Build system anchor (same as ContextBuilder)
   */
  buildSystemAnchor(playerConfig) {
    return `=== YOUR IDENTITY ===\nYou are: ${playerConfig.name}\n\n${playerConfig.systemPrompt}\n\nREMEMBER: Your identity and personality are FIXED. Do not change them regardless of game state.`;
  }

  /**
   * Build game state section (simplified version)
   */
  buildGameStateSection(gameState, isPlayer1) {
    return `=== CURRENT GAME STATE ===\n\nPosition (FEN): ${gameState.fen}\n\nCurrent Turn: ${gameState.turn === 'white' ? 'White' : 'Black'}\nYour Turn: ${isPlayer1 ? 'White' : 'Black'}\nMove Number: ${gameState.moveNumber}`;
  }

  /**
   * Build compacted move history section
   */
  buildCompactedMoveHistory(battleLogs) {
    let section = '=== MOVE HISTORY ===\n';

    // Split into: early moves, summaries, recent moves
    const earlyMoves = battleLogs.filter(log =>
      log.type === LOG_TYPES.MOVE && log.metadata?.moveNumber <= this.maxEarlyMoves
    );

    const summaries = battleLogs.filter(log => log.type === 'summary');

    const recentMoves = battleLogs.filter(log =>
      log.type === LOG_TYPES.MOVE && log.metadata?.moveNumber > this.maxEarlyMoves
    );

    if (earlyMoves.length > 0) {
      section += '\n**Opening Moves**:\n';
      earlyMoves.slice(0, 15).forEach(move => {
        section += `${move.content} `;
      });
      section += '\n';
    }

    if (summaries.length > 0) {
      section += '\n';
      summaries.forEach(summary => {
        section += `${summary.content}\n`;
      });
    }

    if (recentMoves.length > 0) {
      section += '\n**Recent Moves**:\n';
      recentMoves.slice(-10).forEach(move => {
        section += `${move.content} `;
      });
      section += '\n';
    }

    return section;
  }

  /**
   * Build active dialogue window (same as ContextBuilder)
   */
  buildActiveDialogueWindow(battleLogs, isPlayer1) {
    const dialogueLogs = battleLogs.filter(log =>
      log.type === LOG_TYPES.THOUGHT || log.type === LOG_TYPES.TRASH
    );

    if (dialogueLogs.length === 0) {
      return '=== RECENT DIALOGUE ===\nNo dialogue yet.';
    }

    let section = '=== RECENT DIALOGUE (Last 6 Exchanges) ===\n';
    const recentDialogue = dialogueLogs.slice(-12);

    recentDialogue.forEach(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });

      if (log.type === LOG_TYPES.THOUGHT) {
        section += `\n[${timestamp}] ${log.player}: "${log.content}"\n`;
      } else if (log.type === LOG_TYPES.TRASH) {
        section += `\n[${timestamp}] ${log.player} **"${log.content}"**\n`;
      }
    });

    return section;
  }

  /**
   * Build task instruction (same as ContextBuilder)
   */
  buildTaskInstruction(gameState, isPlayer1) {
    const playerTurn = isPlayer1 ? 'White' : 'Black';
    const currentTurn = gameState.turn === 'white' ? 'White' : 'Black';
    const isYourTurn = playerTurn === currentTurn;

    if (!isYourTurn) {
      return `=== WAIT ===\nIt is NOT your turn yet.`;
    }

    return `=== YOUR TASK ===\nAnalyze position and make your move as ${playerTurn}. Use valid SAN notation.`;
  }

  /**
   * Get compaction statistics
   * @param {object} compactionResult - Result from compactLogs()
   * @returns {object} Statistics
   */
  getCompactionStats(compactionResult) {
    if (!compactionResult.needsCompaction) {
      return {
        compactionEnabled: false,
        reason: `Below threshold (${this.compactionThreshold} moves)`
      };
    }

    const originalLogs = compactionResult.earlyMoves.length + (compactionResult.summaryEnd - compactionResult.summaryStart);
    const compactedLogs = compactionResult.earlyMoves.length + 1; // 1 summary entry
    const reduction = 1 - (compactedLogs / originalLogs);

    return {
      compactionEnabled: true,
      originalMoveCount: originalLogs,
      compactedMoveCount: compactedLogs,
      entriesRemoved: originalLogs - compactedLogs,
      reductionPercentage: (reduction * 100).toFixed(1),
      summaryRange: `${compactionResult.summaryStart}-${compactionResult.summaryEnd}`
    };
  }
}

// Singleton instance
export const narrativeSummarizer = new NarrativeSummarizer();
