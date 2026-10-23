import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../../audio/pixelAudio';
import { computeTokenTitle } from '../../constants/records';
import { TRAIT_MAPPING } from '../../constants/traits';
import { TokenRecord } from '../../types/chog';
import { ChogPixelPortrait } from '../common/ChogPixelPortrait';

interface ChogFourModalProps {
  playerToken: TokenRecord;
  opponentToken: TokenRecord;
  onClose: () => void;
  onMatchComplete: (outcome: 'win' | 'loss' | 'draw', gameLabel: string) => void;
}

export const ChogFourModal: React.FC<ChogFourModalProps> = ({
  playerToken,
  opponentToken,
  onClose,
  onMatchComplete,
}) => {
  const ROWS = 6;
  const COLS = 7;
  const [board, setBoard] = useState<number[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [turn, setTurn] = useState<number>(1); // 1 = Player, 2 = Opponent
  const [winner, setWinner] = useState<number | 'draw' | null>(null);
  const [winCells, setWinCells] = useState<[number, number][]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [lastDropped, setLastDropped] = useState<{ r: number; c: number; player: number; ts: number } | null>(null);
  const [hoverCol, setHoverCol] = useState<number>(3);
  const [shake, setShake] = useState<boolean>(false);

  const timeoutsRef = useRef<{ 1: number; 2: number }>({ 1: 0, 2: 0 });
  const boardRef = useRef(board);
  boardRef.current = board;
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const winnerRef = useRef(winner);
  winnerRef.current = winner;

  const checkFourWinner = useCallback((b: number[][]) => {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = b[r][c];
        if (!p) continue;
        for (const [dr, dc] of dirs) {
          const cells: [number, number][] = [[r, c]];
          for (let step = 1; step < 4; step++) {
            const nr = r + dr * step;
            const nc = c + dc * step;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === p) {
              cells.push([nr, nc]);
            }
          }
          if (cells.length === 4) return { winner: p, cells };
        }
      }
    }
    if (b[0].every(cell => cell !== 0)) return { winner: 'draw' as const, cells: [] as [number, number][] };
    return null;
  }, []);

  const dropDisc = useCallback((col: number, currentPlayer: number, isTimeoutDrop = false) => {
    if (winnerRef.current) return false;
    const currentBoard = boardRef.current;
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (currentBoard[r][col] === 0) {
        targetRow = r;
        break;
      }
    }
    if (targetRow === -1) return false;

    const nextBoard = currentBoard.map(row => [...row]);
    nextBoard[targetRow][col] = currentPlayer;
    setBoard(nextBoard);
    setLastDropped({ r: targetRow, c: col, player: currentPlayer, ts: Date.now() });
    setShake(true);
    setTimeout(() => setShake(false), 180);
    sfx.tone(currentPlayer === 1 ? 520 : 380, 0.06);

    if (!isTimeoutDrop) {
      timeoutsRef.current[currentPlayer as 1 | 2] = 0;
    }

    const res = checkFourWinner(nextBoard);
    if (res) {
      setWinner(res.winner);
      setWinCells(res.cells);
      if (res.winner === 1) sfx.win();
      else sfx.lose();
      onMatchComplete(res.winner === 1 ? 'win' : res.winner === 2 ? 'loss' : 'draw', 'Chog Four');
    } else {
      setTurn(currentPlayer === 1 ? 2 : 1);
      setTimeLeft(20);
    }
    return true;
  }, [checkFourWinner, onMatchComplete]);

  // 20-second turn timer (2 consecutive timeouts forfeit)
  useEffect(() => {
    if (winner) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          const currentTurn = turnRef.current as 1 | 2;
          timeoutsRef.current[currentTurn] = (timeoutsRef.current[currentTurn] || 0) + 1;
          if (timeoutsRef.current[currentTurn] >= 2) {
            const forfeitWinner = currentTurn === 1 ? 2 : 1;
            setWinner(forfeitWinner);
            onMatchComplete(forfeitWinner === 1 ? 'win' : 'loss', 'Chog Four (Timeout Forfeit)');
            return 0;
          }
          const validCols = [0, 1, 2, 3, 4, 5, 6].filter(c => boardRef.current[0][c] === 0);
          if (validCols.length > 0) {
            const randCol = validCols[Math.floor(Math.random() * validCols.length)];
            setTimeout(() => dropDisc(randCol, currentTurn, true), 10);
          }
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [winner, dropDisc, onMatchComplete]);

  // Depth-3 Minimax AI for AI Opponent (Turn 2)
  useEffect(() => {
    if (winner || turn !== 2) return;
    const timer = setTimeout(() => {
      const currentBoard = boardRef.current;
      const validCols = [0, 1, 2, 3, 4, 5, 6].filter(c => currentBoard[0][c] === 0);
      if (validCols.length === 0) return;

      const simDrop = (b: number[][], col: number, p: number) => {
        const copy = b.map(r => [...r]);
        for (let r = ROWS - 1; r >= 0; r--) {
          if (copy[r][col] === 0) {
            copy[r][col] = p;
            return copy;
          }
        }
        return null;
      };

      if (Math.random() < 0.15) {
        const randomCol = validCols[Math.floor(Math.random() * validCols.length)];
        dropDisc(randomCol, 2);
        return;
      }

      for (const c of validCols) {
        const nextB = simDrop(currentBoard, c, 2);
        if (nextB && checkFourWinner(nextB)?.winner === 2) {
          dropDisc(c, 2);
          return;
        }
      }
      for (const c of validCols) {
        const nextB = simDrop(currentBoard, c, 1);
        if (nextB && checkFourWinner(nextB)?.winner === 1) {
          dropDisc(c, 2);
          return;
        }
      }

      const centerOrder = [3, 2, 4, 1, 5, 0, 6].filter(c => validCols.includes(c));
      dropDisc(centerOrder[0], 2);
    }, 650);
    return () => clearTimeout(timer);
  }, [turn, winner, dropDisc, checkFourWinner]);

  const p1Color = TRAIT_MAPPING.bodies[playerToken.traits.body]?.primary || '#64E8D8';
  const p2Color = TRAIT_MAPPING.bodies[opponentToken.traits.body]?.primary || '#E0467E';

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="1v1 Chog Four Game"
    >
      <div className={`pixel-box max-w-lg w-full rounded-xl p-4 space-y-3 transition-transform ${shake ? 'translate-y-1' : ''}`}>
        <div className="flex items-center justify-between border-b-2 border-[#14101C] pb-2">
          <div>
            <h3 className="font-pixel-title text-xs text-[#64E8D8]">1v1 CHOG FOUR</h3>
            <p className="font-pixel-body text-sm text-[#B9B4C7]">
              Connect 4 Chog discs • Colorblind Symbols (★ vs ◆) • Server-Authoritative
            </p>
          </div>
          <div
            className={`font-pixel-title text-xs px-2.5 py-1 rounded border-2 ${
              timeLeft <= 5 ? 'bg-[#F03A47] text-white border-white animate-pulse' : 'bg-[#1A1426] text-[#FFDF6D] border-[#14101C]'
            }`}
          >
            ⏱️ {timeLeft}s
          </div>
        </div>

        {/* Portraits + Live Status */}
        <div className="flex items-center justify-between text-sm font-pixel-body bg-[#1A1426] p-2.5 rounded-lg border-2 border-[#14101C]">
          <div className={`flex items-center gap-2 ${turn === 1 ? 'text-[#64E8D8] font-bold' : 'text-[#B9B4C7]'}`}>
            <ChogPixelPortrait traits={playerToken.traits} size={36} />
            <div>
              <div>★ YOU (#{playerToken.tokenId})</div>
              <div className="text-xs text-[#FFDF6D]">
                {turn === 1 && !winner ? 'Your Turn!' : winner === 1 ? '🎉 Winner!' : 'Waiting...'}
              </div>
            </div>
          </div>
          <span className="font-pixel-title text-[10px] text-[#FFDF6D]">VS</span>
          <div className={`flex items-center gap-2 text-right ${turn === 2 ? 'text-[#E0467E] font-bold' : 'text-[#B9B4C7]'}`}>
            <div>
              <div>◆ #{opponentToken.tokenId} {opponentToken.shortName}</div>
              <div className="text-xs text-[#FFDF6D]">
                {turn === 2 && !winner ? 'Thinking...' : winner === 2 ? '🎉 Winner!' : 'Ready'}
              </div>
            </div>
            <ChogPixelPortrait traits={opponentToken.traits} size={36} />
          </div>
        </div>

        {/* Column Drop Preview Strip */}
        <div className="grid grid-cols-7 gap-2 px-3">
          {Array.from({ length: COLS }).map((_, cIdx) => (
            <button
              key={`preview-${cIdx}`}
              onClick={() => turn === 1 && dropDisc(cIdx, 1)}
              onMouseEnter={() => setHoverCol(cIdx)}
              disabled={turn !== 1 || Boolean(winner)}
              className={`h-6 rounded flex items-center justify-center font-pixel-title text-[10px] transition ${
                hoverCol === cIdx && turn === 1 && !winner
                  ? 'bg-[#FFDF6D] text-[#14101C] -translate-y-0.5'
                  : 'bg-[#1A1426] text-[#B9B4C7]'
              }`}
              aria-label={`Drop disc in column ${cIdx + 1}`}
            >
              ▼
            </button>
          ))}
        </div>

        {/* 7x6 Grid with Drop Bounce & Winning Highlight */}
        <div className="bg-[#1A1426] p-3 rounded-lg border-2 border-[#14101C] grid grid-cols-7 gap-2">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const isWinDisc = winCells.some(([wr, wc]) => wr === rIdx && wc === cIdx);
              const isJustDropped = lastDropped && lastDropped.r === rIdx && lastDropped.c === cIdx;
              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => turn === 1 && dropDisc(cIdx, 1)}
                  onMouseEnter={() => setHoverCol(cIdx)}
                  disabled={turn !== 1 || Boolean(winner)}
                  className={`aspect-square rounded-full border-2 flex items-center justify-center text-sm font-pixel-title transition-all duration-200 ${
                    isWinDisc
                      ? 'animate-bounce border-[#FFDF6D] ring-4 ring-[#FFDF6D] scale-105'
                      : isJustDropped
                      ? 'scale-105 border-white'
                      : 'border-[#14101C]'
                  }`}
                  style={{
                    backgroundColor: cell === 1 ? p1Color : cell === 2 ? p2Color : '#241B35',
                    color: '#14101C',
                  }}
                >
                  {cell === 1 ? '★' : cell === 2 ? '◆' : ''}
                </button>
              );
            })
          )}
        </div>

        {winner && (
          <div className="bg-[#2C2140] border-2 border-[#FFDF6D] p-3 rounded-lg text-center font-pixel-body space-y-1">
            <div className="text-xl font-bold text-[#FFDF6D]">
              {winner === 1
                ? `🎉 VICTORY! +20 POINTS TO TOKEN #${playerToken.tokenId}!`
                : winner === 2
                ? `💀 DEFEAT! +5 PARTICIPATION POINTS TO TOKEN #${playerToken.tokenId}`
                : '🤝 FULL BOARD DRAW! (+10 POINTS)'}
            </div>
            <div className="text-sm text-[#64E8D8]">
              Token #{playerToken.tokenId} Title Status:{' '}
              {computeTokenTitle(
                playerToken.wins + (winner === 1 ? 1 : 0),
                playerToken.points + (winner === 1 ? 20 : 5)
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 pt-1">
          <button
            onClick={() => {
              setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
              setWinner(null);
              setWinCells([]);
              setLastDropped(null);
              setTurn(1);
              setTimeLeft(20);
              timeoutsRef.current = { 1: 0, 2: 0 };
            }}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-[#FFDF6D] text-[#14101C] font-pixel-body text-lg font-bold pixel-btn"
          >
            ↻ Play Again
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-[#2C2140] text-[#F6EFE2] font-pixel-body text-lg pixel-btn"
          >
            {winner ? 'Back to Town' : 'Resign & Exit'}
          </button>
        </div>
      </div>
    </div>
  );
};
