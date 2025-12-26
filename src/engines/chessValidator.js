/**
 * Chess Validator Engine
 * Comprehensive move validation, check detection, and game state analysis
 */

export const PIECES = {
  WHITE_KING: 'K',
  WHITE_QUEEN: 'Q',
  WHITE_ROOK: 'R',
  WHITE_BISHOP: 'B',
  WHITE_KNIGHT: 'N',
  WHITE_PAWN: 'P',
  BLACK_KING: 'k',
  BLACK_QUEEN: 'q',
  BLACK_ROOK: 'r',
  BLACK_BISHOP: 'b',
  BLACK_KNIGHT: 'n',
  BLACK_PAWN: 'p'
};

export const PIECE_SYMBOLS = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

/**
 * Chess Validator Class
 */
export class ChessValidator {
  constructor(fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
    this.fen = fen;
    this.board = this.parseFen(fen);
    this.parseFenState(fen);
  }

  /**
   * Parse FEN string to board array
   * @param {string} fen - FEN string
   * @returns {Array<Array<object|null>>} 8x8 board array
   */
  parseFen(fen) {
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

  /**
   * Parse FEN state components
   * @param {string} fen - FEN string
   */
  parseFenState(fen) {
    const parts = fen.split(' ');
    this.turn = parts[1] || 'w';
    this.castling = parts[2] || 'KQkq';
    this.enPassant = parts[3] || '-';
    this.halfMoveClock = parseInt(parts[4]) || 0;
    this.fullMoveNumber = parseInt(parts[5]) || 1;
  }

  /**
   * Convert board back to FEN
   * @param {Array} board - Board array
   * @param {string} turn - Current turn
   * @param {string} castling - Castling rights
   * @param {string} enPassant - En passant square
   * @param {number} halfMoveClock - Half-move clock
   * @param {number} fullMoveNumber - Full move number
   * @returns {string} FEN string
   */
  boardToFen(board, turn, castling, enPassant, halfMoveClock, fullMoveNumber) {
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

    return `${fen} ${turn} ${castling} ${enPassant} ${halfMoveClock} ${fullMoveNumber}`;
  }

  /**
   * Parse SAN (Standard Algebraic Notation) move
   * @param {string} san - SAN notation (e.g., "e4", "Nf3", "O-O", "exd5")
   * @returns {object|null} Parsed move object
   */
  parseSan(san) {
    // Check for castling
    if (san === 'O-O') {
      return { isCastling: true, side: 'kingside' };
    }
    if (san === 'O-O-O') {
      return { isCastling: true, side: 'queenside' };
    }

    // Parse standard move
    const match = san.match(/^([KQRBN])?([a-h])?([1-8])?(x)?([a-h])([1-8])(=[QRBN])?$/i);
    if (!match) return null;

    return {
      piece: (match[1] || 'p').toLowerCase(),
      fromFile: match[2] || null,
      fromRank: match[3] || null,
      isCapture: !!match[4],
      toFile: match[5],
      toRank: match[6],
      promotion: match[7]?.slice(1)?.toLowerCase() || null
    };
  }

  /**
   * Validate a SAN move
   * @param {string} san - SAN notation
   * @returns {object} Validation result
   */
  validateMove(san) {
    const parsed = this.parseSan(san);

    if (!parsed) {
      return {
        valid: false,
        error: `Invalid SAN notation: "${san}". Expected format like e4, Nf3, O-O, exd5+`
      };
    }

    // Handle castling
    if (parsed.isCastling) {
      return this.validateCastling(parsed.side);
    }

    // Validate coordinates
    const toFileIndex = FILES.indexOf(parsed.toFile);
    const toRankIndex = RANKS.indexOf(parsed.toRank);

    if (toFileIndex === -1 || toRankIndex === -1) {
      return {
        valid: false,
        error: `Invalid target square: ${parsed.toFile}${parsed.toRank}`
      };
    }

    const targetSquare = [toRankIndex, toFileIndex];
    const targetPiece = this.board[toRankIndex][toFileIndex];

    // Check if capturing own piece
    if (targetPiece && targetPiece.color === this.turn) {
      return {
        valid: false,
        error: `Cannot capture your own piece on ${parsed.toFile}${parsed.toRank}`
      };
    }

    // Validate capture marker
    if (parsed.isCapture && !targetPiece) {
      // En passant is the exception
      if (parsed.piece !== 'p' || this.enPassant !== `${parsed.toFile}${parsed.toRank}`) {
        return {
          valid: false,
          error: `Move indicates capture but ${parsed.toFile}${parsed.toRank} is empty`
        };
      }
    }

    // Find the piece that can make this move
    const move = this.findPieceMove(
      parsed.piece,
      parsed.fromFile,
      parsed.fromRank,
      targetSquare
    );

    if (!move) {
      return {
        valid: false,
        error: `No legal move for ${parsed.piece} to ${parsed.toFile}${parsed.toRank} found`
      };
    }

    // Check if move leaves king in check
    const newBoard = this.makeMoveOnBoard(this.board, move);
    if (this.isKingInCheck(this.turn, newBoard)) {
      return {
        valid: false,
        error: 'Illegal move: would leave your king in check'
      };
    }

    // Update validator state
    this.applyMove(move, parsed);

    return {
      valid: true,
      move,
      capture: !!targetPiece,
      castling: false,
      promotion: parsed.promotion
    };
  }

  /**
   * Validate castling move
   * @param {string} side - 'kingside' or 'queenside'
   * @returns {object} Validation result
   */
  validateCastling(side) {
    const rank = this.turn === 'white' ? 7 : 0;
    const kingFile = 4;

    // Check if castling rights exist
    const castlingChar = this.turn === 'white' ? (side === 'kingside' ? 'K' : 'Q') : (side === 'kingside' ? 'k' : 'q');
    if (!this.castling.includes(castlingChar)) {
      return {
        valid: false,
        error: `Castling ${side} not available`
      };
    }

    // Check if king is in check
    if (this.isKingInCheck(this.turn, this.board)) {
      return {
        valid: false,
        error: 'Cannot castle while in check'
      };
    }

    // Check if path is clear
    const kingDestFile = side === 'kingside' ? 6 : 2;
    const rookFile = side === 'kingside' ? 7 : 0;

    for (let f = Math.min(kingFile, rookFile) + 1; f < Math.max(kingFile, rookFile); f++) {
      if (this.board[rank][f]) {
        return {
          valid: false,
          error: 'Castling path is blocked'
        };
      }
    }

    // Check if king passes through check
    const move = { from: [rank, kingFile], to: [rank, kingDestFile] };
    const intermediateBoard = this.makeMoveOnBoard(this.board, { from: [rank, kingFile], to: [rank, kingFile + (side === 'kingside' ? 1 : -1)] });

    if (this.isKingInCheck(this.turn, intermediateBoard)) {
      return {
        valid: false,
        error: 'Cannot castle through check'
      };
    }

    return {
      valid: true,
      move,
      castling: true,
      side
    };
  }

  /**
   * Find a piece that can make the given move
   * @param {string} pieceType - Type of piece
   * @param {string|null} fromFile - Disambiguating file
   * @param {string|null} fromRank - Disambiguating rank
   * @param {Array} toSquare - Target square [rank, file]
   * @returns {object|null} Move object or null
   */
  findPieceMove(pieceType, fromFile, fromRank, toSquare) {
    const [toRank, toFile] = toSquare;
    const candidates = [];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];

        if (!piece || piece.type !== pieceType || piece.color !== this.turn) {
          continue;
        }

        if (fromFile && FILES[file] !== fromFile) continue;
        if (fromRank && RANKS[rank] !== fromRank) continue;

        if (this.isPseudoLegalMove(piece, [rank, file], toSquare)) {
          const testBoard = this.makeMoveOnBoard(this.board, {
            from: [rank, file],
            to: toSquare
          });

          if (!this.isKingInCheck(this.turn, testBoard)) {
            candidates.push({ from: [rank, file], to: toSquare });
          }
        }
      }
    }

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Multiple candidates - use disambiguation
    if (fromFile && fromRank) {
      return candidates.find(m =>
        FILES[m.from[1]] === fromFile && RANKS[m.from[0]] === fromRank
      ) || null;
    }

    return candidates[0];
  }

  /**
   * Check if a move is pseudo-legal (doesn't check for king safety)
   * @param {object} piece - Piece object
   * @param {Array} fromSquare - [rank, file]
   * @param {Array} toSquare - [rank, file]
   * @returns {boolean}
   */
  isPseudoLegalMove(piece, fromSquare, toSquare) {
    const [fromRank, fromFile] = fromSquare;
    const [toRank, toFile] = toSquare;
    const dr = toRank - fromRank;
    const dc = toFile - fromFile;
    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);

    switch (piece.type) {
      case 'p':
        const direction = piece.color === 'white' ? -1 : 1;
        const startRank = piece.color === 'white' ? 6 : 1;

        // Forward move
        if (dc === 0) {
          if (dr === direction && !this.board[toRank][toFile]) {
            return true;
          }
          if (dr === 2 * direction && fromRank === startRank && !this.board[fromRank + direction][fromFile] && !this.board[toRank][toFile]) {
            return true;
          }
        }
        // Capture
        if (absDc === 1 && dr === direction) {
          if (this.board[toRank][toFile] && this.board[toRank][toFile].color !== piece.color) {
            return true;
          }
          // En passant
          const epSquare = this.enPassant;
          if (epSquare && epSquare === `${FILES[toFile]}${RANKS[toRank]}`) {
            return true;
          }
        }
        return false;

      case 'n':
        return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2);

      case 'b':
        return absDr === absDc && this.isPathClear(fromSquare, toSquare);

      case 'r':
        return (dr === 0 || dc === 0) && this.isPathClear(fromSquare, toSquare);

      case 'q':
        return ((absDr === absDc) || (dr === 0 || dc === 0)) && this.isPathClear(fromSquare, toSquare);

      case 'k':
        return absDr <= 1 && absDc <= 1;

      default:
        return false;
    }
  }

  /**
   * Check if the path between two squares is clear
   * @param {Array} fromSquare - [rank, file]
   * @param {Array} toSquare - [rank, file]
   * @returns {boolean}
   */
  isPathClear(fromSquare, toSquare) {
    const [fromRank, fromFile] = fromSquare;
    const [toRank, toFile] = toSquare;
    const dr = Math.sign(toRank - fromRank);
    const dc = Math.sign(toFile - fromFile);

    let r = fromRank + dr;
    let c = fromFile + dc;

    while (r !== toRank || c !== toFile) {
      if (this.board[r][c]) return false;
      r += dr;
      c += dc;
    }

    return true;
  }

  /**
   * Make a move on a board copy
   * @param {Array} board - Board array
   * @param {object} move - Move object
   * @returns {Array} New board array
   */
  makeMoveOnBoard(board, move) {
    const [fromRank, fromFile] = move.from;
    const [toRank, toFile] = move.to;

    const newBoard = board.map(row => row.map(cell => cell ? { ...cell } : null));
    const piece = newBoard[fromRank][fromFile];

    newBoard[toRank][toFile] = piece;
    newBoard[fromRank][fromFile] = null;

    return newBoard;
  }

  /**
   * Apply a move and update FEN state
   * @param {object} move - Move object
   * @param {object} parsed - Parsed SAN move
   */
  applyMove(move, parsed) {
    this.board = this.makeMoveOnBoard(this.board, move);

    // Update castling rights
    this.updateCastlingRights(move);

    // Update en passant square
    this.updateEnPassant(move, parsed);

    // Update turn
    this.turn = this.turn === 'white' ? 'black' : 'white';

    // Update move number
    if (this.turn === 'white') {
      this.fullMoveNumber++;
    }

    // Update FEN
    this.fen = this.boardToFen(
      this.board,
      this.turn,
      this.castling,
      this.enPassant,
      this.halfMoveClock,
      this.fullMoveNumber
    );
  }

  /**
   * Update castling rights after a move
   * @param {object} move - Move object
   */
  updateCastlingRights(move) {
    const [fromRank, fromFile] = move.from;
    const piece = this.board[fromRank]?.[fromFile];

    if (!piece) return;

    // If king moves, remove all castling rights for that color
    if (piece.type === 'k') {
      if (piece.color === 'white') {
        this.castling = this.castling.replace(/[KQ]/g, '');
      } else {
        this.castling = this.castling.replace(/[kq]/g, '');
      }
    }

    // If rook moves or is captured, remove that side's castling right
    if (piece.type === 'r' || piece.type === 'R') {
      if (fromRank === 7 && fromFile === 0) this.castling = this.castling.replace('Q', '');
      if (fromRank === 7 && fromFile === 7) this.castling = this.castling.replace('K', '');
      if (fromRank === 0 && fromFile === 0) this.castling = this.castling.replace('q', '');
      if (fromRank === 0 && fromFile === 7) this.castling = this.castling.replace('k', '');
    }
  }

  /**
   * Update en passant square after a pawn move
   * @param {object} move - Move object
   * @param {object} parsed - Parsed SAN move
   */
  updateEnPassant(move, parsed) {
    const [fromRank, fromFile] = move.from;
    const piece = this.board[fromRank]?.[fromFile];

    if (piece?.type === 'p' && Math.abs(move.to[0] - fromRank) === 2) {
      const epFile = FILES[move.to[1]];
      const epRank = RANKS[Math.floor((fromRank + move.to[0]) / 2)];
      this.enPassant = epFile + epRank;
    } else {
      this.enPassant = '-';
    }
  }

  /**
   * Check if a square is attacked
   * @param {Array} square - [rank, file]
   * @param {string} byColor - Attacking color
   * @returns {boolean}
   */
  isSquareAttacked(square, byColor) {
    const [rank, file] = square;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = this.board[r][f];
        if (!piece || piece.color !== byColor) continue;

        if (this.isPseudoLegalMove(piece, [r, f], square)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find the king for a given color
   * @param {string} color - 'white' or 'black'
   * @returns {Array|null} [rank, file] or null
   */
  findKing(color) {
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece && piece.type === 'k' && piece.color === color) {
          return [rank, file];
        }
      }
    }
    return null;
  }

  /**
   * Check if a color's king is in check
   * @param {string} color - 'white' or 'black'
   * @param {Array} board - Board array (optional, uses this.board if not provided)
   * @returns {boolean}
   */
  isKingInCheck(color, board = this.board) {
    const kingPos = this.findKingOnBoard(color, board);
    if (!kingPos) return false;

    const opponentColor = color === 'white' ? 'black' : 'white';
    const tempBoard = this.board;
    this.board = board;

    const isAttacked = this.isSquareAttacked(kingPos, opponentColor);
    this.board = tempBoard;

    return isAttacked;
  }

  /**
   * Find king on a specific board
   * @param {string} color - Color
   * @param {Array} board - Board array
   * @returns {Array|null}
   */
  findKingOnBoard(color, board) {
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

  /**
   * Check for checkmate
   * @returns {boolean}
   */
  isCheckmate() {
    if (!this.isKingInCheck(this.turn)) return false;

    // Try all possible moves
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (!piece || piece.color !== this.turn) continue;

        for (let tr = 0; tr < 8; tr++) {
          for (let tf = 0; tf < 8; tf++) {
            if (this.isPseudoLegalMove(piece, [rank, file], [tr, tf])) {
              const testBoard = this.makeMoveOnBoard(this.board, {
                from: [rank, file],
                to: [tr, tf]
              });

              if (!this.isKingInCheck(this.turn, testBoard)) {
                return false;
              }
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * Check for stalemate
   * @returns {boolean}
   */
  isStalemate() {
    if (this.isKingInCheck(this.turn)) return false;

    // Try all possible moves
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (!piece || piece.color !== this.turn) continue;

        for (let tr = 0; tr < 8; tr++) {
          for (let tf = 0; tf < 8; tf++) {
            if (this.isPseudoLegalMove(piece, [rank, file], [tr, tf])) {
              const testBoard = this.makeMoveOnBoard(this.board, {
                from: [rank, file],
                to: [tr, tf]
              });

              if (!this.isKingInCheck(this.turn, testBoard)) {
                return false;
              }
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * Check for draw by insufficient material
   * @returns {boolean}
   */
  isInsufficientMaterial() {
    const pieces = {
      white: { count: 0, bishopsOnDark: 0, bishopsOnLight: 0 },
      black: { count: 0, bishopsOnDark: 0, bishopsOnLight: 0 }
    };

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (!piece) continue;

        if (piece.type === 'k') continue;

        const color = piece.color;
        pieces[color].count++;

        if (piece.type === 'b') {
          const isDarkSquare = (rank + file) % 2 === 1;
          if (isDarkSquare) {
            pieces[color].bishopsOnDark++;
          } else {
            pieces[color].bishopsOnLight++;
          }
        }
      }
    }

    // King vs King
    if (pieces.white.count === 0 && pieces.black.count === 0) return true;

    // King + minor piece vs King
    if ((pieces.white.count === 1 && pieces.black.count === 0) ||
        (pieces.white.count === 0 && pieces.black.count === 1)) {
      return true;
    }

    // King + bishop(s) on same color squares vs King + bishop(s) on same color squares
    if (pieces.white.count > 0 && pieces.black.count > 0) {
      const whiteBishops = pieces.white.bishopsOnDark + pieces.white.bishopsOnLight;
      const blackBishops = pieces.black.bishopsOnDark + pieces.black.bishopsOnLight;

      if (whiteBishops > 0 && blackBishops > 0) {
        const whiteOnlyDark = pieces.white.bishopsOnDark > 0 && pieces.white.bishopsOnLight === 0;
        const whiteOnlyLight = pieces.white.bishopsOnLight > 0 && pieces.white.bishopsOnDark === 0;
        const blackOnlyDark = pieces.black.bishopsOnDark > 0 && pieces.black.bishopsOnLight === 0;
        const blackOnlyLight = pieces.black.bishopsOnLight > 0 && pieces.black.bishopsOnDark === 0;

        if ((whiteOnlyDark && blackOnlyDark) || (whiteOnlyLight && blackOnlyLight)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check for threefold repetition
   * @param {Array} fenHistory - Array of previous FEN positions
   * @returns {boolean}
   */
  isThreefoldRepetition(fenHistory) {
    const currentPos = this.fen.split(' ').slice(0, 3).join(' ');
    const positions = [currentPos, ...fenHistory.map(f => f.split(' ').slice(0, 3).join(' '))];
    const occurrences = positions.filter(p => p === currentPos).length;

    return occurrences >= 3;
  }

  /**
   * Check for fifty-move rule
   * @returns {boolean}
   */
  isFiftyMoveRule() {
    return this.halfMoveClock >= 100;
  }

  /**
   * Check if game is over
   * @param {Array} fenHistory - Previous FEN positions for repetition check
   * @returns {object} Game state
   */
  getGameState(fenHistory = []) {
    if (this.isCheckmate()) {
      return {
        gameOver: true,
        result: this.turn === 'white' ? 'black' : 'white',
        reason: 'checkmate'
      };
    }

    if (this.isStalemate()) {
      return {
        gameOver: true,
        result: 'draw',
        reason: 'stalemate'
      };
    }

    if (this.isInsufficientMaterial()) {
      return {
        gameOver: true,
        result: 'draw',
        reason: 'insufficient_material'
      };
    }

    if (this.isThreefoldRepetition(fenHistory)) {
      return {
        gameOver: true,
        result: 'draw',
        reason: 'threefold_repetition'
      };
    }

    if (this.isFiftyMoveRule()) {
      return {
        gameOver: true,
        result: 'draw',
        reason: 'fifty_move_rule'
      };
    }

    return {
      gameOver: false,
      inCheck: this.isKingInCheck(this.turn)
    };
  }

  /**
   * Get all legal moves for the current turn
   * @returns {Array<string>} Array of SAN moves
   */
  getLegalMoves() {
    const moves = [];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (!piece || piece.color !== this.turn) continue;

        for (let tr = 0; tr < 8; tr++) {
          for (let tf = 0; tf < 8; tf++) {
            if (this.isPseudoLegalMove(piece, [rank, file], [tr, tf])) {
              const testBoard = this.makeMoveOnBoard(this.board, {
                from: [rank, file],
                to: [tr, tf]
              });

              if (!this.isKingInCheck(this.turn, testBoard)) {
                // Convert to SAN
                const san = this.toSan({ from: [rank, file], to: [tr, tf] });
                moves.push(san);
              }
            }
          }
        }
      }
    }

    return moves;
  }

  /**
   * Convert move to SAN notation
   * @param {object} move - Move object
   * @returns {string} SAN notation
   */
  toSan(move) {
    const [fromRank, fromFile] = move.from;
    const [toRank, toFile] = move.to;
    const piece = this.board[fromRank][fromFile];

    if (!piece) return '';

    // Castling
    if (piece.type === 'k' && Math.abs(toFile - fromFile) === 2) {
      return toFile > fromFile ? 'O-O' : 'O-O-O';
    }

    let san = '';

    // Piece letter (not for pawns)
    if (piece.type !== 'p') {
      san += piece.type.toUpperCase();
    }

    // Disambiguation (simplified)
    // In a full implementation, we'd check if disambiguation is needed

    // Capture
    if (piece.type === 'p' && toFile !== fromFile) {
      san += FILES[fromFile];
    }
    if (this.board[toRank][toFile]) {
      san += 'x';
    }

    // Destination square
    san += FILES[toFile] + RANKS[toRank];

    // Promotion
    if (piece.type === 'p' && (toRank === 0 || toRank === 7)) {
      san += '=' + 'Q'; // Default to queen promotion
    }

    return san;
  }

  /**
   * Get board as 2D array with piece symbols
   * @returns {Array<Array<string|null>>}
   */
  getBoardDisplay() {
    return this.board.map(row =>
      row.map(piece => {
        if (!piece) return null;
        const char = piece.type === piece.type.toUpperCase()
          ? piece.type
          : piece.type.toUpperCase();
        return piece.color === 'white' ? char : char.toLowerCase();
      })
    );
  }
}
