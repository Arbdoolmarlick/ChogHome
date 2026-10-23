import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../../audio/pixelAudio';
import { TRAIT_MAPPING } from '../../constants/traits';
import { TokenRecord } from '../../types/chog';
import { ChogPixelPortrait } from '../common/ChogPixelPortrait';

interface ChogShowdownModalProps {
  playerToken: TokenRecord;
  opponentToken: TokenRecord;
  onClose: () => void;
  onMatchComplete: (outcome: 'win' | 'loss', gameLabel: string) => void;
}

export const ChogShowdownModal: React.FC<ChogShowdownModalProps> = ({
  playerToken,
  opponentToken,
  onClose,
  onMatchComplete,
}) => {
  const [scores, setScores] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [timer, setTimer] = useState<number>(8);
  const [revealing, setRevealing] = useState<boolean>(false);
  const [lastThrows, setLastThrows] = useState<{ p1: string; p2: string }>({ p1: '❔', p2: '❔' });
  const [resultText, setResultText] = useState<string>('Lock in Rock, Paper, or Scissors within 8s!');
  const [hatFlewOff, setHatFlewOff] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);

  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const THROW_ICONS: Record<string, string> = { Rock: '🪨', Paper: '📜', Scissors: '✂️' };

  const playRPS = useCallback(
    (p1Pick: 'Rock' | 'Paper' | 'Scissors') => {
      if (done || revealing) return;
      const opts: ('Rock' | 'Paper' | 'Scissors')[] = ['Rock', 'Paper', 'Scissors'];
      const p2Pick = opts[Math.floor(Math.random() * 3)];

      setRevealing(true);
      setHatFlewOff(false);
      setResultText('Rock... Paper... Scissors... SHOOT!');
      sfx.tone(440, 0.05);

      revealTimerRef.current = setTimeout(() => {
        setRevealing(false);
        setLastThrows({ p1: THROW_ICONS[p1Pick], p2: THROW_ICONS[p2Pick] });

        if (p1Pick === p2Pick) {
          setResultText(`Both threw ${p1Pick}! Tie — replay the round!`);
          setTimer(8);
          return;
        }

        const p1Wins =
          (p1Pick === 'Rock' && p2Pick === 'Scissors') ||
          (p1Pick === 'Scissors' && p2Pick === 'Paper') ||
          (p1Pick === 'Paper' && p2Pick === 'Rock');

        setHatFlewOff(!p1Wins);
        const nextP1 = scores.p1 + (p1Wins ? 1 : 0);
        const nextP2 = scores.p2 + (p1Wins ? 0 : 1);
        setScores({ p1: nextP1, p2: nextP2 });

        const flairNote = !p1Wins
          ? ` — ${TRAIT_MAPPING.hats[playerToken.traits.hat]?.flair || 'Your hat flew off!'}`
          : ` — ${TRAIT_MAPPING.hats[opponentToken.traits.hat]?.flair || 'Opponent hat flew off!'}`;

        setResultText(`${p1Pick} vs ${p2Pick}: ${p1Wins ? 'Round Won!' : 'Round Lost!'}${flairNote}`);
        setTimer(8);

        if (nextP1 >= 2 || nextP2 >= 2) {
          setDone(true);
          if (nextP1 > nextP2) sfx.win();
          else sfx.lose();
          onMatchComplete(nextP1 > nextP2 ? 'win' : 'loss', 'Chog Showdown');
        }
      }, 520);
    },
    [done, revealing, scores, playerToken.traits.hat, opponentToken.traits.hat, onMatchComplete]
  );

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (done || revealing) return;
    const t = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          const opts: ('Rock' | 'Paper' | 'Scissors')[] = ['Rock', 'Paper', 'Scissors'];
          playRPS(opts[Math.floor(Math.random() * 3)]);
          return 8;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done, revealing, playRPS]);

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="1v1 Chog Showdown Game"
    >
      <div className="pixel-box max-w-md w-full rounded-xl p-5 space-y-4 text-center">
        <div className="flex items-center justify-between border-b-2 border-[#14101C] pb-2">
          <h3 className="font-pixel-title text-xs text-[#E0467E]">✂️ CHOG SHOWDOWN (BO3)</h3>
          <span className="font-pixel-body text-lg text-[#FFDF6D]">⏱️ {timer}s • {scores.p1} - {scores.p2}</span>
        </div>

        <div className="bg-[#1A1426] p-4 rounded-xl border-2 border-[#14101C] relative overflow-hidden">
          {hatFlewOff && (
            <div className="text-xs font-pixel-title text-[#FFDF6D] animate-bounce mb-2">
              💨🧢 HEADGEAR FLEW OFF!
            </div>
          )}
          <div className="flex items-center justify-around gap-3 mb-3">
            <div className={revealing ? 'animate-bounce' : ''}>
              <ChogPixelPortrait traits={playerToken.traits} size={56} showBadge={playerToken.tokenId} />
              <div className="text-2xl mt-1">{revealing ? '✊' : lastThrows.p1}</div>
            </div>
            <span className="font-pixel-title text-xs text-[#FFDF6D]">VS</span>
            <div className={revealing ? 'animate-bounce' : ''}>
              <ChogPixelPortrait traits={opponentToken.traits} size={56} showBadge={opponentToken.tokenId} />
              <div className="text-2xl mt-1">{revealing ? '✊' : lastThrows.p2}</div>
            </div>
          </div>
          <p className="font-pixel-body text-lg text-[#F6EFE2] leading-snug">{resultText}</p>
        </div>

        {!done ? (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'Rock', icon: '🪨' },
                { id: 'Paper', icon: '📜' },
                { id: 'Scissors', icon: '✂️' },
              ] as const
            ).map(choice => (
              <button
                key={choice.id}
                onClick={() => playRPS(choice.id)}
                disabled={revealing}
                className="py-3 min-h-[48px] rounded-lg bg-[#2C2140] hover:bg-[#382B52] border-2 border-[#64E8D8] font-pixel-body text-xl text-white pixel-btn"
              >
                {choice.icon} {choice.id}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => {
              setScores({ p1: 0, p2: 0 });
              setDone(false);
              setLastThrows({ p1: '❔', p2: '❔' });
              setResultText('Rematch started! Pick within 8s!');
            }}
            className="w-full py-2.5 min-h-[44px] rounded-lg bg-[#FFDF6D] text-[#14101C] font-pixel-body text-lg font-bold pixel-btn"
          >
            ↻ Play Best-of-3 Again
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 min-h-[44px] rounded-lg bg-[#2C2140] text-white font-pixel-body text-lg pixel-btn"
        >
          Back to Town
        </button>
      </div>
    </div>
  );
};
