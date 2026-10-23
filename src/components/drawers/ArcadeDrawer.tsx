import React from 'react';
import { Gamepad2, Swords, Scissors, CircleDot, Blocks, Sparkles, Layers } from 'lucide-react';
import { TokenRecord } from '../../types/chog';

interface ArcadeDrawerProps {
  myToken: TokenRecord;
  inspectedToken: TokenRecord;
  activeTokenId: number;
  authMode: 'holder' | 'demo' | 'spectator';
  onQueue1v1: () => void;
  onPlay1v1: (gameId: 'four' | 'duel' | 'showdown', opponentId: number) => void;
  onPlaySolo: (cabinetId: 'stacker' | 'snake' | 'memory') => void;
}

export const ArcadeDrawer: React.FC<ArcadeDrawerProps> = ({
  myToken,
  inspectedToken,
  activeTokenId,
  authMode,
  onQueue1v1,
  onPlay1v1,
  onPlaySolo,
}) => {
  const targetOpponentId =
    inspectedToken.tokenId === activeTokenId ? 1337 : inspectedToken.tokenId;

  return (
    <div className="pixel-box rounded-xl p-4 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[540px]">
      <div className="flex items-center justify-between border-b-2 border-[#14101C] pb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Gamepad2 className="w-4 h-4 text-[#64E8D8]" />
            <h3 className="font-pixel-title text-xs text-[#64E8D8]">PIXEL ARCADE</h3>
          </div>
          <p className="font-pixel-body text-sm text-[#B9B4C7]">
            +20 pts per 1v1 Win • +5 pts per Loss • Stored on Token #{activeTokenId}
          </p>
        </div>
        <button
          disabled={authMode === 'spectator'}
          onClick={onQueue1v1}
          className="px-3 py-1.5 min-h-[40px] rounded bg-[#FFDF6D] text-[#14101C] font-pixel-body text-sm font-bold pixel-btn disabled:opacity-40"
        >
          Queue 1v1 Desk (10s)
        </button>
      </div>

      {/* 1v1 HEAD-TO-HEAD MATCHUPS */}
      <div className="space-y-2">
        <div className="font-pixel-title text-[10px] text-[#E0467E] uppercase">
          1v1 Head-to-Head Games (vs #{targetOpponentId} {inspectedToken.shortName})
        </div>
        {[
          { id: 'four', name: 'Chog Four', desc: '7x6 Connect-4 • 20s Turn Timer • Minimax AI', Icon: CircleDot, color: 'text-[#E0467E]' },
          { id: 'duel', name: 'Chog Duel', desc: 'Best of 5 Reaction Slash • False-Start Penalty', Icon: Swords, color: 'text-[#FFDF6D]' },
          { id: 'showdown', name: 'Chog Showdown', desc: 'Best of 3 Rock-Paper-Scissors • Hat-Fly Flair', Icon: Scissors, color: 'text-[#64E8D8]' },
        ].map(g => (
          <div
            key={g.id}
            className="bg-[#1A1426] border border-[#14101C] p-2.5 rounded-lg flex items-center justify-between"
          >
            <div className="font-pixel-body">
              <div className="text-white font-bold text-base flex items-center gap-1.5">
                <g.Icon className={`w-4 h-4 ${g.color}`} />
                <span>{g.name}</span>
              </div>
              <div className="text-xs text-[#B9B4C7]">{g.desc}</div>
            </div>
            <button
              disabled={authMode === 'spectator'}
              onClick={() => onPlay1v1(g.id as 'four' | 'duel' | 'showdown', targetOpponentId)}
              className="px-3 py-1.5 min-h-[40px] rounded bg-[#64E8D8] text-[#14101C] font-pixel-body text-sm font-bold pixel-btn disabled:opacity-40"
            >
              Play 1v1
            </button>
          </div>
        ))}
      </div>

      {/* SOLO ARCADE CABINETS */}
      <div className="space-y-2 pt-1">
        <div className="font-pixel-title text-[10px] text-[#8CE071] uppercase">
          Solo Arcade Cabinets (Token High Scores)
        </div>
        {[
          { id: 'stacker', name: 'Block Stacker', best: myToken.scores.stacker || 0, desc: '10x20 Falling Blocks • Line Multipliers' },
          { id: 'snake',   name: 'Chog Snake',    best: myToken.scores.snake || 0,   desc: '16x16 Coin Collector • Speed Ramps' },
          { id: 'memory',  name: 'Memory Match',  best: myToken.scores.memory || 0,  desc: '4x4 Chog Pair Flip • Time & Move Formula' },
        ].map(cab => (
          <div
            key={cab.id}
            className="bg-[#1A1426] border border-[#14101C] p-2.5 rounded-lg flex items-center justify-between"
          >
            <div className="font-pixel-body">
              <div className="text-white font-bold text-base">
                {cab.name} <span className="text-[#FFDF6D] text-xs">(Best: {cab.best})</span>
              </div>
              <div className="text-xs text-[#B9B4C7]">{cab.desc}</div>
            </div>
            <button
              onClick={() => onPlaySolo(cab.id as 'stacker' | 'snake' | 'memory')}
              className="px-3 py-1.5 min-h-[40px] rounded bg-[#6C2BD9] text-white font-pixel-body text-sm font-bold pixel-btn"
            >
              Insert Coin
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
