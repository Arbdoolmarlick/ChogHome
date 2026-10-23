// scripts/test_pixel_converter.mjs
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { init, default as decode } from '@jsquash/webp/decode.js';

const PALETTE_24 = [
  '#0B0813', '#14101C', '#241734', '#3B2456', '#59397E', '#836EF9',
  '#A78BFA', '#C4B5FD', '#1E3A8A', '#2563EB', '#67E8F9', '#15803D',
  '#4ADE80', '#FAF5EA', '#FFFDF7', '#E5D9C5', '#78350F', '#451A03',
  '#64748B', '#CBD5E1', '#F59E0B', '#EF4444', '#F472B6', '#1F162B'
];

function hexToRgb(hex) {
  const num = parseInt(hex.replace('#', ''), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

const PALETTE_RGB = PALETTE_24.map(hexToRgb);

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  // Perceptual color distance
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

function findNearestPaletteColor(r, g, b, extraPalette = []) {
  let bestDist = Infinity;
  let bestRgb = [r, g, b];
  let bestHex = '#000000';

  // Check 24-color palette
  for (let i = 0; i < PALETTE_RGB.length; i++) {
    const p = PALETTE_RGB[i];
    const d = colorDist(r, g, b, p[0], p[1], p[2]);
    if (d < bestDist) {
      bestDist = d;
      bestRgb = p;
      bestHex = PALETTE_24[i];
    }
  }

  // Check up to 8 extra sampled colors
  for (let i = 0; i < extraPalette.length; i++) {
    const p = extraPalette[i];
    const d = colorDist(r, g, b, p[0], p[1], p[2]);
    if (d < bestDist) {
      bestDist = d;
      bestRgb = p;
      bestHex = rgbToHex(p[0], p[1], p[2]);
    }
  }

  return { rgb: bestRgb, hex: bestHex, dist: bestDist };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

async function run() {
  const wasmBuf = fs.readFileSync('node_modules/@jsquash/webp/codec/dec/webp_dec.wasm');
  await init(new WebAssembly.Module(wasmBuf));

  // Load sample image
  const res = await fetch('http://localhost:5173/api/image-proxy?url=' + encodeURIComponent('https://magic.decentralized-content.com/ipfs/bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/1462.webp'));
  const buf = await res.arrayBuffer();
  const { width, height, data } = await decode(buf);

  // 1. Detect background color from 4 corners
  const corners = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]
  ];
  let bgR = 0, bgG = 0, bgB = 0;
  for (const [cx, cy] of corners) {
    const idx = (cy * width + cx) * 4;
    bgR += data[idx];
    bgG += data[idx+1];
    bgB += data[idx+2];
  }
  bgR = Math.round(bgR / 4);
  bgG = Math.round(bgG / 4);
  bgB = Math.round(bgB / 4);

  function isBgPixel(r, g, b, a) {
    if (a < 50) return true;
    return colorDist(r, g, b, bgR, bgG, bgB) < 38;
  }

  // 2. Crop Chog head region
  // In NFT portrait, head is roughly the upper 62% of the character
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x) * 4;
      if (!isBgPixel(data[idx], data[idx+1], data[idx+2], data[idx+3])) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const charW = maxX - minX;
  const charH = maxY - minY;
  // Head crop: top 65% of the Chog height, full width of Chog
  const headCrop = {
    x: Math.max(0, minX - 10),
    y: Math.max(0, minY),
    w: Math.min(width - minX, charW + 20),
    h: Math.min(height - minY, Math.round(charH * 0.65))
  };

  console.log('Head crop bounds:', headCrop);

  // 3. Downscale head to 30x24 sprite density
  const gridW = 30;
  const gridH = 24;
  const rawGrid = [];

  const blockW = headCrop.w / gridW;
  const blockH = headCrop.h / gridH;

  // Collect color histogram for extra accent colors
  const nonBgColors = [];

  for (let gy = 0; gy < gridH; gy++) {
    rawGrid[gy] = [];
    for (let gx = 0; gx < gridW; gx++) {
      let rSum = 0, gSum = 0, bSum = 0, validCount = 0, totalCount = 0;
      const startY = Math.floor(headCrop.y + gy * blockH);
      const endY = Math.min(height, Math.floor(headCrop.y + (gy + 1) * blockH));
      const startX = Math.floor(headCrop.x + gx * blockW);
      const endX = Math.min(width, Math.floor(headCrop.x + (gx + 1) * blockW));

      for (let sy = startY; sy < endY; sy += 2) {
        for (let sx = startX; sx < endX; sx += 2) {
          totalCount++;
          const idx = (sy * width + sx) * 4;
          const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
          if (!isBgPixel(r, g, b, a)) {
            rSum += r;
            gSum += g;
            bSum += b;
            validCount++;
          }
        }
      }

      // If at least 35% non-background, it is a solid pixel
      if (validCount / (totalCount || 1) >= 0.35) {
        const avgR = Math.round(rSum / validCount);
        const avgG = Math.round(gSum / validCount);
        const avgB = Math.round(bSum / validCount);
        rawGrid[gy][gx] = { r: avgR, g: avgG, b: avgB, a: 255 };
        nonBgColors.push([avgR, avgG, avgB]);
      } else {
        rawGrid[gy][gx] = null;
      }
    }
  }

  // 4. Extract up to 8 distinct extra accent colors
  const extraPalette = [];
  for (const c of nonBgColors) {
    if (extraPalette.length >= 8) break;
    // Check if distinct from 24-palette (dist > 45) and distinct from existing extra colors (dist > 40)
    let distTo24 = Infinity;
    for (const p of PALETTE_RGB) {
      distTo24 = Math.min(distTo24, colorDist(c[0], c[1], c[2], p[0], p[1], p[2]));
    }
    if (distTo24 > 45) {
      let distToExtra = Infinity;
      for (const e of extraPalette) {
        distToExtra = Math.min(distToExtra, colorDist(c[0], c[1], c[2], e[0], e[1], e[2]));
      }
      if (distToExtra > 40) {
        extraPalette.push(c);
      }
    }
  }
  console.log('Sampled extra accent colors:', extraPalette.map(c => rgbToHex(c[0], c[1], c[2])));

  // 5. Quantize grid
  const quantizedGrid = [];
  for (let gy = 0; gy < gridH; gy++) {
    quantizedGrid[gy] = [];
    for (let gx = 0; gx < gridW; gx++) {
      const p = rawGrid[gy][gx];
      if (p) {
        const match = findNearestPaletteColor(p.r, p.g, p.b, extraPalette);
        quantizedGrid[gy][gx] = { r: match.rgb[0], g: match.rgb[1], b: match.rgb[2], a: 255, hex: match.hex };
      } else {
        quantizedGrid[gy][gx] = null;
      }
    }
  }

  // 6. Cleanup: Remove stray single pixels & fill single-pixel gaps
  for (let gy = 1; gy < gridH - 1; gy++) {
    for (let gx = 1; gx < gridW - 1; gx++) {
      const p = quantizedGrid[gy][gx];
      const neighbors = [
        quantizedGrid[gy-1][gx],
        quantizedGrid[gy+1][gx],
        quantizedGrid[gy][gx-1],
        quantizedGrid[gy][gx+1],
      ].filter(Boolean).length;

      if (p && neighbors === 0) {
        quantizedGrid[gy][gx] = null; // remove isolated stray
      } else if (!p && neighbors >= 3) {
        // fill single-pixel gap with dominant neighbor
        const neighborColors = [
          quantizedGrid[gy-1][gx],
          quantizedGrid[gy+1][gx],
          quantizedGrid[gy][gx-1],
          quantizedGrid[gy][gx+1],
        ].filter(Boolean);
        quantizedGrid[gy][gx] = { ...neighborColors[0] };
      }
    }
  }

  // 7. Add 1px Dark Outline (#14101C) around perimeter
  const finalGrid = JSON.parse(JSON.stringify(quantizedGrid));
  const INK_BLACK = { r: 20, g: 16, b: 28, a: 255, hex: '#14101C' };

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      if (quantizedGrid[gy][gx]) {
        // Check if edge
        const isEdge = 
          gy === 0 || gy === gridH - 1 || gx === 0 || gx === gridW - 1 ||
          !quantizedGrid[gy-1][gx] || !quantizedGrid[gy+1][gx] ||
          !quantizedGrid[gy][gx-1] || !quantizedGrid[gy][gx+1];
        
        if (isEdge) {
          finalGrid[gy][gx] = { ...INK_BLACK };
        }
      }
    }
  }

  // 8. Render output test PNG (4x scaled for crisp pixel viewing: 120x96)
  const scale = 4;
  const outPng = new PNG({ width: gridW * scale, height: gridH * scale });
  
  // Fill background with dusk plum transparency
  for (let i = 0; i < outPng.data.length; i += 4) {
    outPng.data[i] = 36;
    outPng.data[i+1] = 23;
    outPng.data[i+2] = 52;
    outPng.data[i+3] = 0; // transparent
  }

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const p = finalGrid[gy][gx];
      if (!p) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = gx * scale + dx;
          const py = gy * scale + dy;
          const idx = (py * (gridW * scale) + px) * 4;
          outPng.data[idx] = p.r;
          outPng.data[idx+1] = p.g;
          outPng.data[idx+2] = p.b;
          outPng.data[idx+3] = 255;
        }
      }
    }
  }

  fs.writeFileSync('.cache/test_auto_pixel_head.png', PNG.sync.write(outPng));
  console.log('Saved .cache/test_auto_pixel_head.png successfully!');
}

run().catch(console.error);
