import React from 'react';
import { Moon, Sun, Volume2, VolumeX, Home, CloudRain, RotateCcw } from 'lucide-react';
import { computeTokenTitle } from '../../constants/records';
import { TokenRecord } from '../../types/chog';
import { ChogPixelPortrait } from '../common/ChogPixelPortrait';

interface TownHeaderProps {
  myToken: TokenRecord;
  activeTokenId: number;
  authMode: 'holder' | 'demo' | 'spectator';
  connectedWallet: string | null;
  townMinutes: number;
  setTownMinutes: React.Dispatch<React.SetStateAction<number>>;
  rainEnabled: boolean;
  setRainEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  qualityTier: 'high' | 'medium' | 'low';
  setQualityTier: React.Dispatch<React.SetStateAction<'high' | 'medium' | 'low'>>;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onReturnLanding: () => void;
  onSwitchChog: () => void;
}

export const TownHeader: React.FC<TownHeaderProps> = ({
  myToken,
  activeTokenId,
  authMode,
  connectedWallet,
  townMinutes,
  setTownMinutes,
  rainEnabled,
  setRainEnabled,
  qualityTier,
  setQualityTier,
  soundEnabled,
  onToggleSound,
  onReturnLanding,
  onSwitchChog,
}) => {
  const hr = (townMinutes / 60) % 24;
  const isNight = hr >= 19.5 || hr < 5.5;

  return (
    <header className="bg-[#241B35] border-b-3 border-[#14101C] px-2.5 sm:px-4 h-14 sm:h-16 shrink-0 flex items-center justify-between gap-2 z-30">
      {/* LEFT: HOME / AVATAR / IDENTITY */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          onClick={onReturnLanding}
          className="p-1.5 sm:px-2.5 sm:py-1.5 min-h-[38px] rounded-lg bg-[#2C2140] text-[#FFDF6D] font-pixel-body text-base pixel-btn flex items-center gap-1.5 shrink-0"
          title="Return to ChogHome Exterior"
          aria-label="Return to ChogHome Exterior"
        >
          <Home className="w-4 h-4 text-[#FFDF6D]" />
          <span className="hidden sm:inline">Exterior</span>
        </button>

        <ChogPixelPortrait traits={myToken.traits} size={36} pixelData={myToken.pixelData} />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-pixel-title text-[11px] sm:text-xs text-[#FFDF6D] whitespace-nowrap m-0 p-0 font-normal">
              CHOG TOWN
            </h1>
            <span className="text-[11px] font-pixel-body px-1.5 py-0.2 rounded bg-[#1A1426] border border-[#64E8D8] text-[#64E8D8] hidden sm:inline-block truncate max-w-[130px] md:max-w-none">
              {authMode === 'spectator' ? 'Spectator' : `#${activeTokenId} • ${connectedWallet}`}
            </span>
          </div>
          <div className="font-pixel-body text-xs text-[#B9B4C7] truncate">
            <span className="text-[#64E8D8]">#{activeTokenId}</span> • {computeTokenTitle(myToken.wins, myToken.points)} ({myToken.points} pts)
          </div>
        </div>
      </div>

      {/* RIGHT: CLOCK, WEATHER, AUDIO, SWITCH */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => setTownMinutes(m => (m + 180) % (24 * 60))}
          title="Click to advance time of day (Dawn / Noon / Dusk / Night)"
          className="bg-[#1A1426] border-2 border-[#14101C] px-2 py-1 min-h-[38px] rounded-lg font-pixel-body text-sm flex items-center gap-1 text-[#FFDF6D] pixel-btn"
        >
          {isNight ? (
            <Moon className="w-3.5 h-3.5 text-[#7A88C9]" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-[#FFDF6D]" />
          )}
          <span>
            {String(Math.floor(townMinutes / 60) % 24).padStart(2, '0')}:
            {String(Math.floor(townMinutes % 60)).padStart(2, '0')}
          </span>
        </button>

        <button
          onClick={() => setRainEnabled(r => !r)}
          className={`p-2 min-h-[38px] rounded-lg font-pixel-body text-sm pixel-btn flex items-center justify-center ${
            rainEnabled ? 'bg-[#64E8D8] text-[#14101C] font-bold' : 'bg-[#2C2140] text-[#B9B4C7]'
          }`}
          title="Toggle Cozy Rain Shower"
          aria-label="Toggle Cozy Rain Shower"
        >
          <CloudRain className={`w-4 h-4 ${rainEnabled ? 'text-[#14101C]' : 'text-[#64E8D8]'}`} />
        </button>

        <button
          onClick={onToggleSound}
          className="p-2 min-h-[38px] rounded-lg bg-[#2C2140] text-[#F6EFE2] pixel-btn flex items-center justify-center"
          title="Toggle 8-Bit Audio"
          aria-label="Toggle 8-Bit Audio"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-[#64E8D8]" />
          ) : (
            <VolumeX className="w-4 h-4 text-[#B9B4C7]" />
          )}
        </button>

        <button
          onClick={onSwitchChog}
          className="px-2.5 py-1.5 min-h-[38px] rounded-lg bg-[#2C2140] text-[#64E8D8] border border-[#64E8D8]/50 font-pixel-body text-sm pixel-btn flex items-center gap-1"
          title="Switch Active Chog NFT"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#64E8D8]" />
          <span className="hidden sm:inline">Switch</span>
        </button>
      </div>
    </header>
  );
};
