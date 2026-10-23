import React, { useEffect, useRef } from 'react';
import { PALETTE_24 } from '../../constants/palette';
import { TRAIT_MAPPING } from '../../constants/traits';
import { drawPixelChogSprite } from '../../graphics/spriteRenderer';
import { ChogTraits, AutoPixelSpriteData } from '../../types/chog';

interface ChogPixelPortraitProps {
  traits: ChogTraits;
  size?: number;
  className?: string;
  showBadge?: number | string | null;
  pixelData?: AutoPixelSpriteData | null;
  portraitBase64?: string;
}

export const ChogPixelPortrait: React.FC<ChogPixelPortraitProps> = ({
  traits,
  size = 56,
  className = '',
  showBadge = null,
  pixelData = null,
  portraitBase64,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle periwinkle/plum framed backdrop based on dominant color or trait
    const bodyCfg = TRAIT_MAPPING.bodies[traits?.body] || TRAIT_MAPPING.bodies['Classic Purple'];
    const activeColor = pixelData?.dominantColors?.body || bodyCfg.primary || '#6C2BD9';
    ctx.fillStyle = PALETTE_24.duskPlum;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = activeColor + '33';
    ctx.fillRect(4, 4, 56, 56);

    drawPixelChogSprite(ctx, {
      x: 34,
      y: 58,
      traits,
      facing: 1,
      animFrame: 0,
      isMoving: false,
      scale: 1.05,
      pixelData,
    });
  }, [traits, pixelData]);

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-lg overflow-hidden border-2 border-[#14101C] shadow-[inset_0_2px_0_rgba(255,255,255,0.2)] shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: PALETTE_24.duskPlum }}
    >
      <canvas
        ref={canvasRef}
        width={64}
        height={64}
        className="w-full h-full block"
        style={{ imageRendering: 'pixelated' }}
      />
      {showBadge !== null && size >= 48 && (
        <span className="absolute bottom-0.5 right-0.5 px-1.5 py-0.5 bg-[#14101C]/90 text-[#FFDF6D] font-pixel-title text-[11px] rounded border border-[#FFDF6D]/50 leading-none">
          #{showBadge}
        </span>
      )}
    </div>
  );
};
