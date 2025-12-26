import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { Play, Pause, RotateCcw, Download, Eye, EyeOff, Settings, ChevronDown, ChevronUp, Terminal, Brain, MessageSquare, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

// ============================================
// CHESS ENGINE & VALIDATION LOGIC
// ============================================

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PIECES = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function fenToBoard(fen) {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  const parts = fen.split(' ');
  const position = parts[0];
  let rank = 0, file = 0;

  for (const char of position) {
    if (char === '/') {
      rank++;
      file = 0;
    } else if (/\d/.test(char)) {
      file += parseInt(char);
    } else {
      const color = char === char.toUpperCase() ? 'white' : 'black';
      const type = char.toLowerCase();
      board[rank][file] = { type, color };
      file++;
    }
  }
  return board;
}

function boardToFen(board, turn, castling, enPassant, halfMove, fullMove) {
  let fen = '';
  for (let rank = 0; rank < 8; rank++) {
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) {
        empty++;
      } else {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        const char = piece.type.toUpperCase();
        fen += piece.color === 'white' ? char : char.toLowerCase();
      }
    }
    if (empty > 0) fen += empty;
    if (rank < 7) fen += '/';
  }
  return `${fen} ${turn} ${castling} ${enPassant} ${halfMove} ${fullMove}`;
}

function sanToCoordinates(san) {
  const match = san.match(/^([KQRBN])?([a-h])?([1-8])?(x)?([a-h])([1-8])(=[QRBN])?/i);
  if (!match) return null;

  const piece = match[1]?.toLowerCase() || 'p';
  const fromFile = match[2];
  const fromRank = match[3];
  const isCapture = match[4];
  const toFile = match[5];
  const toRank = match[6];
  const promotion = match[7]?.slice(1)?.toLowerCase();

  return { piece, fromFile, fromRank, toFile, toRank, isCapture, promotion };
}

function isSquareAttacked(square, byColor, board) {
  const [rank, file] = square;
  const directions = {
    'p': byColor === 'white' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]],
    'n': [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
    'b': [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    'r': [[-1, 0], [1, 0], [0, -1], [0, 1]],
    'q': [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]],
    'k': [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]
  };

  for (const [type, dirs] of Object.entries(directions)) {
    for (const [dr, dc] of dirs) {
      let r = rank + dr;
      let c = file + dc;
      let pieceFound = false;

      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const piece = board[r][c];
        if (piece) {
          if (piece.color === byColor) {
            if (piece.type === type) {
              if (type !== 'p' || (piece.type === 'p' && Math.abs(dr) === 1 && Math.abs(dc) === 1)) {
                if (type === 'p' || type === 'n' || type === 'k' || pieceFound) {
                  return true;
                }
                pieceFound = true;
              }
            }
            if ((type === 'b' && (piece.type === 'r' || piece.type === 'q')) ||
                (type === 'r' && (piece.type === 'b' || piece.type === 'q'))) {
              return true;
            }
          }
          break;
        }
        if (type === 'p' || type === 'n' || type === 'k') break;
        pieceFound = true;
        r += dr;
        c += dc;
      }
    }
  }
  return false;
}

function findPieceOnRank(type, color, rank, toFile, toRank, board) {
  for (let file = 0; file < 8; file++) {
    const piece = board[rank][file];
    if (piece && piece.type === type && piece.color === color) {
      const newBoard = makeMove(board, { from: [rank, file], to: [parseInt(toRank) - 1, FILES.indexOf(toFile)] });
      if (newBoard && !isKingInCheck(color, newBoard)) {
        return { from: [rank, file], to: [parseInt(toRank) - 1, FILES.indexOf(toFile)] };
      }
    }
  }
  return null;
}

function findPieceOnFile(type, color, file, toFile, toRank, board) {
  for (let rank = 0; rank < 8; rank++) {
    const piece = board[rank][file];
    if (piece && piece.type === type && piece.color === color) {
      const newBoard = makeMove(board, { from: [rank, file], to: [parseInt(toRank) - 1, FILES.indexOf(toFile)] });
      if (newBoard && !isKingInCheck(color, newBoard)) {
        return { from: [rank, file], to: [parseInt(toRank) - 1, FILES.indexOf(toFile)] };
      }
    }
  }
  return null;
}

function findAnyPiece(type, color, toFile, toRank, board) {
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === type && piece.color === color) {
        const newBoard = makeMove(board, { from: [rank, file], to: [parseInt(toRank) - 1, FILES.indexOf(toFile)] });
        if (newBoard && !isKingInCheck(color, newBoard)) {
          return { from: [rank, file], to: [parseInt(toRank) - 1, FILES.indexOf(toFile)] };
        }
      }
    }
  }
  return null;
}

function findKing(color, board) {
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === 'k' && piece.color === color) {
        return [rank, file];
      }
    }
  }
  return null;
}

function isKingInCheck(color, board) {
  const kingPos = findKing(color, board);
  if (!kingPos) return false;
  const opponentColor = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(kingPos, opponentColor, board);
}

function makeMove(board, move) {
  const newBoard = board.map(row => row.map(cell => cell ? { ...cell } : null));
  const [fromRank, fromFile] = move.from;
  const [toRank, toFile] = move.to;
  const piece = newBoard[fromRank][fromFile];

  if (!piece) return null;

  newBoard[toRank][toFile] = piece;
  newBoard[fromRank][fromFile] = null;

  return newBoard;
}

function parseAndValidateMove(san, board, turn, fen) {
  const specialMoves = {
    'O-O': { kingSide: true },
    'O-O-O': { queenSide: true }
  };

  if (specialMoves[san]) {
    const rank = turn === 'white' ? 7 : 0;
    const kingFile = 4;
    const newRookFile = specialMoves[san].kingSide ? 5 : 3;
    const kingTo = specialMoves[san].kingSide ? 6 : 2;

    if (isKingInCheck(turn, board)) {
      return { valid: false, error: 'Cannot castle while in check' };
    }

    const newBoard = makeMove(board, {
      from: [rank, kingFile],
      to: [rank, kingTo]
    });

    if (!newBoard) return { valid: false, error: 'Invalid castling move' };

    if (isKingInCheck(turn, newBoard)) {
      return { valid: false, error: 'Cannot castle through check' };
    }

    return {
      valid: true,
      from: [rank, kingFile],
      to: [rank, kingTo],
      isCastling: true,
      type: 'castling'
    };
  }

  const coords = sanToCoordinates(san);
  if (!coords) {
    return { valid: false, error: `Invalid SAN notation: ${san}. Expected format like e4, Nf3, exd5, O-O` };
  }

  const { piece, fromFile, fromRank, toFile, toRank, isCapture, promotion } = coords;
  const toIndex = [parseInt(toRank) - 1, FILES.indexOf(toFile)];

  if (toIndex[0] < 0 || toIndex[0] > 7 || toIndex[1] < 0 || toIndex[1] > 7) {
    return { valid: false, error: `Invalid target square: ${toFile}${toRank}` };
  }

  const targetPiece = board[toIndex[0]][toIndex[1]];
  if (targetPiece && targetPiece.color === turn) {
    return { valid: false, error: `Cannot capture your own piece on ${toFile}${toRank}` };
  }

  if (isCapture && !targetPiece) {
    return { valid: false, error: `Move ${san} indicates capture but square ${toFile}${toRank} is empty` };
  }

  let fromSquare;
  if (fromFile && fromRank) {
    const fr = parseInt(fromRank) - 1;
    const fc = FILES.indexOf(fromFile);
    const sourcePiece = board[fr][fc];
    if (!sourcePiece) {
      return { valid: false, error: `No piece found at ${fromFile}${fromRank}` };
    }
    if (sourcePiece.type !== piece) {
      return { valid: false, error: `Expected ${piece} at ${fromFile}${fromRank}, found ${sourcePiece.type}` };
    }
    if (sourcePiece.color !== turn) {
      return { valid: false, error: `Piece at ${fromFile}${fromRank} belongs to ${turn === 'white' ? 'black' : 'white'}` };
    }

    fromSquare = { from: [fr, fc], to: toIndex };
  } else if (fromFile) {
    fromSquare = findPieceOnFile(piece, turn, FILES.indexOf(fromFile), toFile, toRank, board);
  } else if (fromRank) {
    fromSquare = findPieceOnRank(piece, turn, parseInt(fromRank) - 1, toFile, toRank, board);
  } else {
    fromSquare = findAnyPiece(piece, turn, toFile, toRank, board);
  }

  if (!fromSquare) {
    return { valid: false, error: `No legal move for ${piece} to ${toFile}${toRank} found` };
  }

  const newBoard = makeMove(board, fromSquare);
  if (!newBoard) {
    return { valid: false, error: 'Failed to make move' };
  }

  if (isKingInCheck(turn, newBoard)) {
    return { valid: false, error: 'Move would leave king in check' };
  }

  return {
    valid: true,
    from: fromSquare.from,
    to: fromSquare.to,
    isCapture: !!targetPiece,
    piece: piece,
    promotion: promotion,
    type: 'normal'
  };
}

// ============================================
// APP COMPONENT
// ============================================

function App() {
  const logsEndRef = useRef(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  const [gameState, setGameState] = useState({
    status: 'setup', // setup, running, paused, finished
    fen: INITIAL_FEN,
    turn: 'white',
    moveNumber: 1,
    castling: 'KQkq',
    enPassant: '-',
    halfMove: 0,
    fullMove: 1
  });

  const [player1Config, setPlayer1Config] = useState({
    name: 'Arrogant Grandmaster',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
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
TRASH: [bold insult or taunt]`
  });

  const [player2Config, setPlayer2Config] = useState({
    name: 'Chaotic Hacker',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
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
TRASH: [bold insult or taunt]`
  });

  const [logs, setLogs] = useState([]);
  const [rawRequests, setRawRequests] = useState([]);
  const [currentThinking, setCurrentThinking] = useState(null);
  const [hallucinationCount, setHallucinationCount] = useState({ player1: 0, player2: 0 });

  const board = fenToBoard(gameState.fen);

  const autoScroll = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    autoScroll();
  }, [logs, autoScroll]);

  const addLog = useCallback((type, content, player = null) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { id: Date.now(), type, content, player, timestamp }]);
  }, []);

  const addRawRequest = useCallback((raw, response) => {
    setRawRequests(prev => [...prev, {
      id: Date.now(),
      request: raw,
      response: response,
      timestamp: new Date().toISOString()
    }]);
  }, []);

  const createGamePrompt = useCallback((playerConfig, isPlayer1) => {
    const recentMoves = logs
      .filter(log => log.type === 'move' || log.type === 'trash')
      .slice(-12);

    const moveHistory = logs
      .filter(log => log.type === 'move')
      .slice(-20)
      .map(log => log.content)
      .join(', ');

    let prompt = `${playerConfig.systemPrompt}

=== CURRENT GAME STATE ===
Current Position (FEN): ${gameState.fen}
Turn: ${gameState.turn === 'white' ? 'White' : 'Black'} (Your Turn: ${isPlayer1 ? 'White' : 'Black'})
Move Number: ${gameState.moveNumber}
Half-move clock: ${gameState.halfMove}

`;

    if (moveHistory) {
      prompt += `Move History: ${moveHistory}\n\n`;
    }

    if (recentMoves.length > 0) {
      prompt += `=== RECENT DIALOGUE (Last ${recentMoves.length} exchanges) ===\n`;
      recentMoves.forEach(log => {
        if (log.type === 'move') {
          prompt += `${log.player}: ${log.content}\n`;
        } else if (log.type === 'trash') {
          prompt += `${log.player} says: "${log.content}"\n`;
        }
      });
      prompt += '\n';
    }

    prompt += `=== YOUR TASK ===
Analyze the position and make your move. Remember:
1. Your move MUST be in valid SAN notation
2. Check that your move is legal given the current position
3. The move must not leave your king in check
4. You are playing as ${isPlayer1 ? 'White' : 'Black'}

Respond with your move in the format specified above.`;

    return prompt;
  }, [gameState, logs]);

  const callLLM = async (config, prompt, isPlayer1) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    let endpoint = '/chat/completions';
    let body = {
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 500
    };

    if (config.baseUrl.includes('openai')) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    } else if (config.baseUrl.includes('anthropic')) {
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      endpoint = '/messages';
      body = {
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      };
    } else {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const rawRequest = {
      url: config.baseUrl + endpoint,
      headers: { ...headers, Authorization: headers['Authorization'] ? '***' : undefined },
      body: body
    };

    try {
      const response = await fetch(config.baseUrl + endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();

      addRawRequest(rawRequest, {
        status: response.status,
        data: data
      });

      if (!response.ok) {
        throw new Error(data.error?.message || 'API request failed');
      }

      const content = config.baseUrl.includes('anthropic')
        ? data.content[0].text
        : data.choices[0].message.content;

      return { success: true, content, raw: data };

    } catch (error) {
      addRawRequest(rawRequest, {
        error: error.message
      });
      return { success: false, error: error.message };
    }
  };

  const parseAIResponse = (content) => {
    const moveMatch = content.match(/MOVE:\s*([^\n]+)/i);
    const thoughtMatch = content.match(/THOUGHT:\s*([^\n]+)/i);
    const trashMatch = content.match(/TRASH:\s*([^\n]+)/i);

    const move = moveMatch ? moveMatch[1].trim() : null;
    const thought = thoughtMatch ? thoughtMatch[1].trim() : null;
    const trash = trashMatch ? trashMatch[1].trim() : null;

    return { move, thought, trash };
  };

  const handleHallucination = async (playerConfig, errorMessage, isPlayer1, previousMove) => {
    setHallucinationCount(prev => ({
      ...prev,
      [isPlayer1 ? 'player1' : 'player2']: prev[isPlayer1 ? 'player1' : 'player2'] + 1
    }));

    addLog('warning', `HALLUCINATION DETECTED: ${errorMessage}`, isPlayer1 ? player1Config.name : player2Config.name);
    addLog('system', `Prompting ${isPlayer1 ? player1Config.name : player2Config.name} to retry...`);

    const retryPrompt = `${playerConfig.systemPrompt}

=== CORRECTION REQUIRED ===
Your previous response was INVALID. Error: ${errorMessage}

Current Position (FEN): ${gameState.fen}
Turn: ${gameState.turn === 'white' ? 'White' : 'Black'}

You must provide a LEGAL move in valid SAN notation. Consider these common mistakes:
- Invalid SAN notation (use format like e4, Nf3, O-O, exd5)
- Moving a piece that doesn't exist at that square
- Making an illegal move for that piece type
- Moving to an invalid square
- Leaving your king in check
- Capturing your own piece

Respond with ONLY a valid move:
MOVE: [correct SAN notation]
THOUGHT: [acknowledge the error]
TRASH: [excuse or deflection]`;

    const result = await callLLM(playerConfig, retryPrompt, isPlayer1);
    if (!result.success) {
      addLog('error', `Failed to get retry response: ${result.error}`, isPlayer1 ? player1Config.name : player2Config.name);
      return null;
    }

    const parsed = parseAIResponse(result.content);
    return parsed;
  };

  const makeGameMove = (san, isPlayer1) => {
    const validation = parseAndValidateMove(san, board, gameState.turn, gameState.fen);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const newBoard = makeMove(board, { from: validation.from, to: validation.to });
    const nextTurn = gameState.turn === 'white' ? 'black' : 'white';
    const newMoveNumber = nextTurn === 'white' ? gameState.moveNumber + 1 : gameState.moveNumber;
    const newHalfMove = validation.isCapture || validation.piece === 'p' ? 0 : gameState.halfMove + 1;

    let newCastling = gameState.castling;
    const movingPiece = board[validation.from[0]][validation.from[1]];

    if (movingPiece.type === 'k') {
      newCastling = newCastling.replace(gameState.turn === 'white' ? /K/g : /k/g, '');
    } else if (movingPiece.type === 'r') {
      if (validation.from[0] === 7 && validation.from[1] === 0) newCastling = newCastling.replace('Q', '');
      if (validation.from[0] === 7 && validation.from[1] === 7) newCastling = newCastling.replace('K', '');
      if (validation.from[0] === 0 && validation.from[1] === 0) newCastling = newCastling.replace('q', '');
      if (validation.from[0] === 0 && validation.from[1] === 7) newCastling = newCastling.replace('k', '');
    }

    const fenParts = gameState.fen.split(' ');
    let newEnPassant = '-';

    if (movingPiece.type === 'p' && Math.abs(validation.from[0] - validation.to[0]) === 2) {
      const epFile = FILES[validation.from[1]];
      const epRank = gameState.turn === 'white' ? '3' : '6';
      newEnPassant = epFile + epRank;
    }

    const newFen = boardToFen(
      newBoard,
      nextTurn,
      newCastling,
      newEnPassant,
      newHalfMove,
      newMoveNumber
    );

    setGameState(prev => ({
      ...prev,
      fen: newFen,
      turn: nextTurn,
      moveNumber: newMoveNumber,
      castling: newCastling,
      enPassant: newEnPassant,
      halfMove: newHalfMove
    }));

    return { success: true, move: san, capture: validation.isCapture };
  };

  const runTurn = async (isPlayer1) => {
    const playerConfig = isPlayer1 ? player1Config : player2Config;
    const playerName = isPlayer1 ? player1Config.name : player2Config.name;

    addLog('turn', `${playerName}'s turn (${gameState.turn})...`, playerName);
    setCurrentThinking({ player: playerName, isPlayer1 });

    const prompt = createGamePrompt(playerConfig, isPlayer1);
    const result = await callLLM(playerConfig, prompt, isPlayer1);

    setCurrentThinking(null);

    if (!result.success) {
      addLog('error', `API Error: ${result.error}`, playerName);
      setGameState(prev => ({ ...prev, status: 'paused' }));
      return;
    }

    const parsed = parseAIResponse(result.content);

    if (!parsed.move) {
      const halluResult = await handleHallucination(playerConfig, 'No valid MOVE field found in response', isPlayer1, result.content);
      if (!halluResult || !halluResult.move) {
        addLog('error', 'Failed to extract valid move from response', playerName);
        setGameState(prev => ({ ...prev, status: 'paused' }));
        return;
      }
    }

    const finalMove = parsed.move;
    const finalThought = parsed.thought;
    const finalTrash = parsed.trash;

    addLog('thought', finalThought || 'Calculating...', playerName);
    addLog('trash', finalTrash || '', playerName);

    const moveResult = makeGameMove(finalMove, isPlayer1);

    if (!moveResult.success) {
      const halluResult = await handleHallucination(playerConfig, moveResult.error, isPlayer1, finalMove);
      if (!halluResult || !halluResult.move) {
        addLog('error', `Cannot recover from illegal move: ${moveResult.error}`, playerName);
        setGameState(prev => ({ ...prev, status: 'paused' }));
        return;
      }

      const retryResult = makeGameMove(halluResult.move, isPlayer1);
      if (!retryResult.success) {
        addLog('error', `Retry also failed: ${retryResult.error}`, playerName);
        setGameState(prev => ({ ...prev, status: 'paused' }));
        return;
      }

      addLog('move', halluResult.move, playerName);
    } else {
      addLog('move', finalMove, playerName);
    }

    if (finalThought) {
      addLog('thought', finalThought, playerName);
    }

    if (finalTrash) {
      addLog('trash', finalTrash, playerName);
    }
  };

  const gameLoop = async () => {
    if (gameState.status !== 'running') return;

    const isPlayer1Turn = gameState.turn === 'white';
    await runTurn(isPlayer1Turn);

    if (gameState.status === 'running') {
      setTimeout(() => gameLoop(), 2000);
    }
  };

  const startGame = () => {
    if (!player1Config.apiKey || !player2Config.apiKey) {
      alert('Please enter API keys for both players');
      return;
    }
    addLog('system', '=== AI BATTLE ARENA INITIALIZED ===');
    addLog('system', `${player1Config.name} vs ${player2Config.name}`);
    addLog('system', `${player1Config.name} plays White, ${player2Config.name} plays Black`);
    setGameState(prev => ({ ...prev, status: 'running' }));
  };

  const pauseGame = () => {
    setGameState(prev => ({ ...prev, status: 'paused' }));
    addLog('system', '=== GAME PAUSED ===');
  };

  const resetGame = () => {
    setGameState({
      status: 'setup',
      fen: INITIAL_FEN,
      turn: 'white',
      moveNumber: 1,
      castling: 'KQkq',
      enPassant: '-',
      halfMove: 0,
      fullMove: 1
    });
    setLogs([]);
    setRawRequests([]);
    setHallucinationCount({ player1: 0, player2: 0 });
    setCurrentThinking(null);
  };

  const downloadLogs = () => {
    const logContent = logs.map(log =>
      `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.player ? log.player + ': ' : ''}${log.content}`
    ).join('\n');

    const fullContent = `AI BATTLE ARENA - BATTLE LOG\n${'='.repeat(50)}\n\n` +
      `Player 1: ${player1Config.name} (${player1Config.model})\n` +
      `Player 2: ${player2Config.name} (${player2Config.model})\n` +
      `Started: ${new Date().toISOString()}\n\n` +
      `${'='.repeat(50)}\n\n${logContent}`;

    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-battle-${Date.now()}.log`;
    a.click();
  };

  useEffect(() => {
    if (gameState.status === 'running') {
      gameLoop();
    }
  }, [gameState.status]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 font-mono">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4">
            <Terminal className="w-8 h-8 text-emerald-500" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AI BATTLE ARENA</h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest">LLM vs LLM Research Observatory</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${gameState.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
              {gameState.status.toUpperCase()}
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/10 rounded border border-white/10 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex max-w-[1800px] mx-auto">
        {/* Left Panel - Board & Stats */}
        <div className="flex-1 p-6 border-r border-white/10">
          {/* Game Board */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm uppercase tracking-widest text-gray-500">Chess Board</h2>
              <div className="text-xs text-gray-600">
                FEN: <span className="text-gray-400">{gameState.fen.split(' ')[0]}</span>
              </div>
            </div>

            <div className="inline-block bg-[#0a0a0a] border border-white/20 p-1">
              <div className="grid grid-cols-8 border border-white/10">
                {board.map((row, rank) =>
                  row.map((piece, file) => {
                    const isLight = (rank + file) % 2 === 0;
                    const isLastMove = false;
                    return (
                      <div
                        key={`${rank}-${file}`}
                        className={`
                          w-16 h-16 flex items-center justify-center text-4xl
                          ${isLight ? 'bg-[#1a1a1a]' : 'bg-[#0a0a0a]'}
                          ${isLastMove ? 'ring-2 ring-emerald-500/50' : ''}
                          hover:brightness-110 transition-all cursor-default
                        `}
                      >
                        {piece ? (
                          <span className={piece.color === 'white' ? 'text-white drop-shadow-lg' : 'text-gray-900 drop-shadow-lg'}>
                            {PIECES[piece.color === 'white' ? piece.type.toUpperCase() : piece.type]}
                          </span>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              {/* File labels */}
              <div className="grid grid-cols-8 text-center text-xs text-gray-600 mt-1">
                {FILES.map(file => (
                  <div key={file}>{file}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Game Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#0a0a0a] border border-white/10 p-4">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Move</div>
              <div className="text-2xl font-bold">{gameState.moveNumber}</div>
              <div className="text-xs text-gray-600">{gameState.turn === 'white' ? 'White' : 'Black'} to move</div>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 p-4">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Hallucinations</div>
              <div className="text-2xl font-bold text-amber-500">
                {hallucinationCount.player1 + hallucinationCount.player2}
              </div>
              <div className="text-xs text-gray-600">
                P1: {hallucinationCount.player1} | P2: {hallucinationCount.player2}
              </div>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 p-4">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Exchanges</div>
              <div className="text-2xl font-bold">
                {logs.filter(l => l.type === 'move').length}
              </div>
              <div className="text-xs text-gray-600">Moves played</div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="flex items-center gap-3">
            {gameState.status === 'setup' || gameState.status === 'paused' ? (
              <button
                onClick={startGame}
                disabled={!player1Config.apiKey || !player2Config.apiKey}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-800 disabled:text-gray-600 border border-emerald-500/30 rounded transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Battle
              </button>
            ) : (
              <button
                onClick={pauseGame}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 border border-amber-500/30 rounded transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            )}
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={downloadLogs}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Log
            </button>
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded transition-colors"
            >
              {showRawJson ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showRawJson ? 'Hide' : 'Show'} Raw JSON
            </button>
          </div>
        </div>

        {/* Right Panel - Settings & Logs */}
        <div className="w-[500px] flex flex-col">
          {/* Settings Panel */}
          {showSettings && (
            <div className="border-b border-white/10 p-4 max-h-[400px] overflow-y-auto">
              <button
                onClick={() => setShowSettings(false)}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 mb-4 uppercase tracking-widest"
              >
                <ChevronUp className="w-4 h-4" />
                Collapse Settings
              </button>

              <div className="space-y-4">
                {/* Player 1 Config */}
                <div className="bg-[#0a0a0a] border border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-white" />
                    <span className="font-bold text-sm">{player1Config.name}</span>
                    <span className="text-xs text-gray-500">(White)</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={player1Config.name}
                        onChange={(e) => setPlayer1Config({ ...player1Config, name: e.target.value })}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-sm rounded focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Base URL</label>
                      <input
                        type="text"
                        value={player1Config.baseUrl}
                        onChange={(e) => setPlayer1Config({ ...player1Config, baseUrl: e.target.value })}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-sm rounded focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">API Key</label>
                      <input
                        type="password"
                        value={player1Config.apiKey}
                        onChange={(e) => setPlayer1Config({ ...player1Config, apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-sm rounded focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Model</label>
                      <input
                        type="text"
                        value={player1Config.model}
                        onChange={(e) => setPlayer1Config({ ...player1Config, model: e.target.value })}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-sm rounded focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">System Prompt (Persona)</label>
                      <textarea
                        value={player1Config.systemPrompt}
                        onChange={(e) => setPlayer1Config({ ...player1Config, systemPrompt: e.target.value })}
                        rows={6}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-sm rounded focus:outline-none focus:border-white/30 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Player 2 Config */}
                <div className="bg-[#0a0a0a] border border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-gray-900 border border-gray-600" />
                    <span className="font-bold text-sm">{player2Config.name}</span>
                    <span className="text-xs text-gray-500">(Black)</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={player2Config.name}
                        onChange={(e) => setPlayer2Config({ ...player2Config, name: e.target.value })}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-sm rounded focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Base URL</label>
                      <input
                        type="text"
                        value={player2Config.baseUrl}
                        onChange={(e) => setPlayer2Config({ ...player2Config, baseUrl: e.target.value })}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-sm rounded focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">API Key</label>
                      <input
                        type="password"
                        value={player2Config.apiKey}
                        onChange={(e) => setPlayer2Config({ ...player2Config, apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-sm rounded focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Model</label>
                      <input
                        type="text"
                        value={player2Config.model}
                        onChange={(e) => setPlayer2Config({ ...player2Config, model: e.target.value })}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-sm rounded focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">System Prompt (Persona)</label>
                      <textarea
                        value={player2Config.systemPrompt}
                        onChange={(e) => setPlayer2Config({ ...player2Config, systemPrompt: e.target.value })}
                        rows={6}
                        className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-sm rounded focus:outline-none focus:border-white/30 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showSettings && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 p-4 uppercase tracking-widest"
            >
              <ChevronDown className="w-4 h-4" />
              Expand Settings
            </button>
          )}

          {/* Battle Logs */}
          <div className="flex-1 flex flex-col border-t border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0a0a0a]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span className="text-sm uppercase tracking-widest">Battle Feed</span>
              </div>
              {currentThinking && (
                <div className="flex items-center gap-2 text-amber-500 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {currentThinking.player} thinking...
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {logs.length === 0 && (
                <div className="text-center text-gray-600 py-8">
                  <Terminal className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Configure players and start the battle</p>
                  <p className="text-xs mt-2">The arena awaits...</p>
                </div>
              )}

              {logs.map((log) => {
                const isPlayer1 = log.player === player1Config.name;
                const bgColor = isPlayer1 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-purple-500/10 border-purple-500/20';

                switch (log.type) {
                  case 'system':
                    return (
                      <div key={log.id} className="text-xs text-gray-500 py-1 px-2 border-l-2 border-gray-600">
                        {log.content}
                      </div>
                    );
                  case 'move':
                    return (
                      <div key={log.id} className={`${bgColor} border p-3 rounded`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">{log.timestamp}</span>
                          <span className="text-xs font-bold">{log.player}</span>
                        </div>
                        <div className="text-lg font-bold text-emerald-400">{log.content}</div>
                      </div>
                    );
                  case 'thought':
                    return (
                      <div key={log.id} className="ml-4 border-l-2 border-white/10 pl-3 py-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Brain className="w-3 h-3 text-amber-500/50" />
                          <span className="text-xs text-gray-600">AI Whisper</span>
                        </div>
                        <p className="text-sm text-gray-400 italic opacity-70">"{log.content}"</p>
                      </div>
                    );
                  case 'trash':
                    return (
                      <div key={log.id} className={`${bgColor} border p-3 rounded ml-4`}>
                        <MessageSquare className="w-3 h-3 text-gray-500 mb-2" />
                        <p className="text-sm font-bold">{log.content}</p>
                      </div>
                    );
                  case 'warning':
                    return (
                      <div key={log.id} className="bg-amber-500/10 border border-amber-500/20 p-3 rounded">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs text-amber-500 font-bold mb-1">HALLUCINATION</div>
                            <p className="text-sm text-amber-200">{log.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  case 'error':
                    return (
                      <div key={log.id} className="bg-red-500/10 border border-red-500/20 p-3 rounded">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs text-red-500 font-bold mb-1">ERROR</div>
                            <p className="text-sm text-red-200">{log.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  case 'turn':
                    return (
                      <div key={log.id} className="text-center text-xs text-gray-500 py-2">
                        ─── {log.content} ───
                      </div>
                    );
                  default:
                    return null;
                }
              })}

              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Raw JSON Panel */}
          {showRawJson && (
            <div className="border-t border-white/10 h-64 overflow-y-auto bg-[#050505]">
              <div className="px-4 py-2 border-b border-white/10 bg-[#0a0a0a] sticky top-0">
                <span className="text-xs text-gray-500 uppercase tracking-widest">Raw API Requests/Responses</span>
              </div>
              <div className="p-4 space-y-4">
                {rawRequests.length === 0 && (
                  <div className="text-center text-gray-600 py-4 text-sm">No requests yet</div>
                )}
                {rawRequests.map((req) => (
                  <div key={req.id} className="space-y-2">
                    <div className="text-xs text-gray-500">{req.timestamp}</div>
                    <pre className="bg-[#0a0a0a] border border-white/10 p-3 rounded text-xs overflow-x-auto">
                      <div className="text-blue-400">REQUEST:</div>
                      {JSON.stringify(req.request, null, 2)}
                      {'\n\n'}
                      <div className="text-emerald-400">RESPONSE:</div>
                      {JSON.stringify(req.response, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
