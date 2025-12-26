import { useBattleLogStore, LOG_TYPES } from '../store/battleLogStore.js';
import { useGameStateStore } from '../store/gameStateStore.js';

/**
 * Context Builder
 * Manages sliding window prompts and context memory compaction
 */
export class ContextBuilder {
  constructor() {
    this.systemAnchorSize = 500;  // tokens
    this.activeWindowSize = 800;  // tokens for recent exchanges
    this.historyWindowSize = 400; // tokens for move history summary
    this.safetyMargin = 200;     // tokens
  }

  /**
   * Build complete prompt for AI
   * @param {object} playerConfig - Player configuration
   * @param {boolean} isPlayer1 - Whether this is Player 1
   * @param {object} gameState - Current game state
   * @param {Array} battleLogs - Battle log entries
   * @returns {string} Complete prompt
   */
  buildPrompt(playerConfig, isPlayer1, gameState, battleLogs) {
    const prompt = [];

    // 1. System Anchor (Persistent throughout game)
    prompt.push(this.buildSystemAnchor(playerConfig));

    // 2. Current Global State (High-fidelity snapshot)
    prompt.push(this.buildGameStateSection(gameState, isPlayer1));

    // 3. Move History Summary (Condensed, no dialogue)
    prompt.push(this.buildMoveHistorySummary(battleLogs));

    // 4. Active Dialogue Window (Last 6 exchanges with "trash talk")
    prompt.push(this.buildActiveDialogueWindow(battleLogs, isPlayer1));

    // 5. Task Instruction
    prompt.push(this.buildTaskInstruction(gameState, isPlayer1));

    return prompt.join('\n\n');
  }

  /**
   * Build System Anchor section
   * Contains the player's persona and persistent instructions
   */
  buildSystemAnchor(playerConfig) {
    return `=== YOUR IDENTITY ===
You are: ${playerConfig.name}

${playerConfig.systemPrompt}

REMEMBER: Your identity and personality are FIXED. Do not change them regardless of the game state.`;
  }

  /**
   * Build Game State section
   * High-fidelity snapshot of current position
   */
  buildGameStateSection(gameState, isPlayer1) {
    const fenParts = gameState.fen.split(' ');
    const position = fenParts[0];
    const turn = gameState.turn === 'white' ? 'White' : 'Black';
    const playerTurn = isPlayer1 ? 'White' : 'Black';

    return `=== CURRENT GAME STATE ===

Position (FEN): ${gameState.fen}

Board Position (Visual):
${this.renderBoardVisual(gameState.fen)}

Current Turn: ${turn}
Your Turn: ${playerTurn} (${playerTurn === turn ? '✓ YES' : '✗ NO'})
Move Number: ${gameState.moveNumber}
Half-move Clock: ${gameState.halfMoveClock}

Castling Rights: ${gameState.castling}
En Passant Square: ${gameState.enPassant}`;
  }

  /**
   * Render board as visual ASCII representation
   * @param {string} fen - FEN string
   * @returns {string} ASCII board
   */
  renderBoardVisual(fen) {
    const fenParts = fen.split(' ');
    const position = fenParts[0];
    const rows = position.split('/');

    let board = '';
    for (let i = 0; i < 8; i++) {
      const rankLabel = 8 - i;
      let row = `${rankLabel} `;
      let emptyCount = 0;

      for (const char of rows[i]) {
        if (/\d/.test(char)) {
          emptyCount += parseInt(char);
        } else {
          if (emptyCount > 0) {
            row += ' '.repeat(emptyCount);
            emptyCount = 0;
          }
          row += char;
        }
      }

      if (emptyCount > 0) {
        row += ' '.repeat(emptyCount);
      }

      board += row + '\n';
    }

    board += '  a b c d e f g h';

    return board;
  }

  /**
   * Build Move History Summary
   * Condensed list of moves WITHOUT dialogue
   * Includes tactical markers for key events
   */
  buildMoveHistorySummary(battleLogs) {
    const moveLogs = battleLogs.filter(log => log.type === LOG_TYPES.MOVE);

    if (moveLogs.length === 0) {
      return '=== MOVE HISTORY ===\nNo moves yet. The game is in its opening phase.';
    }

    let summary = '=== MOVE HISTORY (Last 20 Moves) ===\n';

    // Group moves into pairs (white then black)
    const pairs = [];
    for (let i = 0; i < moveLogs.length; i += 2) {
      const whiteMove = moveLogs[i];
      const blackMove = moveLogs[i + 1];
      pairs.push({ white: whiteMove, black: blackMove });
    }

    // Show last 20 moves (10 pairs)
    const recentPairs = pairs.slice(-10);

    summary += 'Move Number | White | Black\n';
    summary += '------------|-------|------\n';

    recentPairs.forEach((pair, idx) => {
      const moveNumber = pairs.length - 10 + idx + 1;
      const whiteMove = pair.white ? pair.white.content : '...';
      const blackMove = pair.black ? pair.black.content : '...';
      summary += `    ${moveNumber.toString().padStart(2)}   | ${whiteMove.padStart(5)} | ${blackMove.padStart(5)}\n`;
    });

    return summary;
  }

  /**
   * Build Active Dialogue Window
   * Last 6 exchanges including "trash talk" and "internal thoughts"
   */
  buildActiveDialogueWindow(battleLogs, isPlayer1) {
    const dialogueLogs = battleLogs.filter(log =>
      log.type === LOG_TYPES.THOUGHT || log.type === LOG_TYPES.TRASH
    );

    if (dialogueLogs.length === 0) {
      return '=== RECENT DIALOGUE ===\nNo dialogue yet. This is the opening phase of the battle.';
    }

    let section = '=== RECENT DIALOGUE (Last 6 Exchanges) ===\n';

    const recentDialogue = dialogueLogs.slice(-12); // 6 exchanges = 12 entries

    recentDialogue.forEach(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      if (log.type === LOG_TYPES.THOUGHT) {
        section += `\n[${timestamp}] ${log.player} (Internal Monologue):\n`;
        section += `  "${log.content}"\n`;
        section += `  ──────────────────────────────\n`;
      } else if (log.type === LOG_TYPES.TRASH) {
        section += `\n[${timestamp}] ${log.player} (Public Taunt):\n`;
        section += `  **"${log.content}"**\n`;
        section += `  ──────────────────────────────\n`;
      }
    });

    return section;
  }

  /**
   * Build Task Instruction
   * Clear instructions for what the AI should do
   */
  buildTaskInstruction(gameState, isPlayer1) {
    const playerTurn = isPlayer1 ? 'White' : 'Black';
    const currentTurn = gameState.turn === 'white' ? 'White' : 'Black';
    const isYourTurn = playerTurn === currentTurn;

    if (!isYourTurn) {
      return `=== WAIT ===\nIt is NOT your turn yet. Wait for your opponent to move before responding.`;
    }

    return `=== YOUR TASK ===\n
Analyze the position and make your move. Remember:

1. Your move MUST be in valid SAN notation (e.g., "e4", "Nf3", "O-O", "exd5")
2. Check that your move is legal given the current position
3. The move must NOT leave your king in check
4. You are playing as ${playerTurn}

Common mistakes to avoid:
- Invalid SAN notation (use format like e4, Nf3, O-O, exd5)
- Moving a piece that doesn't exist at the specified square
- Making an illegal move for that piece type
- Moving to an invalid square
- Leaving your king in check
- Capturing your own piece

Format your response:
MOVE: [your move in SAN notation]
THOUGHT: [brief analysis]
TRASH: [taunt or comment]

Make your move now.`;
  }

  /**
   * Estimate token count for a prompt
   * @param {string} prompt - Prompt text
   * @returns {number} Estimated token count
   */
  estimateTokenCount(prompt) {
    // Rough estimation: ~4 characters per token for English text
    // FEN strings and board visualizations are more dense
    let tokens = 0;

    // Check for FEN strings (more token-dense)
    const fenMatches = prompt.match(/Position \(FEN\): [^\n]+/g) || [];
    fenMatches.forEach(fen => {
      tokens += fen.length / 3; // FEN is more dense
    });

    // Check for board visualizations
    const boardMatches = prompt.match(/Board Position \(Visual\):[^=]+/g) || [];
    boardMatches.forEach(board => {
      tokens += board.length / 2.5; // Board ASCII is very dense
    });

    // Remaining text
    const remainingText = prompt
      .replace(/Position \(FEN\): [^\n]+/g, '')
      .replace(/Board Position \(Visual\):[^=]+/g, '');

    tokens += remainingText.length / 4;

    return Math.ceil(tokens);
  }

  /**
   * Check if prompt needs compaction
   * @param {string} prompt - Prompt text
   * @param {number} maxTokens - Maximum allowed tokens
   * @returns {boolean}
   */
  needsCompaction(prompt, maxTokens = 4000) {
    const estimated = this.estimateTokenCount(prompt);
    return estimated > (maxTokens - this.safetyMargin);
  }

  /**
   * Build correction prompt for hallucination recovery
   * @param {object} playerConfig - Player configuration
   * @param {string} errorMessage - Error message
   * @param {string} previousMove - The invalid move that was attempted
   * @param {object} gameState - Current game state
   * @returns {string} Correction prompt
   */
  buildCorrectionPrompt(playerConfig, errorMessage, previousMove, gameState) {
    return `=== CORRECTION REQUIRED ===\n
${playerConfig.name}, your previous move was INVALID.

Error: ${errorMessage}

Your attempted move: "${previousMove}"

=== CURRENT GAME STATE ===
Position (FEN): ${gameState.fen}
Turn: ${gameState.turn === 'white' ? 'White' : 'Black'}
Your Turn: ${playerConfig.name}

=== YOUR TASK ===
You MUST provide a LEGAL move. Consider these common mistakes:
- Invalid SAN notation (use format like e4, Nf3, O-O, exd5)
- Moving a piece that doesn't exist at the specified square
- Making an illegal move for that piece type
- Moving to an invalid square
- Leaving your king in check
- Capturing your own piece

Format your response:
MOVE: [correct SAN notation]
THOUGHT: [acknowledge the error]
TRASH: [excuse or deflection]

Make your move now.`;
  }

  /**
   * Build game over prompt
   * @param {object} gameState - Game state
   * @param {string} result - Game result
   * @param {string} reason - Reason for game end
   * @returns {string} Game over prompt
   */
  buildGameOverPrompt(gameState, result, reason) {
    return `=== GAME OVER ===\n
Game Result: ${result.toUpperCase()}
Reason: ${reason.replace(/_/g, ' ').toUpperCase()}

Final Position (FEN): ${gameState.fen}
Total Moves: ${gameState.moveNumber}

Thank you for playing.`;
  }

  /**
   * Get context statistics
   * @param {string} prompt - Built prompt
   * @returns {object} Context statistics
   */
  getContextStats(prompt) {
    const lines = prompt.split('\n');

    return {
      totalLines: lines.length,
      estimatedTokens: this.estimateTokenCount(prompt),
      sections: {
        systemAnchor: prompt.indexOf('CURRENT GAME STATE') - prompt.indexOf('YOUR IDENTITY'),
        gameState: prompt.indexOf('MOVE HISTORY') - prompt.indexOf('CURRENT GAME STATE'),
        moveHistory: prompt.indexOf('RECENT DIALOGUE') - prompt.indexOf('MOVE HISTORY'),
        dialogue: prompt.indexOf('YOUR TASK') - prompt.indexOf('RECENT DIALOGUE'),
        task: prompt.length - prompt.indexOf('YOUR TASK')
      }
    };
  }
}

// Singleton instance
export const contextBuilder = new ContextBuilder();
