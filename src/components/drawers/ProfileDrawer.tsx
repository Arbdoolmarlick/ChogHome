import React, { useState } from 'react';
import { UserPlus, Check, MessageSquare, Swords, Camera, RotateCw, Award } from 'lucide-react';
import { sfx } from '../../audio/pixelAudio';
import { computeTokenTitle } from '../../constants/records';
import { TRAIT_MAPPING } from '../../constants/traits';
import { TokenRecord } from '../../types/chog';
import { ChogPixelPortrait } from '../common/ChogPixelPortrait';

interface ProfileDrawerProps {
  myToken: TokenRecord;
  inspectedToken: TokenRecord;
  activeTokenId: number;
  authMode: 'holder' | 'demo' | 'spectator';
  tokenRecords: Record<number, TokenRecord>;
  onAddFriend: (fid: number) => void;
  onSendDM: () => void;
  onChallenge: (tid: number) => void;
  onWalkTo: (fid: number) => void;
  onInspect: (fid: number) => void;
  onExportPNG: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  myToken,
  inspectedToken,
  activeTokenId,
  authMode,
  tokenRecords,
  onAddFriend,
  onSendDM,
  onChallenge,
  onWalkTo,
  onInspect,
  onExportPNG,
}) => {
  const [cardFlipped, setCardFlipped] = useState(false);

  return (
    <div className="pixel-box rounded-xl p-3 sm:p-4 flex-1 flex flex-col gap-3 min-h-0">
      {/* COLLECTIBLE CARD HEADER WITH FLIP & PNG EXPORT */}
      <div className="bg-gradient-to-br from-[#2C2140] to-[#1A1426] border-2 border-[#FFDF6D] rounded-xl p-3 sm:p-3.5 relative">
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <span className="px-2 py-0.5 rounded bg-[#14101C] text-[#FFDF6D] font-pixel-title text-[11px] border border-[#FFDF6D]/40">
            MONAD ERC-721 • #{inspectedToken.tokenId}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                sfx.tone(520, 0.04);
                setCardFlipped(f => !f);
              }}
              className="px-2 py-1 min-h-[34px] rounded bg-[#241B35] border border-[#64E8D8] text-[#64E8D8] font-pixel-body text-xs pixel-btn flex items-center gap-1 whitespace-nowrap"
            >
              <RotateCw className="w-3 h-3 shrink-0" />
              <span>{cardFlipped ? 'Front' : 'Flip Lore'}</span>
            </button>
            <button
              onClick={onExportPNG}
              className="px-2 py-1 min-h-[34px] rounded bg-[#FFDF6D] text-[#14101C] font-pixel-body text-xs font-bold pixel-btn flex items-center gap-1 whitespace-nowrap"
              title="Download Collectible Card as PNG"
            >
              <Camera className="w-3 h-3 shrink-0" />
              <span>Save Card</span>
            </button>
          </div>
        </div>

        {!cardFlipped ? (
          <div className="flex items-center gap-3">
            <ChogPixelPortrait
              traits={inspectedToken.traits}
              size={70}
              showBadge={inspectedToken.tokenId}
              pixelData={inspectedToken.pixelData}
            />
            <div className="font-pixel-body leading-tight flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-pixel-title text-xs sm:text-sm text-[#F6EFE2] truncate">{inspectedToken.name}</h3>
                {inspectedToken.isResident && (
                  <span className="px-1.5 py-0.5 text-[11px] font-pixel-body bg-[#FFDF6D] text-[#14101C] font-bold rounded shrink-0">
                    AI RESIDENT
                  </span>
                )}
              </div>
              <p className="text-base sm:text-lg text-[#64E8D8] font-bold mt-0.5 flex items-center gap-1 truncate">
                <Award className="w-4 h-4 text-[#FFDF6D] shrink-0" />
                <span>{computeTokenTitle(inspectedToken.wins, inspectedToken.points)} ({inspectedToken.points} pts)</span>
              </p>
              <p className="text-sm text-[#B9B4C7] truncate">
                Owner: <code>{inspectedToken.owner}</code> • Record:{' '}
                <strong className="text-[#8CE071]">{inspectedToken.wins}W</strong> -{' '}
                <strong className="text-[#FF6B7A]">{inspectedToken.losses}L</strong>
              </p>
              <p className="text-xs text-[#FFDF6D] mt-0.5 truncate">
                Vibe: {TRAIT_MAPPING.bodies[inspectedToken.traits.body]?.vibe || 'Citizen'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 font-pixel-body py-1">
            <div className="flex gap-2.5 items-center">
              {(inspectedToken.proxyImageUrl || inspectedToken.imageUrl) ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden border-2 border-[#14101C] bg-[#14101C]">
                  <img
                    src={inspectedToken.proxyImageUrl || inspectedToken.imageUrl}
                    alt={`Original NFT artwork for Chog #${inspectedToken.tokenId}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg border-2 border-[#14101C] bg-[#14101C] flex flex-col items-center justify-center p-1 text-center">
                  <span className="text-[10px] text-[#64E8D8] font-bold">GENESIS NFT</span>
                  <span className="text-xs text-[#FFDF6D]">#{inspectedToken.tokenId}</span>
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="text-sm text-[#FFDF6D] font-bold">
                  Original Genesis NFT Artwork
                </div>
                <div className="text-xs text-[#B9B4C7] truncate">
                  {inspectedToken.rawAttributes && inspectedToken.rawAttributes.length > 0
                    ? inspectedToken.rawAttributes.slice(0, 3).map(a => `${a.trait_type}: ${a.value}`).join(' • ')
                    : `Monad Chain 143 • Contract 0xc96d31...7363`}
                </div>
                <div className="text-xs text-[#8CE071]">
                  ★ Token ID #{inspectedToken.tokenId} On-Chain Proof
                </div>
              </div>
            </div>

            <div className="text-xs text-[#FFDF6D] font-bold pt-1">
              Token-Bound Badges & Unlocked Cosmetics (Moves on Sale):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {inspectedToken.badges.map(b => (
                <span key={b} className="px-2 py-0.5 rounded bg-[#14101C] border border-[#8CE071] text-[#8CE071] text-xs">
                  ★ {b}
                </span>
              ))}
            </div>
            <div className="text-xs text-[#B9B4C7] pt-0.5">
              Signature Flair: {TRAIT_MAPPING.hats[inspectedToken.traits.hat]?.flair || 'None'}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons: Add Friend, Chat, Challenge 1v1 */}
      {inspectedToken.tokenId !== activeTokenId && (
        <div className="grid grid-cols-3 gap-2">
          <button
            disabled={authMode === 'spectator'}
            onClick={() => onAddFriend(inspectedToken.tokenId)}
            className="py-2 min-h-[44px] rounded-lg bg-[#2C2140] text-[#8CE071] font-pixel-body text-base font-bold pixel-btn disabled:opacity-40 flex items-center justify-center gap-1"
          >
            {myToken.friends.includes(inspectedToken.tokenId) ? (
              <>
                <Check className="w-4 h-4" />
                <span>Friends</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Add Friend</span>
              </>
            )}
          </button>

          <button
            onClick={onSendDM}
            className="py-2 min-h-[44px] rounded-lg bg-[#2C2140] text-[#64E8D8] font-pixel-body text-base font-bold pixel-btn flex items-center justify-center gap-1"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send DM</span>
          </button>

          <button
            disabled={authMode === 'spectator'}
            onClick={() => onChallenge(inspectedToken.tokenId)}
            className="py-2 min-h-[44px] rounded-lg bg-[#FFDF6D] text-[#14101C] font-pixel-body text-base font-bold pixel-btn disabled:opacity-40 flex items-center justify-center gap-1"
          >
            <Swords className="w-4 h-4" />
            <span>Challenge</span>
          </button>
        </div>
      )}

      {/* Trait Chips */}
      <div className="grid grid-cols-3 gap-2 font-pixel-body text-sm">
        <div className="bg-[#1A1426] p-2 rounded-lg border border-[#14101C]">
          <span className="text-[#B9B4C7] text-xs block">MANE / OUTFIT</span>
          <strong className="text-[#F6EFE2] text-xs sm:text-sm truncate block">{inspectedToken.traits.body}</strong>
        </div>
        <div className="bg-[#1A1426] p-2 rounded-lg border border-[#14101C]">
          <span className="text-[#B9B4C7] text-xs block">HEADGEAR</span>
          <strong className="text-[#F6EFE2] text-xs sm:text-sm truncate block">{inspectedToken.traits.hat}</strong>
        </div>
        <div className="bg-[#1A1426] p-2 rounded-lg border border-[#14101C]">
          <span className="text-[#B9B4C7] text-xs block">EYES</span>
          <strong className="text-[#F6EFE2] text-xs sm:text-sm truncate block">{inspectedToken.traits.eyes}</strong>
        </div>
      </div>

      {/* Friends List with Portrait & "Walk to Friend" */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="font-pixel-title text-[11px] text-[#FFDF6D] uppercase">
            Token Friends ({myToken.friends.length})
          </h4>
          <span className="font-pixel-body text-xs text-[#B9B4C7]">Tap to walk over</span>
        </div>
        <div className="space-y-1.5 overflow-y-auto max-h-48 pr-1">
          {myToken.friends.map(fid => {
            const frec = tokenRecords[fid];
            if (!frec) return null;
            return (
              <div
                key={fid}
                className="bg-[#1A1426] border border-[#14101C] p-2 rounded-lg flex items-center justify-between font-pixel-body text-base"
              >
                <div className="flex items-center gap-2">
                  <ChogPixelPortrait traits={frec.traits} size={32} />
                  <div>
                    <strong className="text-[#F6EFE2] block leading-none">{frec.name}</strong>
                    <span className="text-xs text-[#8CE071]">● In Town</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onWalkTo(fid)}
                    className="px-2.5 py-1 rounded bg-[#2C2140] text-[#64E8D8] border border-[#64E8D8] text-xs pixel-btn"
                  >
                    Walk To
                  </button>
                  <button
                    onClick={() => onInspect(fid)}
                    className="px-2.5 py-1 rounded bg-[#241B35] text-[#F6EFE2] border border-[#78718A] text-xs pixel-btn"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
