import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Eye, ChevronRight, MessageSquare, Gamepad2, ShoppingBag, ChevronDown } from 'lucide-react';
import { sfx } from '../../audio/pixelAudio';
import { PALETTE_24, MONAD_CONFIG } from '../../constants/palette';
import { INITIAL_TOKEN_RECORDS } from '../../constants/records';
import { MARKET_LISTINGS } from '../../constants/market';
import { drawPixelChogSprite } from '../../graphics/spriteRenderer';
import { ChogTraits, AutoPixelSpriteData } from '../../types/chog';
import { ChogPixelPortrait } from '../common/ChogPixelPortrait';

interface LandingPageProps {
  onEnterChogHome: () => void;
  onSpectateTown: () => void;
  activeTraits: ChogTraits;
  activePixelData?: AutoPixelSpriteData | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterChogHome,
  onSpectateTown,
  activeTraits,
  activePixelData,
  soundEnabled,
  onToggleSound,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [doorOpening, setDoorOpening] = useState(false);
  const [introSkipped, setIntroSkipped] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);

  const stateRef = useRef({
    introTick: 0,
    chogX: -30,
    targetX: 210,
    chogY: -28,
    vy: 2,
    vx: 0,
    facing: 1,
    turnTimer: 0,
    squash: 1,
    animTick: 0,
    waveTimer: 95,
    doorProgress: 0,
    irisRadius: 900,
    entering: false,
    cursorNormX: 0.5,
    dust: [] as { x: number; y: number; vx: number; vy: number; size: number; life: number }[],
    fireflies: Array.from({ length: 18 }, (_, i) => ({
      x: (i * 53) % 800,
      y: 120 + (i * 29) % 210,
      phase: i * 0.7,
      speed: 0.25 + (i % 3) * 0.12,
    })),
  });

  const triggerEnterHouse = useCallback(() => {
    if (stateRef.current.entering) return;
    stateRef.current.entering = true;
    stateRef.current.targetX = 636; // Exact CHOGHOME doorway center
    setDoorOpening(true);
    sfx.doorCreak();
    setTimeout(() => {
      sfx.win();
      onEnterChogHome();
    }, 1150);
  }, [onEnterChogHome]);

  // Keyboard support: Arrow keys walk, Space jumps, Enter enters ChogHome
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'd') {
        stateRef.current.targetX = Math.min(730, stateRef.current.chogX + 75);
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        stateRef.current.targetX = Math.max(55, stateRef.current.chogX - 75);
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        if (stateRef.current.chogY === 0) {
          stateRef.current.vy = -8.8;
          stateRef.current.squash = 0.78;
          sfx.jump();
        }
      } else if (e.key === 'Enter') {
        triggerEnterHouse();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [triggerEnterHouse]);

  // Main 60FPS Hero World Canvas
  useEffect(() => {
    let raf: number;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      const s = stateRef.current;
      s.animTick++;
      if (!introSkipped && s.introTick < 150) {
        s.introTick += prefersReducedMotion ? 15 : 1;
      } else {
        s.introTick = 150;
      }

      const introProgress = Math.min(1, s.introTick / 150);
      const houseLightsOn = introProgress > 0.38;

      const dx = s.targetX - s.chogX;
      const absDx = Math.abs(dx);
      const isMoving = absDx > 2.4;
      const isRunning = absDx > 110;

      if (isMoving) {
        const desiredFacing = dx >= 0 ? 1 : -1;
        if (desiredFacing !== s.facing) {
          s.facing = desiredFacing;
          s.turnTimer = 6;
        }
        const targetVx = Math.sign(dx) * Math.min(isRunning ? 5.4 : 3.2, absDx * 0.095);
        s.vx += (targetVx - s.vx) * 0.22;
        s.chogX += s.vx;

        if (s.animTick % (isRunning ? 5 : 8) === 0 && s.chogY === 0 && !prefersReducedMotion) {
          if (s.animTick % 16 === 0) sfx.step();
          s.dust.push({
            x: s.chogX - s.facing * 10,
            y: 342,
            vx: -s.facing * (0.5 + Math.random() * 0.9),
            vy: -0.5 - Math.random() * 0.6,
            size: isRunning ? 6 : 4,
            life: 20,
          });
        }
      } else {
        if (Math.abs(s.vx) > 0.8) {
          s.squash = 1.22;
        }
        s.vx *= 0.6;
      }

      if (s.turnTimer > 0) s.turnTimer--;
      if (s.waveTimer > 0) s.waveTimer--;
      s.squash += (1 - s.squash) * 0.2;

      if (s.chogY < 0 || s.vy !== 0) {
        s.chogY += s.vy;
        s.vy += 0.52;
        if (s.chogY >= 0) {
          s.chogY = 0;
          s.vy = 0;
          s.squash = 1.3;
        }
      }

      if (!s.entering && s.introTick >= 90 && Math.abs(s.chogX - 636) < 22) {
        triggerEnterHouse();
      }
      if (s.entering) {
        s.doorProgress = Math.min(1, s.doorProgress + 0.055);
        if (s.doorProgress > 0.35) {
          s.irisRadius = Math.max(0, s.irisRadius - (prefersReducedMotion ? 60 : 22));
        }
      }

      const pxOffset = prefersReducedMotion ? 0 : (s.cursorNormX - 0.5) * 40;

      // LAYER 0: SKY
      const sky = ctx.createLinearGradient(0, 0, 0, 350);
      sky.addColorStop(0, PALETTE_24.nightAbyss);
      sky.addColorStop(0.52, PALETTE_24.duskPlum);
      sky.addColorStop(1, introProgress > 0.25 ? PALETTE_24.periwinkle : '#3B2D54');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = `rgba(244, 162, 54, ${0.18 * introProgress})`;
      ctx.fillRect(0, 255, canvas.width, 95);

      for (let i = 0; i < 26; i++) {
        const sx = Math.round((i * 89 + (prefersReducedMotion ? 0 : s.animTick * 0.06)) % canvas.width);
        const sy = (i * 37) % 190;
        const twinkle = (s.animTick + i * 17) % 60 < 10;
        ctx.fillStyle = twinkle ? PALETTE_24.creamLight : i % 3 === 0 ? PALETTE_24.waterFoam : PALETTE_24.amberGlow;
        ctx.fillRect(sx, sy, i % 4 === 0 ? 4 : 2, i % 4 === 0 ? 4 : 2);
      }

      const clouds = [
        { x: (90 + (prefersReducedMotion ? 0 : s.animTick * 0.22) - pxOffset * 0.2 + 960) % 960 - 80, y: 58, w: 92 },
        { x: (390 + (prefersReducedMotion ? 0 : s.animTick * 0.15) - pxOffset * 0.2 + 960) % 960 - 80, y: 88, w: 116 },
        { x: (690 + (prefersReducedMotion ? 0 : s.animTick * 0.28) - pxOffset * 0.2 + 960) % 960 - 80, y: 46, w: 80 },
      ];
      clouds.forEach(c => {
        ctx.fillStyle = '#3E3159';
        ctx.fillRect(Math.round(c.x), c.y + 6, c.w, 14);
        ctx.fillStyle = PALETTE_24.periwinkle;
        ctx.fillRect(Math.round(c.x) + 8, c.y, c.w - 16, 14);
        ctx.fillStyle = PALETTE_24.creamBase;
        ctx.fillRect(Math.round(c.x) + 16, c.y - 4, c.w - 36, 6);
      });

      // LAYER 1: MOUNTAINS
      const farShift = Math.round(-pxOffset * 0.35);
      ctx.fillStyle = '#221933';
      [60, 240, 460, 680].forEach((mx, idx) => {
        const mh = idx % 2 === 0 ? 110 : 85;
        for (let step = 0; step < mh; step += 8) {
          const w = (mh - step) * 2.1;
          ctx.fillRect(mx + farShift - w / 2, 345 - mh + step, w, 8);
        }
      });

      // LAYER 2: HILLS & PINE FOREST
      const midShift = Math.round(-pxOffset * 0.65);
      ctx.fillStyle = PALETTE_24.grassShadow;
      ctx.fillRect(0, 305, canvas.width, 42);
      for (let hx = -40; hx < canvas.width + 60; hx += 80) {
        ctx.fillRect(hx + midShift, 293, 56, 14);
      }

      const sway = prefersReducedMotion ? 0 : Math.round(Math.sin(s.animTick * 0.045) * 2);
      [85, 205, 340, 465].forEach((tx, idx) => {
        const treeX = tx + midShift;
        ctx.fillStyle = PALETTE_24.inkBlack;
        ctx.fillRect(treeX - 7, 296, 14, 48);
        ctx.fillStyle = PALETTE_24.woodBase;
        ctx.fillRect(treeX - 5, 298, 9, 44);

        ctx.fillStyle = PALETTE_24.inkBlack;
        ctx.fillRect(treeX - 26 + sway, 256, 52, 42);
        ctx.fillRect(treeX - 18 + sway, 240, 36, 20);
        ctx.fillStyle = PALETTE_24.grassShadow;
        ctx.fillRect(treeX - 24 + sway, 258, 48, 38);
        ctx.fillStyle = idx % 2 === 0 ? PALETTE_24.grassBase : '#38A3A5';
        ctx.fillRect(treeX - 24 + sway, 258, 38, 30);
        ctx.fillRect(treeX - 16 + sway, 242, 32, 16);
        ctx.fillStyle = PALETTE_24.grassLight;
        ctx.fillRect(treeX - 22 + sway, 260, 18, 8);
        ctx.fillRect(treeX - 14 + sway, 244, 16, 6);
      });

      // LAYER 3: FENCE & CHOGHOME
      const nearShift = Math.round(-pxOffset * 0.9);
      for (let fx = 30; fx < 500; fx += 28) {
        const postX = fx + nearShift;
        ctx.fillStyle = PALETTE_24.inkBlack;
        ctx.fillRect(postX - 1, 318, 10, 28);
        ctx.fillStyle = PALETTE_24.woodBase;
        ctx.fillRect(postX, 320, 8, 25);
        ctx.fillStyle = PALETTE_24.creamBase;
        ctx.fillRect(postX, 320, 6, 4);
      }
      ctx.fillStyle = PALETTE_24.woodShadow;
      ctx.fillRect(25 + nearShift, 328, 475, 4);
      ctx.fillRect(25 + nearShift, 336, 475, 4);

      // COTTAGE
      const hx = 528;
      const hy = 168;
      const hw = 188;
      const hh = 176;

      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(hx + 134, hy - 44, 30, 48);
      ctx.fillStyle = PALETTE_24.brickTerracotta;
      ctx.fillRect(hx + 136, hy - 42, 26, 44);
      ctx.fillStyle = '#9E2A2B';
      ctx.fillRect(hx + 132, hy - 46, 34, 6);

      if (!prefersReducedMotion) {
        for (let p = 0; p < 4; p++) {
          const age = (s.animTick + p * 24) % 96;
          const puffY = hy - 54 - age * 0.65;
          const puffX = hx + 148 + Math.sin((s.animTick + p * 18) * 0.07) * 11;
          const alpha = Math.max(0, 0.65 - age / 140);
          ctx.fillStyle = `rgba(246, 239, 226, ${alpha})`;
          ctx.fillRect(Math.round(puffX - 8), Math.round(puffY - 8), 14 + p * 3, 12);
        }
      }

      for (let r = 0; r < 7; r++) {
        const rw = hw + 36 - r * 10;
        const rx = hx - 18 + r * 5;
        const ry = hy - 38 + r * 6;
        ctx.fillStyle = PALETTE_24.inkBlack;
        ctx.fillRect(rx - 2, ry - 2, rw + 4, 9);
        ctx.fillStyle = r % 2 === 0 ? PALETTE_24.brickTerracotta : '#9E2A2B';
        ctx.fillRect(rx, ry, rw, 6);
        ctx.fillStyle = r === 0 ? PALETTE_24.amberBase : '#7C1D1D';
        for (let sx = rx + 6; sx < rx + rw - 8; sx += 14) {
          ctx.fillRect(sx, ry + 4, 6, 2);
        }
      }

      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(hx - 3, hy, hw + 6, hh);
      ctx.fillStyle = '#382649';
      ctx.fillRect(hx, hy, hw, hh);

      ctx.fillStyle = '#2A1B38';
      for (let by = hy + 14; by < hy + hh - 8; by += 16) {
        ctx.fillRect(hx + 8, by, hw - 16, 2);
        for (let bx = hx + ((by / 16) % 2 === 0 ? 18 : 28); bx < hx + hw - 16; bx += 28) {
          ctx.fillRect(bx, by - 14, 2, 14);
        }
      }

      ctx.fillStyle = PALETTE_24.woodShadow;
      ctx.fillRect(hx, hy, 10, hh);
      ctx.fillRect(hx + hw - 10, hy, 10, hh);
      ctx.fillRect(hx, hy + 48, hw, 8);
      ctx.fillStyle = PALETTE_24.woodBase;
      ctx.fillRect(hx + 2, hy, 5, hh);
      ctx.fillRect(hx + hw - 8, hy, 5, hh);
      ctx.fillRect(hx, hy + 49, hw, 4);

      const signSwing = prefersReducedMotion ? 0 : Math.round(Math.sin(s.animTick * 0.06) * 2);
      const sx = hx + 22 + signSwing;
      const sy = hy + 12;
      ctx.fillStyle = PALETTE_24.stoneLight;
      ctx.fillRect(hx + 38, hy + 2, 3, 10);
      ctx.fillRect(hx + 146, hy + 2, 3, 10);
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(sx - 2, sy - 2, 148, 32);
      ctx.fillStyle = PALETTE_24.woodShadow;
      ctx.fillRect(sx, sy, 144, 28);
      ctx.fillStyle = PALETTE_24.woodBase;
      ctx.fillRect(sx + 3, sy + 3, 138, 22);
      ctx.fillStyle = PALETTE_24.amberGlow;
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CHOGHOME', sx + 72, sy + 20);

      const wx = hx + 20;
      const wy = hy + 68;
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(wx - 3, wy - 3, 54, 50);
      const windowFlicker = houseLightsOn
        ? Math.sin(s.animTick * 0.12) > -0.8
          ? PALETTE_24.amberGlow
          : PALETTE_24.amberBase
        : '#241B35';
      ctx.fillStyle = windowFlicker;
      ctx.fillRect(wx, wy, 48, 44);
      if (houseLightsOn) {
        ctx.fillStyle = PALETTE_24.creamLight;
        ctx.fillRect(wx + 4, wy + 4, 16, 14);
      }
      ctx.fillStyle = PALETTE_24.woodShadow;
      ctx.fillRect(wx + 22, wy, 4, 44);
      ctx.fillRect(wx, wy + 20, 48, 4);

      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(wx - 6, wy + 44, 60, 14);
      ctx.fillStyle = PALETTE_24.woodBase;
      ctx.fillRect(wx - 4, wy + 46, 56, 10);
      for (let f = 0; f < 5; f++) {
        ctx.fillStyle = PALETTE_24.grassBase;
        ctx.fillRect(wx + f * 10, wy + 40, 6, 6);
        ctx.fillStyle = f % 2 === 0 ? PALETTE_24.crimsonPop : PALETTE_24.amberGlow;
        ctx.fillRect(wx + 1 + f * 10, wy + 37, 4, 4);
      }

      const lx = hx + 90;
      const ly = hy + 68;
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(lx - 4, ly - 8, 10, 4);
      ctx.fillRect(lx - 5, ly - 4, 12, 14);
      ctx.fillStyle = houseLightsOn ? PALETTE_24.amberGlow : PALETTE_24.stoneBase;
      ctx.fillRect(lx - 3, ly - 2, 8, 10);
      if (houseLightsOn) {
        const halo = ctx.createRadialGradient(lx + 1, ly + 3, 2, lx + 1, ly + 3, 42);
        halo.addColorStop(0, 'rgba(255, 223, 109, 0.45)');
        halo.addColorStop(1, 'rgba(255, 223, 109, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(lx + 1, ly + 3, 42, 0, Math.PI * 2);
        ctx.fill();
      }

      const doorX = hx + 110;
      const doorY = hy + 68;
      const doorW = 54;
      const doorH = 108;

      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(doorX - 4, doorY - 4, doorW + 8, doorH + 4);

      ctx.fillStyle = PALETTE_24.amberGlow;
      ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.fillStyle = PALETTE_24.creamLight;
      ctx.fillRect(doorX + 8, doorY + 10, doorW - 16, doorH - 20);

      if (s.doorProgress > 0.02) {
        ctx.fillStyle = `rgba(255, 223, 109, ${0.42 * s.doorProgress})`;
        ctx.beginPath();
        ctx.moveTo(doorX, doorY + doorH);
        ctx.lineTo(doorX + doorW, doorY + doorH);
        ctx.lineTo(doorX + doorW + 28, doorY + doorH + 26);
        ctx.lineTo(doorX - 28, doorY + doorH + 26);
        ctx.closePath();
        ctx.fill();
      }

      const closedW = Math.max(6, Math.round(doorW * (1 - s.doorProgress)));
      ctx.fillStyle = PALETTE_24.woodBase;
      ctx.fillRect(doorX, doorY, closedW, doorH);
      ctx.fillStyle = PALETTE_24.woodShadow;
      if (closedW > 14) {
        ctx.fillRect(doorX + Math.floor(closedW * 0.33), doorY + 4, 2, doorH - 8);
        ctx.fillRect(doorX + Math.floor(closedW * 0.66), doorY + 4, 2, doorH - 8);
        ctx.fillStyle = PALETTE_24.amberGlow;
        ctx.fillRect(doorX + closedW - 11, doorY + 54, 6, 6);
      }

      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(doorX - 6, 342, doorW + 12, 9);
      ctx.fillStyle = PALETTE_24.brickTerracotta;
      ctx.fillRect(doorX - 4, 344, doorW + 8, 5);
      ctx.fillStyle = PALETTE_24.amberGlow;
      ctx.fillRect(doorX + 4, 345, doorW - 8, 3);

      // LAYER 4: FOREGROUND
      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(0, 342, canvas.width, 3);
      ctx.fillStyle = PALETTE_24.grassBase;
      ctx.fillRect(0, 345, canvas.width, 16);
      ctx.fillStyle = PALETTE_24.grassLight;
      for (let gx = 0; gx < canvas.width; gx += 18) {
        ctx.fillRect(gx, 345, 10, 4);
      }
      ctx.fillStyle = PALETTE_24.grassShadow;
      ctx.fillRect(0, 361, canvas.width, 40);

      [180, 255, 330, 405, 480, 555].forEach(stx => {
        ctx.fillStyle = PALETTE_24.inkBlack;
        ctx.fillRect(stx - 1, 347, 34, 9);
        ctx.fillStyle = PALETTE_24.stoneBase;
        ctx.fillRect(stx, 348, 32, 7);
        ctx.fillStyle = PALETTE_24.stoneLight;
        ctx.fillRect(stx + 2, 348, 20, 3);
      });

      for (let fx = 36; fx < 515; fx += 52) {
        ctx.fillStyle = PALETTE_24.grassLight;
        ctx.fillRect(fx + 2, 338, 2, 7);
        ctx.fillStyle = fx % 2 === 0 ? PALETTE_24.blushRose : PALETTE_24.amberGlow;
        ctx.fillRect(fx, 334, 6, 5);
        ctx.fillStyle = PALETTE_24.creamLight;
        ctx.fillRect(fx + 2, 335, 2, 2);
      }

      s.dust = s.dust.filter(d => d.life > 0);
      s.dust.forEach(d => {
        d.x += d.vx;
        d.y += d.vy;
        d.life--;
        ctx.fillStyle = `rgba(246, 239, 226, ${d.life / 22})`;
        ctx.fillRect(Math.round(d.x), Math.round(d.y), d.size, d.size);
      });

      // CHARACTER
      drawPixelChogSprite(ctx, {
        x: s.chogX,
        y: 344 + s.chogY,
        traits: activeTraits,
        pixelData: activePixelData,
        facing: s.facing,
        animFrame: s.animTick * (isRunning ? 0.32 : 0.22),
        isMoving,
        isRunning,
        isTurning: s.turnTimer > 0,
        isWaving: s.waveTimer > 0 && !isMoving,
        squash: s.squash,
        isBlinking: s.animTick % 140 < 6,
        scale: 1.35,
      });

      if (!prefersReducedMotion) {
        s.fireflies.forEach(f => {
          f.x = (f.x + f.speed) % canvas.width;
          const fy = f.y + Math.sin(s.animTick * 0.05 + f.phase) * 9;
          const pulse = (Math.sin(s.animTick * 0.1 + f.phase) + 1) * 0.5;
          ctx.fillStyle = `rgba(255, 223, 109, ${0.25 + pulse * 0.65})`;
          ctx.fillRect(Math.round(f.x), Math.round(fy), 3, 3);
        });
      }

      const nearDoor = Math.abs(s.chogX - 636) < 130;
      const promptBob = prefersReducedMotion ? 0 : Math.round(Math.sin(s.animTick * 0.1) * 4);
      const pillX = doorX + 27;
      const pillY = hy - 54 + promptBob;

      ctx.fillStyle = PALETTE_24.inkBlack;
      ctx.fillRect(pillX - 78, pillY - 16, 156, 24);
      ctx.fillStyle = nearDoor ? PALETTE_24.amberGlow : PALETTE_24.uiSurface;
      ctx.fillRect(pillX - 76, pillY - 14, 152, 20);
      ctx.fillStyle = nearDoor ? PALETTE_24.inkBlack : PALETTE_24.amberGlow;
      ctx.font = 'bold 10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▼ ENTER CHOGHOME', pillX, pillY);

      if (s.irisRadius < 880) {
        ctx.save();
        ctx.fillStyle = PALETTE_24.inkBlack;
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        const steppedR = Math.max(0, Math.floor(s.irisRadius / 8) * 8);
        ctx.arc(doorX + 27, doorY + 54, steppedR, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [activeTraits, activePixelData, introSkipped, triggerEnterHouse]);

  // Below-the-fold Live Preview Canvas
  useEffect(() => {
    let raf: number;
    let tick = 0;
    const renderPreview = () => {
      tick++;
      const c = previewCanvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = PALETTE_24.grassShadow;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = PALETTE_24.stoneBase;
      ctx.fillRect(0, 74, c.width, 28);

      const previewActors = [
        { traits: INITIAL_TOKEN_RECORDS[404].traits, x: 70 + Math.sin(tick * 0.025) * 35, facing: Math.cos(tick * 0.025) >= 0 ? 1 : -1, msg: 'GM from the Plaza!' },
        { traits: INITIAL_TOKEN_RECORDS[1337].traits, x: 195, facing: -1, msg: '1v1 Chog Four?' },
        { traits: INITIAL_TOKEN_RECORDS[88].traits, x: 300 + Math.cos(tick * 0.02) * 25, facing: -1, msg: null },
      ];

      previewActors.forEach((a, i) => {
        drawPixelChogSprite(ctx, {
          x: a.x,
          y: 88,
          traits: a.traits,
          facing: a.facing,
          animFrame: tick * 0.18 + i * 3,
          isMoving: i !== 1,
          scale: 0.9,
        });
        if (a.msg) {
          ctx.fillStyle = PALETTE_24.inkBlack;
          ctx.fillRect(a.x - 46, 20, 92, 18);
          ctx.fillStyle = PALETTE_24.creamLight;
          ctx.font = '12px VT323, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(a.msg, a.x, 33);
        }
      });

      raf = requestAnimationFrame(renderPreview);
    };
    raf = requestAnimationFrame(renderPreview);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || stateRef.current.entering) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    stateRef.current.targetX = Math.max(48, Math.min(745, x));
    stateRef.current.cursorNormX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (x >= 595 && x <= 715 && y >= 155 && y <= 355) {
      triggerEnterHouse();
      return;
    }

    stateRef.current.targetX = Math.max(48, Math.min(745, x));
    if (stateRef.current.chogY === 0) {
      stateRef.current.vy = -8.5;
      stateRef.current.squash = 0.78;
      sfx.jump();
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1426] text-[#F6EFE2] flex flex-col">
      {/* TOP LANDING BAR */}
      <nav className="max-w-5xl w-full mx-auto px-3 sm:px-4 pt-3 sm:pt-4 pb-2 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <ChogPixelPortrait traits={activeTraits} size={38} />
          <div>
            <span className="font-pixel-title text-xs sm:text-sm text-[#FFDF6D] tracking-wider block">
              CHOG TOWN
            </span>
            <span className="font-pixel-body text-xs sm:text-sm text-[#B9B4C7]">
              Monad • Official Holder World
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable 8-bit sound effects'}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 min-h-[40px] sm:min-h-[44px] rounded-lg bg-[#241B35] border-2 border-[#78718A] text-[#F6EFE2] font-pixel-body text-sm sm:text-base flex items-center gap-1.5 pixel-btn"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#64E8D8]" /> : <VolumeX className="w-4 h-4 text-[#B9B4C7]" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
          </button>

          <button
            onClick={onSpectateTown}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 min-h-[40px] sm:min-h-[44px] rounded-lg bg-[#241B35] border-2 border-[#7A88C9] text-[#F6EFE2] font-pixel-body text-sm sm:text-base pixel-btn flex items-center gap-1.5 whitespace-nowrap"
          >
            <Eye className="w-4 h-4 text-[#64E8D8] shrink-0" />
            <span>Watch<span className="hidden sm:inline"> the Town</span></span>
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="max-w-5xl w-full mx-auto px-3 sm:px-4 pt-1 sm:pt-2 pb-8 flex-1 flex flex-col items-center">
        <div className="text-center max-w-2xl mb-2.5 sm:mb-4 px-2">
          <h1 className="font-pixel-title text-base sm:text-2xl lg:text-3xl text-[#FFDF6D] tracking-wide drop-shadow-[0_2px_0_#14101C] sm:drop-shadow-[0_4px_0_#14101C] leading-snug">
            A PIXEL TOWN FOR CHOG HOLDERS.
          </h1>
          <p className="font-pixel-body text-base sm:text-xl text-[#F6EFE2] mt-0.5 sm:mt-1">
            Meet, chat, play. Every win, title, and friendship stays inside your Chog’s Token ID forever.
          </p>
        </div>

        {/* INTERACTIVE CANVAS STAGE */}
        <div className="pixel-box rounded-xl overflow-hidden w-full max-w-4xl relative">
          {!introSkipped && (
            <button
              onClick={() => setIntroSkipped(true)}
              className="absolute top-3 right-3 z-10 px-3 py-1.5 min-h-[32px] rounded bg-[#14101C]/85 border border-[#78718A] font-pixel-body text-xs text-[#B9B4C7] hover:text-white transition-colors"
            >
              Skip Intro
            </button>
          )}

          <canvas
            ref={canvasRef}
            width={800}
            height={385}
            onMouseMove={handlePointerMove}
            onTouchMove={handlePointerMove}
            onClick={handleCanvasClick}
            aria-label="Interactive Chog Town exterior. Move your cursor or tap to walk your Chog to the ChogHome cottage door on the right."
            className="w-full h-auto block cursor-pointer touch-none"
            style={{ imageRendering: 'pixelated' }}
          />

          <div className="bg-[#1A1426] border-t-3 border-[#14101C] px-3 py-2 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 font-pixel-body text-sm sm:text-base text-[#B9B4C7] w-full sm:w-auto">
              <span className="px-1.5 py-0.5 rounded bg-[#2C2140] border border-[#78718A] text-[#FFDF6D] text-xs shrink-0">
                TOUCH / KEYS
              </span>
              <span className="hidden sm:inline">Tap to walk • Tap to jump • Walk into cottage to enter.</span>
              <span className="sm:hidden text-xs">Tap to walk • Walk into door</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onSpectateTown}
                className="flex-1 sm:flex-initial px-3.5 py-2 min-h-[44px] rounded-lg bg-[#2C2140] text-[#F6EFE2] font-pixel-body text-base pixel-btn flex items-center justify-center gap-1.5"
              >
                <Eye className="w-4 h-4 text-[#64E8D8]" />
                <span>Watch</span>
              </button>

              <button
                onClick={triggerEnterHouse}
                disabled={doorOpening}
                className="flex-[1.5] sm:flex-initial px-3 sm:px-5 py-2 min-h-[44px] rounded-lg bg-[#FFDF6D] text-[#14101C] font-pixel-title text-xs pixel-btn flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span>{doorOpening ? 'OPENING...' : 'ENTER CHOGHOME'}</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* VERIFICATION STRIP */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mt-6">
          {[
            { label: 'VERIFIED CONTRACT', value: 'ERC-721 Monad', accent: '#64E8D8' },
            { label: 'ONLINE IN PLAZA',   value: '1 Holder + 6 AI', accent: '#8CE071' },
            { label: 'ARCADE CABINETS',   value: '3 1v1 + 3 Solo',  accent: '#FFDF6D' },
            { label: 'TOKEN MEMORY',      value: '100% On-Chain',   accent: '#FFA3C2' },
          ].map(stat => (
            <div key={stat.label} className="pixel-box rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col justify-between overflow-hidden">
              <span className="font-pixel-body text-xs uppercase tracking-wider text-[#B9B4C7] truncate">{stat.label}</span>
              <span className="font-pixel-title text-xs mt-1 truncate" style={{ color: stat.accent }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* THREE FEATURE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mt-8">
          <div className="pixel-box p-5 rounded-xl flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded bg-[#6C2BD9]/30 border border-[#7A88C9] font-pixel-title text-[11px] text-[#64E8D8]">
                  01 • SOCIAL HUB
                </span>
                <MessageSquare className="w-5 h-5 text-[#64E8D8]" />
              </div>
              <h3 className="font-pixel-title text-sm text-[#FFDF6D] mb-2">MEET & CHAT</h3>
              <p className="font-pixel-body text-lg text-[#F6EFE2] leading-snug">
                Stroll the Plaza as your trait-layered Chog. Pop proximity chat bubbles, wave at neighbors, and hang out with 6 AI Residents who keep the town lively 24/7.
              </p>
            </div>
            <div className="bg-[#1A1426] border-2 border-[#14101C] rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2.5">
                <ChogPixelPortrait traits={INITIAL_TOKEN_RECORDS[404].traits} size={36} />
                <div className="bg-[#2C2140] border border-[#64E8D8] rounded px-2.5 py-1 font-pixel-body text-sm text-[#F6EFE2]">
                  “Meet me at Chog Cafe before the next 1v1!”
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <div className="bg-[#2C2140] border border-[#FFDF6D] rounded px-2.5 py-1 font-pixel-body text-sm text-[#FFDF6D]">
                  “On my way! Putting my 14-win streak on the line.”
                </div>
                <ChogPixelPortrait traits={INITIAL_TOKEN_RECORDS[1337].traits} size={36} />
              </div>
            </div>
          </div>

          <div className="pixel-box p-5 rounded-xl flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded bg-[#F4A236]/20 border border-[#FFDF6D] font-pixel-title text-[11px] text-[#FFDF6D]">
                  02 • PIXEL ARCADE
                </span>
                <Gamepad2 className="w-5 h-5 text-[#FFDF6D]" />
              </div>
              <h3 className="font-pixel-title text-sm text-[#FFDF6D] mb-2">PLAY 1v1 & SOLO</h3>
              <p className="font-pixel-body text-lg text-[#F6EFE2] leading-snug">
                Challenge holders to server-authoritative Chog Four, Chog Duel, or Chog Showdown, or chase all-time high scores in Block Stacker, Chog Snake, and Memory Match.
              </p>
            </div>
            <div className="bg-[#1A1426] border-2 border-[#14101C] rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChogPixelPortrait traits={INITIAL_TOKEN_RECORDS[404].traits} size={38} />
                <span className="font-pixel-title text-xs text-[#FFDF6D]">VS</span>
                <ChogPixelPortrait traits={INITIAL_TOKEN_RECORDS[88].traits} size={38} />
              </div>
              <div className="text-right font-pixel-body">
                <div className="text-xs text-[#64E8D8] uppercase">1v1 Winner Reward</div>
                <div className="text-base font-bold text-[#8CE071]">+20 Token Points</div>
              </div>
            </div>
          </div>

          <div className="pixel-box p-5 rounded-xl flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded bg-[#E0467E]/25 border border-[#FF6B9D] font-pixel-title text-[11px] text-[#FFA3C2]">
                  03 • TOKEN MEMORY
                </span>
                <ShoppingBag className="w-5 h-5 text-[#FFA3C2]" />
              </div>
              <h3 className="font-pixel-title text-sm text-[#FFDF6D] mb-2">CHOG MARKET</h3>
              <p className="font-pixel-body text-lg text-[#F6EFE2] leading-snug">
                Browse Chogs listed on Monad marketplaces and inspect their battle record. When a Chog changes hands, every title, badge, and win travels with the token.
              </p>
            </div>
            <div className="bg-[#1A1426] border-2 border-[#14101C] rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ChogPixelPortrait traits={MARKET_LISTINGS[0].traits} size={40} />
                <div className="font-pixel-body leading-tight">
                  <div className="text-base font-bold text-[#F6EFE2]">Chog #101 “Nebula”</div>
                  <div className="text-xs text-[#64E8D8]">Arcade Champion • 52W</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#2C2140] border border-[#FFDF6D] font-pixel-body text-sm font-bold text-[#FFDF6D]">
                38.5 MON
              </span>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS + LIVE PLAZA CAM */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 mt-8">
          <div className="lg:col-span-7 pixel-box rounded-xl p-5 flex flex-col justify-between">
            <div>
              <span className="font-pixel-body text-sm uppercase tracking-wider text-[#64E8D8]">
                ZERO-FRICTION ONBOARDING
              </span>
              <h3 className="font-pixel-title text-sm sm:text-base text-[#FFDF6D] mt-1 mb-4">
                HOW CHOG TOWN WORKS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { step: 'STEP 1', title: 'Connect or Demo', desc: 'Sign in with SIWE on Monad, or tap 30s Judge Demo Mode with zero wallet setup.' },
                  { step: 'STEP 2', title: 'Pick Your Chog', desc: 'Your NFT traits build your custom sprite, headgear flair, and personality inside the Plaza.' },
                  { step: 'STEP 3', title: 'Build Token Fame', desc: 'Win 1v1 games and earn titles stored on your tokenId. Sell the NFT, and the legend follows.' },
                ].map(item => (
                  <div key={item.step} className="bg-[#1A1426] border-2 border-[#14101C] rounded-lg p-3.5">
                    <div className="font-pixel-title text-[11px] text-[#64E8D8] mb-1">{item.step}</div>
                    <div className="font-pixel-body text-lg font-bold text-[#FFDF6D]">{item.title}</div>
                    <p className="font-pixel-body text-base text-[#B9B4C7] mt-1 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#78718A]/40 flex flex-wrap items-center justify-between gap-2 font-pixel-body text-base text-[#B9B4C7]">
              <span>No Chog yet? You can watch the entire town and read public chat in Spectator Mode.</span>
              <button onClick={onSpectateTown} className="text-[#64E8D8] underline hover:text-white">
                Open Spectator View →
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 pixel-box rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-pixel-title text-xs text-[#8CE071]">● LIVE PLAZA CAM</span>
                <span className="font-pixel-body text-sm text-[#B9B4C7]">6 AI Residents Active</span>
              </div>
              <p className="font-pixel-body text-base text-[#B9B4C7] mb-3">
                Even at 3 AM, AI Residents stroll between the Cafe, Arcade, and Market so the town never feels empty:
              </p>
            </div>
            <canvas
              ref={previewCanvasRef}
              width={380}
              height={110}
              className="w-full h-auto rounded-lg border-2 border-[#14101C] block"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>

        {/* FAQ */}
        <div className="w-full pixel-box rounded-xl p-5 mt-8">
          <h3 className="font-pixel-title text-xs sm:text-sm text-[#FFDF6D] mb-3">
            FREQUENTLY ASKED QUESTIONS
          </h3>
          <div className="space-y-2">
            {[
              {
                q: 'What happens to my wins and titles if I sell my Chog NFT?',
                a: 'Every win, loss, point, badge, and title is keyed to the ERC-721 tokenId, never your wallet address. When a buyer acquires your Chog, they inherit its entire town history. You can test this live in the Town Hall Transfer Demo.'
              },
              {
                q: 'How can hackathon judges test Chog Town in under 30 seconds?',
                a: 'Walk your Chog into the ChogHome door (or click Enter ChogHome) and tap "2. Demo Mode". You will immediately spawn in Central Plaza as Chog #404 Sir Barnaby with full access to chat, 1v1 games, solo cabinets, and the Transfer Demo.'
              },
              {
                q: 'Are 1v1 games fair, and do traits give pay-to-win advantages?',
                a: 'All 1v1 games (Chog Four, Chog Duel, Chog Showdown) are server-authoritative with strict turn timers. NFT traits provide charming cosmetic flourishes: like your Striped Bucket Hat or Wizard Cone flying off on a loss, with zero pay-to-win buffs.'
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-[#1A1426] border-2 border-[#14101C] rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? -1 : idx)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between font-pixel-body text-lg font-bold text-[#F6EFE2] hover:bg-[#241B35] focus:outline-none focus:ring-2 focus:ring-[#FFDF6D] focus:bg-[#241B35] rounded transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#FFDF6D] transition-transform ${openFaqIndex === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-4 pb-3 font-pixel-body text-base text-[#B9B4C7] border-t border-[#2C2140] pt-2">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <footer className="w-full mt-8 pt-4 border-t border-[#2C2140] flex flex-wrap items-center justify-between gap-3 font-pixel-body text-base text-[#B9B4C7]">
          <div>
            <strong className="text-[#FFDF6D]">CHOG TOWN</strong> • Built for the Monad Chogathon • Chain ID {MONAD_CONFIG.chainId}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={triggerEnterHouse} className="text-[#64E8D8] hover:underline">Enter ChogHome</button>
            <button onClick={onSpectateTown} className="text-[#FFDF6D] hover:underline">Spectator Mode</button>
          </div>
        </footer>
      </div>
    </div>
  );
};
