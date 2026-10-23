import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { sfx } from '../../audio/pixelAudio';
import { TokenRecord } from '../../types/chog';

interface SoloArcadeModalProps {
  gameType: 'stacker' | 'snake' | 'memory';
  playerToken: TokenRecord;
  onClose: () => void;
  onSaveScore: (cabinetId: 'stacker' | 'snake' | 'memory', scoreVal: number) => void;
}

const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
];

export const SoloArcadeModal: React.FC<SoloArcadeModalProps> = ({
  gameType,
  playerToken,
  onClose,
  onSaveScore,
}) => {
  // --- BLOCK STACKER (10x20 + Ghost Piece + Hold Slot + Next Preview) ---
  const [stackGrid, setStackGrid] = useState<number[][]>(() =>
    Array.from({ length: 20 }, () => Array(10).fill(0))
  );
  const [piece, setPiece] = useState<{ shape: number[][]; x: number; y: number }>(() => ({
    shape: SHAPES[0],
    x: 3,
    y: 0,
  }));
  const [nextShape, setNextShape] = useState<number[][]>(() => SHAPES[2]);
  const [holdShape, setHoldShape] = useState<number[][] | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);
  const [stackScore, setStackScore] = useState<number>(0);
  const [linesCleared, setLinesCleared] = useState<number>(0);
  const [lineFlash, setLineFlash] = useState<boolean>(false);
  const [stackOver, setStackOver] = useState<boolean>(false);

  // --- CHOG SNAKE (16x16) ---
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ]);
  const [dir, setDir] = useState<{ x: number; y: number }>({ x: 1, y: 0 });
  const [coin, setCoin] = useState<{ x: number; y: number }>({ x: 12, y: 8 });
  const [snakeScore, setSnakeScore] = useState<number>(0);
  const [snakeOver, setSnakeOver] = useState<boolean>(false);

  // --- MEMORY MATCH (4x4 = 8 pairs) ---
  const ICONS = ['💜', '🌈', '🟢', '🦷', '🪣', '🧢', '🐻', '⭐'];
  const [cards, setCards] = useState<{ id: number; icon: string; flipped: boolean; matched: boolean }[]>(() =>
    [...ICONS, ...ICONS]
      .sort(() => Math.random() - 0.5)
      .map((icon, idx) => ({ id: idx, icon, flipped: false, matched: false }))
  );
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [extraMoves, setExtraMoves] = useState<number>(0);
  const [memSeconds, setMemSeconds] = useState<number>(0);
  const [memDone, setMemDone] = useState<boolean>(false);

  // BLOCK STACKER COLLISION & GHOST Y CALCULATION
  const collides = useCallback((g: number[][], sh: number[][], px: number, py: number) => {
    for (let r = 0; r < sh.length; r++) {
      for (let c = 0; c < sh[r].length; c++) {
        if (!sh[r][c]) continue;
        const nx = px + c;
        const ny = py + r;
        if (nx < 0 || nx >= 10 || ny >= 20) return true;
        if (ny >= 0 && g[ny][nx]) return true;
      }
    }
    return false;
  }, []);

  const getGhostY = useCallback(() => {
    let gy = piece.y;
    while (!collides(stackGrid, piece.shape, piece.x, gy + 1)) {
      gy++;
    }
    return gy;
  }, [stackGrid, piece, collides]);

  const lockAndSpawnNext = useCallback(
    (lockPiece: { shape: number[][]; x: number; y: number }, bonusDropPts = 0) => {
      const level = Math.floor(linesCleared / 10) + 1;
      const nextG = stackGrid.map(row => [...row]);
      lockPiece.shape.forEach((row, r) =>
        row.forEach((val, c) => {
          if (val && lockPiece.y + r >= 0 && lockPiece.y + r < 20) {
            nextG[lockPiece.y + r][lockPiece.x + c] = 1;
          }
        })
      );

      const kept = nextG.filter(row => !row.every(cell => cell === 1));
      const cleared = 20 - kept.length;
      while (kept.length < 20) kept.unshift(Array(10).fill(0));
      setStackGrid(kept);

      let totalNewScore = stackScore + bonusDropPts;
      if (cleared > 0) {
        const mult = [0, 100, 300, 500, 800][cleared] || 800;
        totalNewScore += mult * level;
        setLinesCleared(l => l + cleared);
        setLineFlash(true);
        setTimeout(() => setLineFlash(false), 180);
        sfx.jump();
      }
      setStackScore(totalNewScore);
      setCanHold(true);

      const fresh = { shape: nextShape, x: 3, y: 0 };
      setNextShape(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
      if (collides(kept, fresh.shape, fresh.x, fresh.y)) {
        setStackOver(true);
        onSaveScore('stacker', totalNewScore);
      } else {
        setPiece(fresh);
      }
    },
    [linesCleared, stackGrid, stackScore, nextShape, collides, onSaveScore]
  );

  const handleHardDrop = useCallback(() => {
    if (stackOver) return;
    const gy = getGhostY();
    const dropDist = Math.max(0, gy - piece.y);
    sfx.tone(620, 0.05);
    lockAndSpawnNext({ ...piece, y: gy }, dropDist * 2);
  }, [stackOver, getGhostY, piece, lockAndSpawnNext]);

  const handleHoldPiece = useCallback(() => {
    if (stackOver || !canHold) return;
    sfx.tone(480, 0.04);
    setCanHold(false);
    if (!holdShape) {
      setHoldShape(piece.shape);
      setPiece({ shape: nextShape, x: 3, y: 0 });
      setNextShape(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
    } else {
      const prevHold = holdShape;
      setHoldShape(piece.shape);
      setPiece({ shape: prevHold, x: 3, y: 0 });
    }
  }, [stackOver, canHold, holdShape, piece.shape, nextShape]);

  // STACKER TICK ENGINE
  useEffect(() => {
    if (gameType !== 'stacker' || stackOver) return;
    const level = Math.floor(linesCleared / 10) + 1;
    const speed = Math.max(150, 520 - (level - 1) * 45);
    const t = setInterval(() => {
      if (!collides(stackGrid, piece.shape, piece.x, piece.y + 1)) {
        setPiece(prev => ({ ...prev, y: prev.y + 1 }));
      } else {
        lockAndSpawnNext(piece, 0);
      }
    }, speed);
    return () => clearInterval(t);
  }, [gameType, stackOver, stackGrid, piece, linesCleared, collides, lockAndSpawnNext]);

  // SNAKE ENGINE
  const dirRef = useRef(dir);
  dirRef.current = dir;

  useEffect(() => {
    if (gameType !== 'snake' || snakeOver) return;
    const speed = Math.max(85, 190 - Math.floor(snakeScore / 50) * 18);
    const t = setInterval(() => {
      setSnake(prev => {
        const curDir = dirRef.current;
        const head = { x: prev[0].x + curDir.x, y: prev[0].y + curDir.y };
        if (
          head.x < 0 || head.x >= 16 || head.y < 0 || head.y >= 16 ||
          prev.some(seg => seg.x === head.x && seg.y === head.y)
        ) {
          setSnakeOver(true);
          sfx.lose();
          onSaveScore('snake', snakeScore);
          return prev;
        }
        const ate = head.x === coin.x && head.y === coin.y;
        const nextSnake = [head, ...(ate ? prev : prev.slice(0, -1))];
        if (ate) {
          sfx.tone(680, 0.06);
          setSnakeScore(s => s + 10);
          setCoin({ x: Math.floor(Math.random() * 16), y: Math.floor(Math.random() * 16) });
        }
        return nextSnake;
      });
    }, speed);
    return () => clearInterval(t);
  }, [gameType, snakeOver, coin, snakeScore, onSaveScore]);

  // KEYBOARD ACCESSIBILITY FOR BOTH STACKER & SNAKE
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (gameType === 'stacker' && !stackOver) {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
          e.preventDefault();
          if (!collides(stackGrid, piece.shape, piece.x - 1, piece.y)) {
            setPiece(p => ({ ...p, x: p.x - 1 }));
          }
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
          e.preventDefault();
          if (!collides(stackGrid, piece.shape, piece.x + 1, piece.y)) {
            setPiece(p => ({ ...p, x: p.x + 1 }));
          }
        } else if (e.key === 'ArrowDown' || e.key === 's') {
          e.preventDefault();
          if (!collides(stackGrid, piece.shape, piece.x, piece.y + 1)) {
            setPiece(p => ({ ...p, y: p.y + 1 }));
          }
        } else if (e.key === 'ArrowUp' || e.key === 'w') {
          e.preventDefault();
          const rot = piece.shape[0].map((_, i) => piece.shape.map(row => row[i]).reverse());
          if (!collides(stackGrid, rot, piece.x, piece.y)) {
            setPiece(p => ({ ...p, shape: rot }));
          }
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleHardDrop();
        } else if (e.key === 'c' || e.key === 'Shift') {
          e.preventDefault();
          handleHoldPiece();
        }
      } else if (gameType === 'snake' && !snakeOver) {
        if ((e.key === 'ArrowLeft' || e.key === 'a') && dirRef.current.x === 0) {
          e.preventDefault();
          setDir({ x: -1, y: 0 });
        } else if ((e.key === 'ArrowRight' || e.key === 'd') && dirRef.current.x === 0) {
          e.preventDefault();
          setDir({ x: 1, y: 0 });
        } else if ((e.key === 'ArrowUp' || e.key === 'w') && dirRef.current.y === 0) {
          e.preventDefault();
          setDir({ x: 0, y: -1 });
        } else if ((e.key === 'ArrowDown' || e.key === 's') && dirRef.current.y === 0) {
          e.preventDefault();
          setDir({ x: 0, y: 1 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameType, stackOver, snakeOver, stackGrid, piece, collides, handleHardDrop, handleHoldPiece]);

  // MEMORY MATCH TIMER
  useEffect(() => {
    if (gameType !== 'memory' || memDone) return;
    const t = setInterval(() => setMemSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [gameType, memDone]);

  const handleCardFlip = (id: number) => {
    if (memDone || flippedIds.length >= 2) return;
    const target = cards.find(c => c.id === id);
    if (!target || target.flipped || target.matched) return;

    const nextCards = cards.map(c => (c.id === id ? { ...c, flipped: true } : c));
    const nextFlipped = [...flippedIds, id];
    setCards(nextCards);
    setFlippedIds(nextFlipped);
    sfx.tone(540, 0.05);

    if (nextFlipped.length === 2) {
      const [a, b] = nextFlipped.map(fid => nextCards.find(c => c.id === fid)!);
      if (a.icon === b.icon) {
        const matchedCards = nextCards.map(c =>
          c.id === a.id || c.id === b.id ? { ...c, matched: true } : c
        );
        setCards(matchedCards);
        setFlippedIds([]);
        if (matchedCards.every(c => c.matched)) {
          setMemDone(true);
          const finalScore = Math.max(0, 1000 - memSeconds * 5 - extraMoves * 10);
          sfx.win();
          onSaveScore('memory', finalScore);
        }
      } else {
        setExtraMoves(m => m + 1);
        setTimeout(() => {
          setCards(curr =>
            curr.map(c => (c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c))
          );
          setFlippedIds([]);
        }, 650);
      }
    }
  };

  const ghostY = gameType === 'stacker' ? getGhostY() : 0;

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Solo Arcade Cabinet"
    >
      <div className="pixel-box max-w-md w-full rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b-2 border-[#14101C] pb-2">
          <h3 className="font-pixel-title text-xs text-[#64E8D8]">
            {gameType === 'stacker' ? '🧱 BLOCK STACKER' : gameType === 'snake' ? '🐍 CHOG SNAKE' : '🃏 MEMORY MATCH'}
          </h3>
          <button onClick={onClose} className="text-[#B9B4C7] hover:text-white" aria-label="Close Arcade Cabinet">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GAME 1: BLOCK STACKER */}
        {gameType === 'stacker' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center font-pixel-body text-base text-[#FFDF6D] bg-[#1A1426] px-3 py-1.5 rounded border border-[#14101C]">
              <span>Score: <strong>{stackScore}</strong></span>
              <span>Lines: {linesCleared} (Lv.{Math.floor(linesCleared / 10) + 1})</span>
              <span className="text-xs text-[#64E8D8]">Hold: {holdShape ? 'Ready' : 'Empty'}</span>
            </div>

            <div className="flex items-start justify-center gap-3">
              {/* 10x20 Playfield */}
              <div
                className={`bg-[#14101C] p-2 rounded border-2 transition ${
                  lineFlash ? 'border-[#FFDF6D] bg-[#382B52]' : 'border-[#382B52]'
                } w-[196px] grid grid-cols-10 gap-[2px]`}
              >
                {stackGrid.map((row, r) =>
                  row.map((val, c) => {
                    const inActive =
                      r >= piece.y &&
                      r < piece.y + piece.shape.length &&
                      c >= piece.x &&
                      c < piece.x + piece.shape[0].length &&
                      piece.shape[r - piece.y]?.[c - piece.x];
                    const inGhost =
                      !inActive &&
                      r >= ghostY &&
                      r < ghostY + piece.shape.length &&
                      c >= piece.x &&
                      c < piece.x + piece.shape[0].length &&
                      piece.shape[r - ghostY]?.[c - piece.x];
                    return (
                      <div
                        key={`${r}-${c}`}
                        className="w-4 h-4 rounded-[2px]"
                        style={{
                          backgroundColor: val
                            ? '#6C2BD9'
                            : inActive
                            ? '#64E8D8'
                            : inGhost
                            ? 'rgba(100, 232, 216, 0.25)'
                            : '#1A1426',
                          border: inGhost ? '1px dashed #64E8D8' : 'none',
                        }}
                      />
                    );
                  })
                )}
              </div>

              {/* Sidebar */}
              <div className="flex flex-col gap-2 w-24 font-pixel-body">
                <div className="bg-[#1A1426] border border-[#14101C] p-2 rounded text-center">
                  <div className="text-xs text-[#B9B4C7] mb-1">NEXT PIECE</div>
                  <div
                    className="grid gap-1 mx-auto w-fit"
                    style={{ gridTemplateColumns: `repeat(${nextShape[0].length}, 12px)` }}
                  >
                    {nextShape.flatMap((r, ri) =>
                      r.map((cell, ci) => (
                        <div
                          key={`n-${ri}-${ci}`}
                          className="w-3 h-3 rounded-[1px]"
                          style={{ backgroundColor: cell ? '#FFDF6D' : 'transparent' }}
                        />
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={handleHoldPiece}
                  disabled={!canHold || stackOver}
                  className="py-2 px-2 rounded bg-[#2C2140] text-[#64E8D8] text-sm font-bold pixel-btn disabled:opacity-40"
                >
                  ⇄ Hold [C]
                </button>

                <button
                  onClick={handleHardDrop}
                  disabled={stackOver}
                  className="py-2 px-2 rounded bg-[#FFDF6D] text-[#14101C] text-sm font-bold pixel-btn"
                >
                  ⚡ Drop [Space]
                </button>
              </div>
            </div>

            {stackOver && (
              <div className="bg-[#2C2140] border-2 border-[#F03A47] p-2.5 rounded text-center font-pixel-body">
                <div className="text-lg font-bold text-[#FFDF6D]">GAME OVER • Final Score: {stackScore}</div>
                <button
                  onClick={() => {
                    setStackGrid(Array.from({ length: 20 }, () => Array(10).fill(0)));
                    setStackScore(0);
                    setLinesCleared(0);
                    setStackOver(false);
                  }}
                  className="mt-1 px-3 py-1 rounded bg-[#64E8D8] text-[#14101C] font-bold pixel-btn"
                >
                  ↻ Play Again
                </button>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() =>
                  !collides(stackGrid, piece.shape, piece.x - 1, piece.y) &&
                  setPiece(p => ({ ...p, x: p.x - 1 }))
                }
                className="py-2 min-h-[44px] bg-[#2C2140] rounded font-pixel-body text-base pixel-btn"
              >
                ◀ Left
              </button>
              <button
                onClick={() => {
                  const rot = piece.shape[0].map((_, i) => piece.shape.map(row => row[i]).reverse());
                  if (!collides(stackGrid, rot, piece.x, piece.y)) setPiece(p => ({ ...p, shape: rot }));
                }}
                className="py-2 min-h-[44px] bg-[#2C2140] rounded font-pixel-body text-base pixel-btn"
              >
                ↻ Rotate
              </button>
              <button
                onClick={() =>
                  !collides(stackGrid, piece.shape, piece.x, piece.y + 1) &&
                  setPiece(p => ({ ...p, y: p.y + 1 }))
                }
                className="py-2 min-h-[44px] bg-[#2C2140] rounded font-pixel-body text-base pixel-btn"
              >
                ▼ Soft
              </button>
              <button
                onClick={() =>
                  !collides(stackGrid, piece.shape, piece.x + 1, piece.y) &&
                  setPiece(p => ({ ...p, x: p.x + 1 }))
                }
                className="py-2 min-h-[44px] bg-[#2C2140] rounded font-pixel-body text-base pixel-btn"
              >
                Right ▶
              </button>
            </div>
          </div>
        )}

        {/* GAME 2: CHOG SNAKE */}
        {gameType === 'snake' && (
          <div className="space-y-3">
            <div className="flex justify-between font-pixel-body text-base text-[#8CE071] bg-[#1A1426] px-3 py-1.5 rounded border border-[#14101C]">
              <span>Score: <strong>{snakeScore}</strong> (+10/coin)</span>
              <span>Speed Lv.{Math.floor(snakeScore / 50) + 1} • Token #{playerToken.tokenId}</span>
            </div>
            <div
              className="bg-[#14101C] p-2 rounded border-2 border-[#382B52] mx-auto w-[272px] grid gap-[1px]"
              style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
            >
              {Array.from({ length: 256 }).map((_, idx) => {
                const gx = idx % 16;
                const gy = Math.floor(idx / 16);
                const isHead = snake[0].x === gx && snake[0].y === gy;
                const isBody = snake.some(s => s.x === gx && s.y === gy);
                const isCoin = coin.x === gx && coin.y === gy;
                return (
                  <div
                    key={idx}
                    className="w-3.5 h-3.5 rounded-[2px]"
                    style={{
                      backgroundColor: isHead
                        ? '#64E8D8'
                        : isBody
                        ? '#6C2BD9'
                        : isCoin
                        ? '#FFDF6D'
                        : '#1A1426',
                    }}
                  />
                );
              })}
            </div>
            {snakeOver && (
              <div className="bg-[#2C2140] border-2 border-[#FFDF6D] p-2.5 rounded text-center font-pixel-body">
                <div className="text-lg font-bold text-[#FFDF6D]">CRASHED! Final Score: {snakeScore}</div>
                <button
                  onClick={() => {
                    setSnake([{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]);
                    setDir({ x: 1, y: 0 });
                    setSnakeScore(0);
                    setSnakeOver(false);
                  }}
                  className="mt-1 px-3 py-1 rounded bg-[#8CE071] text-[#14101C] font-bold pixel-btn"
                >
                  ↻ Play Again
                </button>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => dirRef.current.x === 0 && setDir({ x: -1, y: 0 })}
                className="py-2 min-h-[44px] bg-[#2C2140] rounded pixel-btn font-pixel-body text-lg"
              >
                ◀
              </button>
              <button
                onClick={() => dirRef.current.y === 0 && setDir({ x: 0, y: -1 })}
                className="py-2 min-h-[44px] bg-[#2C2140] rounded pixel-btn font-pixel-body text-lg"
              >
                ▲
              </button>
              <button
                onClick={() => dirRef.current.y === 0 && setDir({ x: 0, y: 1 })}
                className="py-2 min-h-[44px] bg-[#2C2140] rounded pixel-btn font-pixel-body text-lg"
              >
                ▼
              </button>
              <button
                onClick={() => dirRef.current.x === 0 && setDir({ x: 1, y: 0 })}
                className="py-2 min-h-[44px] bg-[#2C2140] rounded pixel-btn font-pixel-body text-lg"
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {/* GAME 3: MEMORY MATCH */}
        {gameType === 'memory' && (
          <div className="space-y-3">
            <div className="flex justify-between font-pixel-body text-base text-[#FFDF6D] bg-[#1A1426] px-3 py-1.5 rounded border border-[#14101C]">
              <span>Time: {memSeconds}s • Extra Flips: {extraMoves}</span>
              <span>Score: {Math.max(0, 1000 - memSeconds * 5 - extraMoves * 10)}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {cards.map(card => (
                <button
                  key={card.id}
                  onClick={() => handleCardFlip(card.id)}
                  className={`h-16 rounded-lg border-2 text-2xl flex items-center justify-center transition ${
                    card.flipped || card.matched
                      ? 'bg-[#2C2140] border-[#64E8D8] scale-105'
                      : 'bg-[#1A1426] border-[#14101C]'
                  }`}
                >
                  {card.flipped || card.matched ? card.icon : '✦'}
                </button>
              ))}
            </div>
            {memDone && (
              <div className="bg-[#2C2140] border-2 border-[#8CE071] p-2.5 rounded text-center font-pixel-body text-lg text-[#8CE071]">
                🎉 ALL PAIRS MATCHED! Score Saved to Token #{playerToken.tokenId}!
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => {
            if (gameType === 'stacker' && !stackOver && stackScore > 0) onSaveScore('stacker', stackScore);
            if (gameType === 'snake' && !snakeOver && snakeScore > 0) onSaveScore('snake', snakeScore);
            onClose();
          }}
          className="w-full py-2 min-h-[44px] rounded-lg bg-[#64E8D8] text-[#14101C] font-pixel-body text-lg font-bold pixel-btn"
        >
          Save Score & Return to Arcade
        </button>
      </div>
    </div>
  );
};
