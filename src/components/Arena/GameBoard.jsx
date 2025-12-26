import React, { useState, useMemo } from "react";
import { useGameStateStore } from "../../store/gameStateStore.js";
import { PIECE_SYMBOLS } from "../../engines/chessValidator.js";

/**
 * GameBoard Component
 * Visual chess board with piece rendering and move highlighting
 */
export function GameBoard({ showLastMove = true, showLegalMoves = false }) {
  const gameState = useGameStateStore();
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);

  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

  // Parse FEN to board array (memoized for performance)
  const board = useMemo(() => {
    const boardArray = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null));
    const parts = gameState.fen.split(" ");
    const position = parts[0];
    let rank = 0,
      file = 0;

    for (const char of position) {
      if (char === "/") {
        rank++;
        file = 0;
      } else if (/\d/.test(char)) {
        file += parseInt(char);
      } else {
        boardArray[rank][file] = char;
        file++;
      }
    }

    return boardArray;
  }, [gameState.fen]);

  /**
   * Get piece symbol from piece character
   */
  const getPieceSymbol = (pieceChar) => {
    if (!pieceChar) return null;
    const pieceType = pieceChar.toLowerCase();
    return PIECE_SYMBOLS[pieceType] || null;
  };

  /**
   * Get square color
   */
  const getSquareColor = (rank, file) => {
    const isLight = (rank + file) % 2 === 0;
    return isLight ? "light" : "dark";
  };

  /**
   * Get piece color from piece character
   */
  const getPieceColor = (pieceChar) => {
    return pieceChar === pieceChar.toUpperCase() ? "white" : "black";
  };

  /**
   * Check if a square is selected
   */
  const isSelected = (rank, file) => {
    return (
      selectedSquare &&
      selectedSquare.rank === rank &&
      selectedSquare.file === file
    );
  };

  /**
   * Check if a square is in the last move
   */
  const isLastMove = (rank, file) => {
    if (!showLastMove || !lastMove) return false;

    return (
      (lastMove.from[0] === rank && lastMove.from[1] === file) ||
      (lastMove.to[0] === rank && lastMove.to[1] === file)
    );
  };

  return (
    <div className="game-board-container">
      {/* Rank labels */}
      <div className="flex">
        <div className="rank-labels"></div>
        <div className="board-inner">
          {RANKS.map((rank, idx) => (
            <div key={rank} className="rank-label">
              {rank}
            </div>
          ))}
        </div>
        <div className="rank-labels"></div>
      </div>

      {/* Board with file labels */}
      <div className="flex items-start">
        {/* Left rank labels */}
        <div className="rank-labels-left">
          {RANKS.map((rank, idx) => (
            <div key={rank} className="rank-label">
              {rank}
            </div>
          ))}
        </div>

        {/* Board */}
        <div className="chess-board">
          {board.map((row, rank) =>
            row.map((piece, file) => {
              const squareColor = getSquareColor(rank, file);
              const selected = isSelected(rank, file);
              const last = isLastMove(rank, file);
              const pieceSymbol = getPieceSymbol(piece);
              const pieceColor = piece ? getPieceColor(piece) : null;

              return (
                <div
                  key={`${rank}-${file}`}
                  className={`
                    chess-square
                    ${squareColor}
                    ${selected ? "selected" : ""}
                    ${last ? "last-move" : ""}
                  `}
                  onClick={() => setSelectedSquare({ rank, file })}
                >
                  {piece && (
                    <div
                      className={`
                        chess-piece
                        ${pieceColor}
                      `}
                    >
                      {pieceSymbol}
                    </div>
                  )}

                  {/* Square coordinate label for selected square */}
                  {selected && (
                    <div className="square-coordinate">
                      {FILES[file]}
                      {RANKS[rank]}
                    </div>
                  )}
                </div>
              );
            }),
          )}
        </div>

        {/* Right rank labels */}
        <div className="rank-labels-right">
          {RANKS.map((rank, idx) => (
            <div key={rank} className="rank-label">
              {rank}
            </div>
          ))}
        </div>
      </div>

      {/* File labels */}
      <div className="flex">
        <div className="file-labels-left"></div>
        <div className="file-labels">
          {FILES.map((file, idx) => (
            <div key={file} className="file-label">
              {file}
            </div>
          ))}
        </div>
        <div className="file-labels-right"></div>
      </div>
    </div>
  );
}

export default GameBoard;
