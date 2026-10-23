import React from 'react';
import { Landmark, RefreshCw, Trophy, Blocks } from 'lucide-react';
import { computeTokenTitle } from '../../constants/records';
import { TokenRecord } from '../../types/chog';

interface TownHallDrawerProps {
  myToken: TokenRecord;
  activeTokenId: number;
  tokenRecords: Record<number, TokenRecord>;
  onSimulateTokenTransfer: (newOwner: string) => void;
}

export const TownHallDrawer: React.FC<TownHallDrawerProps> = ({
  myToken,
  activeTokenId,
  tokenRecords,
  onSimulateTokenTransfer,
}) => {
  return (
    <div className="pixel-box rounded-xl p-4 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[540px]">
      <div className="flex items-center gap-1.5 border-b-2 border-[#14101C] pb-2">
        <Landmark className="w-4 h-4 text-[#FFDF6D]" />
        <h3 className="font-pixel-title text-xs text-[#FFDF6D]">
          TOWN HALL & TOKEN TRANSFER DEMO
        </h3>
      </div>

      {/* KEY DEMO VIDEO MOMENT: SIMULATE NFT SALE */}
      <div className="bg-[#1A1426] border-2 border-[#64E8D8] rounded-lg p-3 space-y-2">
        <div className="font-pixel-title text-[10px] text-[#64E8D8] flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-[#64E8D8]" />
          <span>NFT-ESSENTIAL PROOF: SIMULATE CHOG SALE</span>
        </div>
        <p className="font-pixel-body text-base text-[#F6EFE2] leading-snug">
          Simulate selling <strong>{myToken.name}</strong> to a new buyer wallet. Watch all{' '}
          <strong className="text-[#8CE071]">
            {myToken.wins} wins, {myToken.points} points, "{computeTokenTitle(myToken.wins, myToken.points)}" title, and {myToken.badges.length} badges
          </strong>{' '}
          automatically stay with Token #{activeTokenId}!
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onSimulateTokenTransfer('0xB0B...7777')}
            className="flex-1 py-2 min-h-[42px] rounded bg-[#64E8D8] text-[#14101C] font-pixel-body text-base font-bold pixel-btn"
          >
            Simulate Sale → 0xB0B...7777
          </button>
          <button
            onClick={() => onSimulateTokenTransfer('0x71C...9A21')}
            className="px-3 py-2 min-h-[42px] rounded bg-[#2C2140] text-white font-pixel-body text-base pixel-btn"
          >
            Reset Owner
          </button>
        </div>
      </div>

      {/* 1v1 WINS LEADERBOARD */}
      <div>
        <h4 className="font-pixel-body text-base text-[#FFDF6D] uppercase font-bold mb-1 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-[#FFDF6D]" />
          <span>1v1 Wins Leaderboard (By Token ID)</span>
        </h4>
        <div className="space-y-1">
          {Object.values(tokenRecords)
            .sort((a, b) => b.wins - a.wins)
            .slice(0, 5)
            .map((rec, i) => (
              <div
                key={rec.tokenId}
                className="bg-[#14101C] px-2.5 py-1.5 rounded border border-[#2C2140] flex justify-between font-pixel-body text-base"
              >
                <span>
                  #{i + 1} <strong>{rec.name}</strong> ({computeTokenTitle(rec.wins, rec.points)})
                </span>
                <span className="text-[#8CE071] font-bold">
                  {rec.wins}W - {rec.losses}L
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* SOLO HIGH SCORE LEADERBOARD */}
      <div>
        <h4 className="font-pixel-body text-base text-[#64E8D8] uppercase font-bold mb-1 flex items-center gap-1.5">
          <Blocks className="w-4 h-4 text-[#64E8D8]" />
          <span>Solo Block Stacker All-Time Board</span>
        </h4>
        <div className="space-y-1">
          {Object.values(tokenRecords)
            .sort((a, b) => (b.scores.stacker || 0) - (a.scores.stacker || 0))
            .slice(0, 4)
            .map((rec, i) => (
              <div
                key={rec.tokenId}
                className="bg-[#14101C] px-2.5 py-1.5 rounded border border-[#2C2140] flex justify-between font-pixel-body text-base"
              >
                <span>#{i + 1} {rec.name}</span>
                <span className="text-[#FFDF6D] font-bold">{rec.scores.stacker || 0} pts</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
