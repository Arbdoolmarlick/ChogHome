import { PALETTE_24 } from '../constants/palette';
import { TRAIT_MAPPING } from '../constants/traits';
import { ChogTraits, AutoPixelSpriteData } from '../types/chog';

export interface DrawChogOptions {
  x: number;
  y: number;
  traits: ChogTraits;
  facing?: number;
  animFrame?: number;
  isMoving?: boolean;
  isRunning?: boolean;
  pose?: 'idle' | 'sit' | 'wave' | 'dance' | 'laugh' | 'sleep';
  squash?: number;
  isBlinking?: boolean;
  isWaving?: boolean;
  isTurning?: boolean;
  hatFlyOffset?: number;
  scale?: number;
  pixelData?: AutoPixelSpriteData | null;
}

export function drawPixelChogSprite(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    traits,
    facing = 1,
    animFrame = 0,
    isMoving = false,
    isRunning = false,
    pose = 'idle',
    squash = 1,
    isBlinking = false,
    isWaving = false,
    isTurning = false,
    hatFlyOffset = 0,
    scale = 1,
    pixelData = null,
  }: DrawChogOptions
) {
  const bodyCfg = TRAIT_MAPPING.bodies[traits?.body] || TRAIT_MAPPING.bodies['Classic Purple'];
  const hatCfg = TRAIT_MAPPING.hats[traits?.hat] || TRAIT_MAPPING.hats['Crown'];
  const eyeCfg = TRAIT_MAPPING.eyes[traits?.eyes] || TRAIT_MAPPING.eyes['Sparkle'];

  // Harmonized colors from Auto-Pixel data or trait mapping
  const activeManeColor = pixelData?.dominantColors?.mane || bodyCfg.maneColor;
  const activeManeShadow = pixelData?.dominantColors?.maneShadow || bodyCfg.maneShadow;
  const activeBodyColor = pixelData?.dominantColors?.body || bodyCfg.primary;

  // 8-frame walk cycle math + pose-specific vertical & horizontal offsets
  const frame8 = Math.abs(Math.floor(animFrame)) % 8;
  const strideTable = [-5, -3, 0, 3, 5, 3, 0, -3];
  const bobTable = [1, 3, 4, 2, 1, 3, 4, 2];

  const isDancing = pose === 'dance';
  const isLaughing = pose === 'laugh';
  const isSitting = pose === 'sit';
  const isSleeping = pose === 'sleep';
  const activeWave = isWaving || pose === 'wave';

  const stride = isMoving
    ? strideTable[frame8] * (isRunning ? 1.25 : 0.9)
    : isDancing
    ? Math.sin(animFrame * 0.6) * 4
    : 0;

  const bodyBob = isMoving
    ? bobTable[frame8] * (isRunning ? 1.2 : 0.85)
    : isDancing
    ? Math.abs(Math.sin(animFrame * 0.55)) * 5
    : isLaughing
    ? Math.abs(Math.sin(animFrame * 0.9)) * 3.5
    : isSitting
    ? -3
    : Math.round(Math.sin(animFrame * 0.14) * 1.5);

  const secondaryBounce = isMoving
    ? bobTable[(frame8 + 6) % 8] * 0.55
    : isDancing
    ? Math.abs(Math.cos(animFrame * 0.55)) * 3
    : Math.max(0, Math.sin(animFrame * 0.14 - 0.6));

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);

  // 1. Dynamic Ground Contact Shadow
  const shadowWidth = Math.max(10, 17 - Math.max(0, bodyBob) * 0.7);
  ctx.fillStyle = 'rgba(20, 16, 28, 0.45)';
  ctx.fillRect(-shadowWidth, 1, shadowWidth * 2, 5);
  ctx.fillStyle = 'rgba(20, 16, 28, 0.25)';
  ctx.fillRect(-shadowWidth - 3, 2, (shadowWidth + 3) * 2, 3);

  // Apply vertical bounce, squash-and-stretch, and turn/dance compression
  const danceFlip = isDancing && Math.sin(animFrame * 0.28) < 0 ? -1 : 1;
  const turnScaleX = isTurning ? 0.65 : 1;
  ctx.translate(0, -Math.round(bodyBob));
  ctx.scale(facing * danceFlip * (2 - squash) * turnScaleX, squash);

  // 2. Feet / Shoes (8-frame alternating stride or seated tucked feet)
  const leftFootX = isSitting ? -11 : -9 + Math.round(stride);
  const rightFootX = isSitting ? 4 : 3 - Math.round(stride);
  const leftFootY = isSitting ? -2 : stride > 0 ? -5 : -3;
  const rightFootY = isSitting ? -2 : stride < 0 ? -5 : -3;

  ctx.fillStyle = PALETTE_24.inkBlack;
  ctx.fillRect(leftFootX - 1, leftFootY - 1, 8, 6);
  ctx.fillRect(rightFootX - 1, rightFootY - 1, 8, 6);
  ctx.fillStyle = activeManeColor;
  ctx.fillRect(leftFootX, leftFootY, 6, 4);
  ctx.fillRect(rightFootX, rightFootY, 6, 4);

  // 3. Torso / Outfit (authentic body tinted with dominant color or trait)
  ctx.fillStyle = PALETTE_24.inkBlack;
  ctx.fillRect(-13, -16, 26, 14);

  if (bodyCfg.outfit === 'breton_stripes') {
    for (let sy = -15; sy < -3; sy += 2) {
      ctx.fillStyle = ((sy + 15) / 2) % 2 === 0 ? PALETTE_24.creamLight : activeBodyColor;
      ctx.fillRect(-11, sy, 22, 2);
    }
  } else if (bodyCfg.outfit === 'tps_jersey') {
    ctx.fillStyle = activeBodyColor;
    ctx.fillRect(-11, -15, 22, 12);
    ctx.fillStyle = PALETTE_24.creamLight;
    ctx.fillRect(-5, -12, 2, 6);
    ctx.fillRect(-1, -12, 3, 6);
    ctx.fillRect(4, -12, 3, 6);
    // Green plushie tucked under left arm
    ctx.fillStyle = PALETTE_24.inkBlack;
    ctx.fillRect(-16, -15, 8, 8);
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(-15, -14, 6, 6);
    ctx.fillStyle = PALETTE_24.creamLight;
    ctx.fillRect(-14, -13, 2, 2);
  } else if (bodyCfg.outfit === 'red_tuxedo') {
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-11, -15, 22, 12);
    ctx.fillStyle = PALETTE_24.creamLight;
    ctx.fillRect(-4, -15, 8, 8);
    ctx.fillStyle = PALETTE_24.inkBlack;
    ctx.fillRect(-1, -14, 2, 2);
    ctx.fillRect(-2, -12, 4, 3);
  } else if (bodyCfg.outfit === 'sky_suit') {
    ctx.fillStyle = activeBodyColor;
    ctx.fillRect(-11, -15, 22, 12);
    ctx.fillStyle = PALETTE_24.creamLight;
    ctx.fillRect(-4, -15, 8, 7);
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(-1, -14, 3, 8);
  } else {
    // navy_suit or dominant color
    ctx.fillStyle = activeBodyColor;
    ctx.fillRect(-11, -15, 22, 12);
    ctx.fillStyle = '#FDE68A';
    ctx.fillRect(-4, -15, 8, 7);
    ctx.fillStyle = PALETTE_24.inkBlack;
    ctx.fillRect(-1, -14, 3, 8);
  }

  // Arms (supports wave, dance raised arms, or standard)
  ctx.fillStyle = PALETTE_24.inkBlack;
  if (isDancing) {
    const armSwing = Math.round(Math.sin(animFrame * 0.6) * 4);
    ctx.fillRect(-16, -18 + armSwing, 4, 9);
    ctx.fillRect(12, -18 - armSwing, 4, 9);
    ctx.fillStyle = activeManeColor;
    ctx.fillRect(-15, -17 + armSwing, 2, 7);
    ctx.fillRect(13, -17 - armSwing, 2, 7);
  } else if (activeWave) {
    ctx.fillRect(-15, -14, 4, 9);
    const waveY = -22 - Math.round(Math.sin(animFrame * 0.6) * 3);
    ctx.fillRect(11, waveY, 5, 9);
    ctx.fillStyle = activeManeColor;
    ctx.fillRect(12, waveY + 1, 3, 7);
    ctx.fillRect(-14, -13, 2, 7);
  } else {
    ctx.fillRect(-15, -14, 4, 9);
    ctx.fillRect(11, -14, 4, 9);
    ctx.fillStyle = activeManeColor;
    ctx.fillRect(-14, -13, 2, 7);
    ctx.fillRect(12, -13, 2, 7);
  }

  // 4. Characteristic 3-Spike Chog Side-Mane (with secondary bounce)
  // Rendered whenever not completely covered by auto-pixel head
  const maneY = -Math.round(secondaryBounce * 0.6);
  ctx.save();
  ctx.translate(0, maneY);
  ctx.fillStyle = PALETTE_24.inkBlack;
  ctx.fillRect(-22, -37, 10, 6);
  ctx.fillRect(-24, -29, 12, 6);
  ctx.fillRect(-21, -21, 9, 5);
  ctx.fillStyle = activeManeColor;
  ctx.fillRect(-20, -36, 8, 4);
  ctx.fillRect(-22, -28, 10, 4);
  ctx.fillRect(-19, -20, 7, 3);
  ctx.fillStyle = activeManeShadow;
  ctx.fillRect(-18, -34, 6, 2);
  ctx.fillRect(-20, -26, 8, 2);
  ctx.restore();

  // 5. Head / Face: AUTO-PIXEL HEAD (or Fallback Vector Head)
  if (pixelData?.headMatrix && pixelData.headMatrix.length > 0) {
    const hm = pixelData.headMatrix;
    const gridH = hm.length;
    const gridW = hm[0].length;
    const offX = -Math.round(gridW / 2);
    const offY = -14 - gridH; // Sits right on top of torso at y = -14

    for (let r = 0; r < gridH; r++) {
      for (let c = 0; c < gridW; c++) {
        const hex = hm[r][c];
        if (hex) {
          ctx.fillStyle = hex;
          ctx.fillRect(offX + c, offY + r, 1, 1);
        }
      }
    }

    // Expressive dynamic overrides on top of pixel head (blink, sleep, laugh)
    if (isSleeping || isBlinking) {
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-8, -26, 6, 2);
      ctx.fillRect(4, -26, 6, 2);
    } else if (isLaughing) {
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-4, -19, 8, 4);
      ctx.fillStyle = PALETTE_24.crimsonPop;
      ctx.fillRect(-3, -18, 6, 2);
    }
  } else {
    // FALLBACK 1 & 2: Standard Vector Pixel Head
    ctx.fillStyle = PALETTE_24.inkBlack;
    ctx.fillRect(-15, -36, 30, 22);
    ctx.fillRect(-13, -38, 26, 2);

    ctx.fillStyle = PALETTE_24.creamBase;
    ctx.fillRect(-13, -35, 26, 19);

    ctx.fillStyle = PALETTE_24.creamLight;
    ctx.fillRect(-12, -35, 18, 4);
    ctx.fillRect(-12, -31, 4, 10);

    ctx.fillStyle = PALETTE_24.creamShadow;
    ctx.fillRect(-11, -18, 24, 2);
    ctx.fillRect(10, -28, 3, 12);

    // 6. Signature Rosy Magenta Cheeks & Tiny Pink Triangle Nose
    ctx.fillStyle = PALETTE_24.blushRose;
    ctx.fillRect(-12, -23, 5, 4);
    ctx.fillRect(8, -23, 5, 4);
    ctx.fillRect(0, -23, 3, 2);
    ctx.fillStyle = PALETTE_24.creamShadow;
    ctx.fillRect(2, -22, 1, 2);

    // 7. Eyes & Mouth Expressions
    if (isSleeping || isBlinking) {
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-9, -27, 6, 2);
      ctx.fillRect(4, -27, 6, 2);
      ctx.fillRect(-2, -19, 5, 2);
    } else if (isLaughing) {
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-9, -29, 6, 2);
      ctx.fillRect(-7, -27, 4, 2);
      ctx.fillRect(4, -29, 6, 2);
      ctx.fillRect(4, -27, 4, 2);
      ctx.fillRect(-5, -21, 11, 5);
      ctx.fillStyle = PALETTE_24.crimsonPop;
      ctx.fillRect(-4, -20, 9, 3);
    } else if (eyeCfg.eyeType === 'heart_eyes') {
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-10, -31, 8, 7);
      ctx.fillRect(3, -31, 8, 7);
      ctx.fillStyle = PALETTE_24.crimsonPop;
      ctx.fillRect(-9, -30, 3, 2);
      ctx.fillRect(-5, -30, 3, 2);
      ctx.fillRect(-9, -28, 7, 3);
      ctx.fillRect(-7, -25, 3, 2);
      ctx.fillRect(4, -30, 3, 2);
      ctx.fillRect(8, -30, 3, 2);
      ctx.fillRect(4, -28, 7, 3);
      ctx.fillRect(6, -25, 3, 2);
      ctx.fillStyle = PALETTE_24.creamLight;
      ctx.fillRect(-8, -29, 2, 2);
      ctx.fillRect(5, -29, 2, 2);
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-3, -19, 7, 2);
      ctx.fillRect(3, -20, 2, 2);
    } else if (eyeCfg.eyeType === 'rainbow_visor') {
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-12, -32, 25, 9);
      ctx.fillStyle = '#38BDF8'; ctx.fillRect(-10, -30, 5, 6);
      ctx.fillStyle = '#FACC15'; ctx.fillRect(-5, -30, 6, 6);
      ctx.fillStyle = '#F97316'; ctx.fillRect(1, -30, 6, 6);
      ctx.fillStyle = '#22D3EE'; ctx.fillRect(7, -30, 4, 6);
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-1, -25, 4, 2);
      ctx.fillRect(-2, -20, 6, 4);
      ctx.fillStyle = '#EF4444'; ctx.fillRect(-1, -18, 2, 5);
      ctx.fillStyle = '#FACC15'; ctx.fillRect(1, -18, 2, 5);
      ctx.fillStyle = '#22C55E'; ctx.fillRect(3, -18, 2, 5);
    } else if (eyeCfg.eyeType === 'green_laser') {
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-9, -30, 6, 6);
      ctx.fillRect(4, -30, 6, 6);
      ctx.fillRect(-4, -19, 9, 2);
      ctx.fillRect(1, -17, 2, 2);
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(-7, -28, 24, 3);
      ctx.fillRect(6, -28, 20, 3);
      ctx.fillStyle = '#BBF7D0';
      ctx.fillRect(-6, -27, 22, 1);
      ctx.fillRect(7, -27, 18, 1);
    } else {
      // gold_grin
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-9, -29, 6, 2);
      ctx.fillRect(-10, -27, 2, 2);
      ctx.fillRect(-4, -27, 2, 2);
      ctx.fillRect(4, -29, 6, 2);
      ctx.fillRect(3, -27, 2, 2);
      ctx.fillRect(9, -27, 2, 2);
      ctx.fillRect(-7, -21, 15, 5);
      ctx.fillStyle = PALETTE_24.creamLight;
      ctx.fillRect(-6, -20, 13, 3);
      ctx.fillStyle = PALETTE_24.amberGlow;
      ctx.fillRect(2, -20, 3, 3);
    }
  }

  // 8. Authentic Headgear Layer (applied if not using pixel head or if trait overlay requested)
  if (!pixelData?.headMatrix) {
    ctx.save();
    ctx.translate(0, -Math.round(hatFlyOffset + secondaryBounce * 0.8));

    if (hatCfg.hatType === 'bucket') {
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-17, -38, 34, 5);
      ctx.fillRect(-14, -45, 28, 8);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(-13, -44, 26, 7);
      ctx.fillRect(-16, -37, 32, 3);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(-14, -39, 28, 1);
      ctx.fillRect(-15, -36, 30, 1);
    } else if (hatCfg.hatType === 'tps_cap') {
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-15, -45, 30, 10);
      ctx.fillRect(-14, -37, 32, 4);
      ctx.fillStyle = PALETTE_24.creamLight;
      ctx.fillRect(-13, -44, 26, 8);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-12, -36, 29, 3);
      ctx.fillStyle = PALETTE_24.maneViolet;
      ctx.fillRect(-7, -43, 14, 6);
      ctx.fillStyle = PALETTE_24.creamLight;
      ctx.fillRect(-5, -42, 2, 4);
      ctx.fillRect(-1, -42, 3, 4);
      ctx.fillRect(4, -42, 2, 4);
    } else if (hatCfg.hatType === 'ushanka') {
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-16, -45, 32, 11);
      ctx.fillRect(-17, -36, 6, 8);
      ctx.fillRect(11, -36, 6, 8);
      ctx.fillStyle = '#D6B892';
      ctx.fillRect(-14, -44, 28, 9);
      ctx.fillRect(-15, -35, 4, 6);
      ctx.fillRect(11, -35, 4, 6);
      ctx.fillStyle = '#B48E63';
      ctx.fillRect(-12, -38, 24, 2);
    } else {
      // star_wizard
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(-16, -37, 32, 4);
      ctx.fillRect(-13, -43, 26, 6);
      ctx.fillRect(-9, -49, 18, 6);
      ctx.fillRect(-5, -54, 10, 5);
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(-14, -36, 28, 3);
      ctx.fillRect(-11, -42, 22, 6);
      ctx.fillRect(-7, -48, 14, 6);
      ctx.fillRect(-3, -53, 6, 5);
      ctx.fillStyle = PALETTE_24.amberGlow;
      ctx.fillRect(-8, -40, 4, 3);
      ctx.fillRect(3, -44, 4, 3);
      ctx.fillRect(-2, -50, 3, 3);
    }
    ctx.restore();
  }

  ctx.restore();
}
