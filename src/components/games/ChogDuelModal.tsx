import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Swords } from 'lucide-react';
import { sfx } from '../../audio/pixelAudio';
import { TokenRecord } from '../../types/chog';
import { ChogPixelPortrait } from '../common/ChogPixelPortrait';

interface ChogDuelModalProps {
  playerToken: TokenRecord;
  opponentToken: TokenRecord;
  onClose: () => void;
  onMatchComplete: (outcome: 'win' | 'loss', gameLabel: string) => void;
}

export const ChogDuelModal: React.FC<ChogDuelModalProps> = ({
  playerToken,
  opponentToken,
  onClose,
  onMatchComplete,
}) => {
  const [round, setRound] = useState<number>(1);
  const [matchId, setMatchId] = useState<number>(0);
  const [scores, setScores] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [phase, setPhase] = useState<'waiting' | 'now' | 'round_end' | 'match_end'>('waiting');
  const [message, setMessage] = useState<string>('Steady your blade... Wait for "NOW!"');
  const [reactionLog, setReactionLog] = useState<string | null>(null);
  const [hitFlash, setHitFlash] = useState<boolean>(false);
  const [roundWinnerState, setRoundWinnerState] = useState<number | null>(null);

  const nowTimestampRef = useRef<number>(0);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishRound = useCallback(
    (roundWinner: number, infoText: string) => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
      setHitFlash(true);
      setTimeout(() => setHitFlash(false), 140);
      setRoundWinnerState(roundWinner);
      setPhase('round_end');
      setReactionLog(infoText);

      setScores(prev => {
        const next = {
          p1: prev.p1 + (roundWinner === 1 ? 1 : 0),
          p2: prev.p2 + (roundWinner === 2 ? 1 : 0),
        };
        if (next.p1 >= 3 || next.p2 >= 3 || round >= 5) {
          setTimeout(() => {
            setPhase('match_end');
            const won = next.p1 > next.p2;
            if (won) sfx.win();
            else sfx.lose();
            onMatchComplete(won ? 'win' : 'loss', 'Chog Duel');
          }, 950);
        } else {
          setTimeout(() => {
            setRound(r => r + 1);
          }, 1350);
        }
        return next;
      });
    },
    [round, onMatchComplete]
  );

  useEffect(() => {
    if (phase === 'match_end') return;
    setPhase('waiting');
    setRoundWinnerState(null);
    setMessage('Wait for the signal... (Do NOT tap early!)');
    setReactionLog(null);

    const delay = 1500 + Math.random() * 2400; // 1.5s to 3.9s
    signalTimerRef.current = setTimeout(() => {
      nowTimestampRef.current = performance.now();
      setPhase('now');
      setMessage('⚡ NOW! TAP TO SLASH! ⚡');
      sfx.tone(880, 0.08);

      // AI Resident reacts in 255ms - 445ms
      const aiMs = Math.round(255 + Math.random() * 190);
      aiTimerRef.current = setTimeout(() => {
        finishRound(2, `${opponentToken.shortName} struck first in ${aiMs} ms!`);
      }, aiMs);
    }, delay);

    return () => {
      if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [round, matchId]); // triggers on round or rematch

  const handlePlayerTap = () => {
    if (phase === 'waiting') {
      sfx.lose();
      finishRound(2, `⚠️ FALSE START! You flinched before "NOW!" — ${opponentToken.shortName} takes the round.`);
    } else if (phase === 'now') {
      const ms = Math.max(80, Math.round(performance.now() - nowTimestampRef.current));
      sfx.jump();
      finishRound(1, `⚡ CRITICAL SLASH! You reacted in ${ms} ms!`);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
      aria-label="1v1 Chog Duel Game"
    >
      <div
        className={`pixel-box max-w-lg w-full rounded-xl p-5 space-y-4 text-center transition ${
          hitFlash ? 'bg-white text-[#14101C] scale-[1.02]' : ''
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-[#14101C] pb-2">
          <div className="flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-[#FFDF6D]" />
            <h3 className="font-pixel-title text-xs text-[#FFDF6D]">1v1 CHOG DUEL (BEST OF 5)</h3>
          </div>
          <span className="font-pixel-body text-lg text-[#64E8D8]">
            Round {round}/5 • Score: {scores.p1} - {scores.p2}
          </span>
        </div>

        <button
          onClick={handlePlayerTap}
          disabled={phase === 'round_end' || phase === 'match_end'}
          className={`w-full py-12 rounded-xl border-4 transition-all flex flex-col items-center justify-center gap-4 relative overflow-hidden ${
            phase === 'now'
              ? 'bg-[#64E8D8] text-[#14101C] border-white scale-[1.01] shadow-[0_0_30px_#64E8D8]'
              : phase === 'waiting'
              ? 'bg-[#14101C] text-[#F6EFE2] border-[#E0467E]'
              : 'bg-[#1A1426] text-[#F6EFE2] border-[#78718A]'
          }`}
        >
          {phase === 'round_end' && (
            <div className="absolute inset-x-0 top-1/2 h-1.5 bg-[#FFDF6D] -rotate-6 animate-pulse" />
          )}

          <div className="flex items-center justify-around w-full px-6 relative z-10">
            <div className={`transition-transform duration-150 ${roundWinnerState === 1 ? 'translate-x-10 scale-110' : ''}`}>
              <ChogPixelPortrait traits={playerToken.traits} size={64} showBadge={playerToken.tokenId} />
              <div className="font-pixel-body text-xs mt-1">YOU</div>
            </div>
            <span className="text-lg font-pixel-title text-[#FFDF6D] flex items-center justify-center">
              {phase === 'waiting' ? '...' : <Swords className="w-6 h-6 text-[#FFDF6D]" />}
            </span>
            <div className={`transition-transform duration-150 ${roundWinnerState === 2 ? '-translate-x-10 scale-110' : ''}`}>
              <ChogPixelPortrait traits={opponentToken.traits} size={64} showBadge={opponentToken.tokenId} />
              <div className="font-pixel-body text-xs mt-1">{opponentToken.shortName}</div>
            </div>
          </div>

          <div className="font-pixel-title text-xs sm:text-sm px-3">{message}</div>
          {reactionLog && (
            <div className="font-pixel-body text-xl font-bold text-[#FFDF6D] bg-[#14101C]/85 px-3 py-1 rounded">
              {reactionLog}
            </div>
          )}
        </button>

        {phase === 'match_end' && (
          <div className="bg-[#2C2140] border-2 border-[#64E8D8] p-3.5 rounded-lg font-pixel-body space-y-2">
            <div className="text-xl font-bold text-[#FFDF6D]">
              {scores.p1 > scores.p2
                ? `🏆 DUEL CHAMPION (${scores.p1}-${scores.p2})! +20 Points to Token #${playerToken.tokenId}!`
                : `Duel Complete (${scores.p1}-${scores.p2}). +5 Points to Token #${playerToken.tokenId}.`}
            </div>
            <button
              onClick={() => {
                setScores({ p1: 0, p2: 0 });
                setRound(1);
                setMatchId(m => m + 1);
                setPhase('waiting');
              }}
              className="px-4 py-1.5 rounded bg-[#FFDF6D] text-[#14101C] font-bold pixel-btn"
            >
              ↻ Instant Rematch
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-[#2C2140] text-white font-pixel-body text-lg pixel-btn"
          >
            Back to Town
          </button>
        </div>
      </div>
    </div>
  );
};
