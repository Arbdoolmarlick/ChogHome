import { PALETTE_24 } from '../constants/palette';
import { TownZone } from '../types/chog';

export function drawDistinctZoneBuilding(
  ctx: CanvasRenderingContext2D,
  z: TownZone,
  tick: number,
  isNight: boolean,
  lightsOn: boolean
) {
  const bx = z.x - z.w / 2;
  const by = z.y - z.h / 2;

  // 1. Shadow Foundation
  ctx.fillStyle = 'rgba(20, 16, 28, 0.55)';
  ctx.fillRect(bx - 4, by + z.h - 4, z.w + 8, 10);

  // 2. Base Structural Masonry
  ctx.fillStyle = PALETTE_24.inkBlack;
  ctx.fillRect(bx - 3, by - 3, z.w + 6, z.h + 6);
  ctx.fillStyle = z.id === 'townhall' ? '#3B334A' : PALETTE_24.uiSurface;
  ctx.fillRect(bx, by, z.w, z.h);

  // 3. Zone-Specific Architectural Facade & Rooftop Emblems
  if (z.id === 'cafe') {
    // Parisian rose-and-cream striped awning
    for (let ax = bx - 2; ax < bx + z.w + 2; ax += 14) {
      ctx.fillStyle = ((ax - bx) / 14) % 2 === 0 ? PALETTE_24.blushRose : PALETTE_24.creamLight;
      ctx.fillRect(ax, by + 18, 14, 12);
    }
    // Rooftop giant espresso mug with rising steam curls
    ctx.fillStyle = PALETTE_24.creamLight;
    ctx.fillRect(z.x - 14, by - 22, 28, 18);
    ctx.fillRect(z.x + 14, by - 18, 6, 10);
    ctx.fillStyle = PALETTE_24.woodShadow;
    ctx.fillRect(z.x - 12, by - 20, 24, 4);
    // Rising animated pixel steam
    const steamY = (tick % 40) * 0.45;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(z.x - 6, by - 26 - steamY, 3, 5);
    ctx.fillRect(z.x + 4, by - 28 - steamY, 3, 6);
  } else if (z.id === 'arcade') {
    // Pulsing Neon Marquee Sign
    const pulse = Math.sin(tick * 0.12) > 0;
    ctx.fillStyle = PALETTE_24.inkBlack;
    ctx.fillRect(bx + 6, by - 14, z.w - 12, 14);
    ctx.fillStyle = pulse ? '#64E8D8' : '#FFDF6D';
    ctx.fillRect(bx + 8, by - 12, z.w - 16, 10);
    ctx.fillStyle = PALETTE_24.inkBlack;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PIXEL ARCADE', z.x, by - 4);
    // Visible glowing arcade cabinets in windows
    ctx.fillStyle = '#6C2BD9';
    ctx.fillRect(bx + 14, by + 28, 16, 26);
    ctx.fillRect(bx + 34, by + 28, 16, 26);
    ctx.fillStyle = pulse ? '#FFDF6D' : '#64E8D8';
    ctx.fillRect(bx + 17, by + 32, 10, 8);
    ctx.fillRect(bx + 37, by + 32, 10, 8);
  } else if (z.id === 'market') {
    // Amber and violet striped market stalls
    for (let mx = bx - 2; mx < bx + z.w + 2; mx += 16) {
      ctx.fillStyle = ((mx - bx) / 16) % 2 === 0 ? PALETTE_24.amberBase : PALETTE_24.maneViolet;
      ctx.fillRect(mx, by + 14, 16, 12);
    }
    // Wooden display crates with gold coins & potions
    ctx.fillStyle = PALETTE_24.woodBase;
    ctx.fillRect(bx + 12, by + 36, 22, 14);
    ctx.fillRect(bx + z.w - 34, by + 36, 22, 14);
    ctx.fillStyle = PALETTE_24.amberGlow;
    ctx.fillRect(bx + 16, by + 33, 5, 5);
    ctx.fillRect(bx + 24, by + 34, 6, 4);
  } else if (z.id === 'park') {
    // Genesis Park Gazebo with mossy timber roof shingles
    ctx.fillStyle = PALETTE_24.grassShadow;
    ctx.fillRect(bx - 6, by - 16, z.w + 12, 16);
    ctx.fillStyle = PALETTE_24.grassBase;
    ctx.fillRect(bx - 4, by - 14, z.w + 8, 12);
    // Hanging ivy vines
    ctx.fillStyle = PALETTE_24.grassLight;
    ctx.fillRect(bx + 8, by - 2, 4, 12);
    ctx.fillRect(bx + 26, by - 2, 3, 8);
    ctx.fillRect(bx + z.w - 18, by - 2, 4, 14);
  } else if (z.id === 'townhall') {
    // Neo-classical stone pillars & pediment clock tower
    ctx.fillStyle = PALETTE_24.stoneLight;
    ctx.fillRect(bx + 10, by + 16, 8, z.h - 18);
    ctx.fillRect(bx + 34, by + 16, 8, z.h - 18);
    ctx.fillRect(bx + z.w - 42, by + 16, 8, z.h - 18);
    ctx.fillRect(bx + z.w - 18, by + 16, 8, z.h - 18);
    // Clock Tower Pediment
    ctx.fillStyle = PALETTE_24.stoneBase;
    ctx.fillRect(z.x - 22, by - 28, 44, 28);
    ctx.fillStyle = PALETTE_24.amberGlow;
    ctx.beginPath();
    ctx.arc(z.x, by - 14, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE_24.inkBlack;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Clock Hands (Tick with real time)
    const handAngle = (tick * 0.05) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(z.x, by - 14);
    ctx.lineTo(z.x + Math.cos(handAngle) * 5, by - 14 + Math.sin(handAngle) * 5);
    ctx.stroke();
  } else if (z.id === 'plaza') {
    // 2-tier animated pixel fountain
    ctx.fillStyle = PALETTE_24.stoneBase;
    ctx.fillRect(z.x - 32, z.y - 10, 64, 26);
    ctx.fillStyle = PALETTE_24.waterDeep;
    ctx.fillRect(z.x - 28, z.y - 6, 56, 18);
    ctx.fillStyle = PALETTE_24.waterBase;
    ctx.fillRect(z.x - 24, z.y - 4, 48, 14);
    // Fountain Spout & Splashing Water Jets
    const jetH = Math.abs(Math.sin(tick * 0.18)) * 14;
    ctx.fillStyle = PALETTE_24.waterFoam;
    ctx.fillRect(z.x - 2, z.y - 12 - jetH, 4, 10 + jetH);
    ctx.fillRect(z.x - 8 - jetH * 0.4, z.y - 6, 4, 3);
    ctx.fillRect(z.x + 4 + jetH * 0.4, z.y - 6, 4, 3);
  }

  // 4. Windows with Warm Lighting when dark
  if (z.id !== 'plaza') {
    const winY = by + 28;
    const winColor = lightsOn ? PALETTE_24.amberGlow : '#3D344E';
    ctx.fillStyle = PALETTE_24.inkBlack;
    ctx.fillRect(bx + 14, winY, 18, 16);
    ctx.fillRect(bx + z.w - 32, winY, 18, 16);
    ctx.fillStyle = winColor;
    ctx.fillRect(bx + 16, winY + 2, 14, 12);
    ctx.fillRect(bx + z.w - 30, winY + 2, 14, 12);
    // Window mullions
    ctx.fillStyle = PALETTE_24.inkBlack;
    ctx.fillRect(bx + 22, winY + 2, 2, 12);
    ctx.fillRect(bx + 16, winY + 7, 14, 2);
    ctx.fillRect(bx + z.w - 24, winY + 2, 2, 12);
    ctx.fillRect(bx + z.w - 30, winY + 7, 14, 2);
  }

  // 5. Doorways with Warm Light Spill
  const dw = 20;
  const dh = 24;
  const dx = z.doorX - dw / 2;
  const dy = z.doorY - dh + 8;
  ctx.fillStyle = PALETTE_24.inkBlack;
  ctx.fillRect(dx - 1, dy - 1, dw + 2, dh + 2);
  ctx.fillStyle = lightsOn ? PALETTE_24.amberBase : PALETTE_24.woodShadow;
  ctx.fillRect(dx, dy, dw, dh);
  ctx.fillStyle = PALETTE_24.woodBase;
  ctx.fillRect(dx + 2, dy + 2, dw - 4, dh - 4);
  // Brass doorknob
  ctx.fillStyle = PALETTE_24.amberGlow;
  ctx.fillRect(dx + dw - 5, dy + dh / 2, 2, 2);

  // 6. Zone Signboard Banner
  const signY = by + z.h - 18;
  ctx.fillStyle = PALETTE_24.inkBlack;
  ctx.fillRect(bx + 6, signY, z.w - 12, 18);
  ctx.fillStyle = PALETTE_24.duskPlum;
  ctx.fillRect(bx + 8, signY + 2, z.w - 16, 14);
  ctx.fillStyle = PALETTE_24.creamLight;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${z.icon} ${z.name.toUpperCase()}`, z.x, signY + 13);
}
