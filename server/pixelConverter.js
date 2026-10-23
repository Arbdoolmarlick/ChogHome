// server/pixelConverter.js
// Auto-Pixel Chog Conversion Engine for Monad Mainnet (Chain 143)
// Converts real NFT artwork into authentic 16-bit pixel sprites matching Chog Town density.

import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { init as initWebp, default as decodeWebp } from '@jsquash/webp/decode.js';
import { getChogMetadata } from './chogService.js';
import { recordUnmappedTrait } from './unmappedTraits.js';

// Pipeline versioning (incrementing this invalidates old cache and triggers re-generation)
export const PIPELINE_VERSION = 'v1.4';

const SPRITES_CACHE_DIR = path.resolve('.cache', 'sprites');
if (!fs.existsSync(SPRITES_CACHE_DIR)) {
  try { fs.mkdirSync(SPRITES_CACHE_DIR, { recursive: true }); } catch (e) {}
}

// Ensure WebP wasm is initialized
let wasmInitialized = false;
async function ensureWasm() {
  if (wasmInitialized) return;
  try {
    const wasmPath = path.resolve('node_modules', '@jsquash', 'webp', 'codec', 'dec', 'webp_dec.wasm');
    if (fs.existsSync(wasmPath)) {
      const wasmBuf = fs.readFileSync(wasmPath);
      await initWebp(new WebAssembly.Module(wasmBuf));
      wasmInitialized = true;
    }
  } catch (err) {
    console.warn('[PixelConverter] Wasm init warning:', err.message);
  }
}

// Town's official 24-color retro design palette
export const PALETTE_24 = [
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

export function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  // Perceptual color weighting
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

function findNearestPaletteColor(r, g, b, extraPalette = []) {
  let bestDist = Infinity;
  let bestRgb = [r, g, b];
  let bestHex = '#14101C';

  for (let i = 0; i < PALETTE_RGB.length; i++) {
    const p = PALETTE_RGB[i];
    const d = colorDist(r, g, b, p[0], p[1], p[2]);
    if (d < bestDist) {
      bestDist = d;
      bestRgb = p;
      bestHex = PALETTE_24[i];
    }
  }

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

/**
 * Pixelate NFT artwork into town head sprite matrix + dominant colors
 */
export async function convertChogToPixelSprite(tokenId, force = false) {
  await ensureWasm();

  const cacheFile = path.join(SPRITES_CACHE_DIR, `${tokenId}_${PIPELINE_VERSION}.json`);
  const portraitFile = path.join(SPRITES_CACHE_DIR, `${tokenId}_${PIPELINE_VERSION}_portrait.png`);

  // 1. Check cache (never return cached fallback when force=true)
  if (!force && fs.existsSync(cacheFile) && fs.existsSync(portraitFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cached && cached.status === 'ok') {
        return cached;
      }
    } catch (e) {}
  }

  // 2. Fetch metadata
  const metadata = await getChogMetadata(tokenId);
  if (!metadata) {
    return generateDefaultFallback(tokenId, 'Metadata unavailable');
  }

  // Record traits for unmapped traits tracking
  if (Array.isArray(metadata.attributes)) {
    for (const attr of metadata.attributes) {
      recordUnmappedTrait(attr.trait_type, attr.value);
    }
  }

  // 3. Fetch image buffer with parallel raced IPFS gateways and retries
  let imgBuf = null;
  const rawImage = metadata.image || '';
  const ipfsHash = rawImage.replace('ipfs://', '');
  const fallbackIdx = (tokenId + 1460) % 1969 + 1;

  const candidateUrls = [
    rawImage.startsWith('http') ? rawImage : null,
    ipfsHash ? `https://magic.decentralized-content.com/ipfs/${ipfsHash}` : null,
    ipfsHash ? `https://ipfs.filebase.io/ipfs/${ipfsHash}` : null,
    `https://magic.decentralized-content.com/ipfs/bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/${fallbackIdx}.webp`,
    `https://ipfs.filebase.io/ipfs/bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/${fallbackIdx}.webp`,
    ipfsHash ? `https://dweb.link/ipfs/${ipfsHash}` : null,
    ipfsHash ? `https://cloudflare-ipfs.com/ipfs/${ipfsHash}` : null,
    ipfsHash ? `https://ipfs.io/ipfs/${ipfsHash}` : null,
  ].filter(Boolean);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const fetchCandidate = async (url) => {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (!buf || buf.byteLength < 500) throw new Error('Empty payload');
        return buf;
      };

      imgBuf = await Promise.any(candidateUrls.map(fetchCandidate));
      clearTimeout(timeoutId);
      controller.abort();
      if (imgBuf && imgBuf.byteLength > 500) break;
    } catch (raceErr) {
      if (attempt === 3) {
        console.warn(`[PixelConverter] Gateway race failed after 3 attempts for token #${tokenId}: ${raceErr.message}`);
      } else {
        await new Promise(r => setTimeout(r, 600 * attempt));
      }
    }
  }

  if (!imgBuf) {
    console.warn(`[PixelConverter] Could not fetch image for token #${tokenId}, using fallback.`);
    return generateDefaultFallback(tokenId, 'Image fetch timeout');
  }

  try {
    // 4. Decode WebP / PNG
    let width = 0, height = 0, data = null;

    // Check if buffer is WebP (starts with RIFF...WEBP)
    const headerStr = Buffer.from(imgBuf.slice(0, 16)).toString('ascii');
    if (headerStr.includes('WEBP')) {
      const decoded = await decodeWebp(imgBuf);
      width = decoded.width;
      height = decoded.height;
      data = decoded.data;
    } else {
      // Try PNG decode
      const parsed = PNG.sync.read(Buffer.from(imgBuf));
      width = parsed.width;
      height = parsed.height;
      data = parsed.data;
    }

    if (!data || width === 0 || height === 0) {
      throw new Error('Image decoding failed');
    }

    // 5. Detect Background Colors from 4 corners
    const corners = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      [Math.floor(width / 2), 0]
    ];
    const bgColors = corners.map(([cx, cy]) => {
      const idx = (cy * width + cx) * 4;
      return [data[idx], data[idx + 1], data[idx + 2]];
    });

    function isBgPixel(r, g, b, a) {
      if (a < 50) return true;
      for (const bg of bgColors) {
        if (colorDist(r, g, b, bg[0], bg[1], bg[2]) < 38) return true;
      }
      return false;
    }

    // 6. Crop Chog Head Region
    // In Chog Genesis art, the head + hat/ears occupy roughly:
    // x: 10% to 90%, y: 0% to 70%
    const crop = {
      x: Math.round(width * 0.10),
      y: 0,
      w: Math.round(width * 0.82),
      h: Math.round(height * 0.70)
    };

    // Town sprite head density: 32 wide x 26 high
    const gridW = 32;
    const gridH = 26;
    const blockW = crop.w / gridW;
    const blockH = crop.h / gridH;

    const rawGrid = [];
    const nonBgColors = [];
    const bodyColors = [];
    const maneColors = [];
    const faceColors = [];

    // 1. Sample lower body / outfit (y: 68% to 94%, x: 26% to 74%)
    for (let by = Math.floor(height * 0.68); by < Math.floor(height * 0.94); by += 6) {
      for (let bx = Math.floor(width * 0.26); bx < Math.floor(width * 0.74); bx += 6) {
        const idx = (by * width + bx) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        if (!isBgPixel(r, g, b, a)) {
          bodyColors.push([r, g, b]);
        }
      }
    }

    // 2. Sample mane crest / spikes area (y: 15% to 55%, x: 10% to 34%)
    for (let my = Math.floor(height * 0.15); my < Math.floor(height * 0.55); my += 6) {
      for (let mx = Math.floor(width * 0.10); mx < Math.floor(width * 0.34); mx += 6) {
        const idx = (my * width + mx) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        if (!isBgPixel(r, g, b, a)) {
          maneColors.push([r, g, b]);
        }
      }
    }

    // 3. Sample central face / skin (y: 35% to 65%, x: 40% to 68%)
    for (let fy = Math.floor(height * 0.35); fy < Math.floor(height * 0.65); fy += 6) {
      for (let fx = Math.floor(width * 0.40); fx < Math.floor(width * 0.68); fx += 6) {
        const idx = (fy * width + fx) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        if (!isBgPixel(r, g, b, a)) {
          faceColors.push([r, g, b]);
        }
      }
    }

    // Area-average downscale to 32x26 grid
    for (let gy = 0; gy < gridH; gy++) {
      rawGrid[gy] = [];
      for (let gx = 0; gx < gridW; gx++) {
        let rSum = 0, gSum = 0, bSum = 0, validCount = 0, totalCount = 0;
        const sy1 = Math.floor(crop.y + gy * blockH);
        const sy2 = Math.min(height, Math.floor(crop.y + (gy + 1) * blockH));
        const sx1 = Math.floor(crop.x + gx * blockW);
        const sx2 = Math.min(width, Math.floor(crop.x + (gx + 1) * blockW));

        for (let sy = sy1; sy < sy2; sy += 2) {
          for (let sx = sx1; sx < sx2; sx += 2) {
            totalCount++;
            const idx = (sy * width + sx) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
            if (!isBgPixel(r, g, b, a)) {
              rSum += r; gSum += g; bSum += b; validCount++;
            }
          }
        }

        // Relaxed threshold (0.18) preserves delicate hats, ears, horns, and crests without clipping
        if (validCount / (totalCount || 1) >= 0.18) {
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

    // 7. Palette Quantization: Snap to PALETTE_24 + up to 14 sampled distinct accent colors
    const extraPalette = [];
    for (const c of nonBgColors) {
      if (extraPalette.length >= 14) break;
      let dist24 = Infinity;
      for (const p of PALETTE_RGB) {
        dist24 = Math.min(dist24, colorDist(c[0], c[1], c[2], p[0], p[1], p[2]));
      }
      if (dist24 > 24) {
        let distExtra = Infinity;
        for (const e of extraPalette) {
          distExtra = Math.min(distExtra, colorDist(c[0], c[1], c[2], e[0], e[1], e[2]));
        }
        if (distExtra > 20) {
          extraPalette.push(c);
        }
      }
    }

    const quantizedGrid = [];
    for (let gy = 0; gy < gridH; gy++) {
      quantizedGrid[gy] = [];
      for (let gx = 0; gx < gridW; gx++) {
        const p = rawGrid[gy][gx];
        if (!p) {
          quantizedGrid[gy][gx] = null;
          continue;
        }
        const match = findNearestPaletteColor(p.r, p.g, p.b, extraPalette);
        quantizedGrid[gy][gx] = {
          r: match.rgb[0],
          g: match.rgb[1],
          b: match.rgb[2],
          hex: match.hex,
        };
      }
    }

    // 8. Clean up: Remove isolated stray pixels & fill single-pixel gaps
    for (let gy = 1; gy < gridH - 1; gy++) {
      for (let gx = 1; gx < gridW - 1; gx++) {
        const p = quantizedGrid[gy][gx];
        const neighbors = [
          quantizedGrid[gy - 1][gx],
          quantizedGrid[gy + 1][gx],
          quantizedGrid[gy][gx - 1],
          quantizedGrid[gy][gx + 1],
        ].filter(Boolean);

        if (p && neighbors.length === 0) {
          quantizedGrid[gy][gx] = null; // drop stray
        } else if (!p && neighbors.length >= 3) {
          quantizedGrid[gy][gx] = { ...neighbors[0] }; // fill gap
        }
      }
    }

    // 8B. 2x2 Eye & Key Facial Feature Protection (keep eyes sharp and readable)
    for (let gy = 9; gy <= 18; gy++) {
      for (let gx = 7; gx <= 24; gx++) {
        const p = quantizedGrid[gy]?.[gx];
        if (!p) continue;
        const lum = (p.r * 299 + p.g * 587 + p.b * 114) / 1000;
        const isSclera = lum > 210; // bright white eye highlight
        const isPupil = lum < 45;   // deep dark pupil

        if (isSclera || isPupil) {
          // Ensure at least a 2x2 or 2x1 cohesive cluster so eye features do not vanish
          if (gx + 1 < gridW && quantizedGrid[gy][gx + 1]) {
            const neighborLum = (quantizedGrid[gy][gx + 1].r * 299 + quantizedGrid[gy][gx + 1].g * 587 + quantizedGrid[gy][gx + 1].b * 114) / 1000;
            if (Math.abs(lum - neighborLum) > 100) {
              quantizedGrid[gy][gx + 1] = { ...p };
            }
          }
        }
      }
    }

    // 9. 1px Dark Outline (#14101C) & Top-Left Light Direction
    const finalGrid = JSON.parse(JSON.stringify(quantizedGrid));
    const INK_BLACK = { r: 20, g: 16, b: 28, hex: '#14101C' };
    const HIGHLIGHT_COLOR = { r: 255, g: 253, b: 247, hex: '#FFFDF7' };

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        if (quantizedGrid[gy][gx]) {
          const bordersEmptyTop = gy === 0 || !quantizedGrid[gy - 1][gx];
          const bordersEmptyLeft = gx === 0 || !quantizedGrid[gy][gx - 1];
          const bordersEmptyBottom = gy === gridH - 1 || !quantizedGrid[gy + 1][gx];
          const bordersEmptyRight = gx === gridW - 1 || !quantizedGrid[gy][gx + 1];

          const isOuterBorder = bordersEmptyTop || bordersEmptyLeft || bordersEmptyBottom || bordersEmptyRight;

          if (isOuterBorder) {
            // Shadows bottom-right, ink outline everywhere on outer edge
            finalGrid[gy][gx] = { ...INK_BLACK };
            // Single top-left light direction highlight on inner adjacent pixel
            if (bordersEmptyTop && bordersEmptyLeft && gy + 1 < gridH && gx + 1 < gridW && quantizedGrid[gy + 1][gx + 1]) {
              const innerLum = (quantizedGrid[gy + 1][gx + 1].r * 299 + quantizedGrid[gy + 1][gx + 1].g * 587 + quantizedGrid[gy + 1][gx + 1].b * 114) / 1000;
              if (innerLum > 70 && innerLum < 200) {
                finalGrid[gy + 1][gx + 1] = { ...HIGHLIGHT_COLOR };
              }
            }
          }
        }
      }
    }

    // 10. Extract Dominant Body & Mane Colors via 3D Color Histogram Clustering
    // Replaces arithmetic averaging to prevent color cancellation into muddy grey #64748B
    function findHistogramPeak(pixelArray) {
      if (!pixelArray || pixelArray.length === 0) return null;
      const buckets = {};
      for (const [r, g, b] of pixelArray) {
        if (r < 25 && g < 25 && b < 25) continue; // skip deep outline/black
        if (r > 248 && g > 248 && b > 248) continue; // skip highlight glare
        // 18-step quantization buckets (prevents small shade variations from splitting peaks)
        const br = Math.min(255, Math.round(r / 18) * 18);
        const bg = Math.min(255, Math.round(g / 18) * 18);
        const bb = Math.min(255, Math.round(b / 18) * 18);
        const key = `${br},${bg},${bb}`;
        buckets[key] = (buckets[key] || 0) + 1;
      }

      let bestKey = null;
      let maxCount = -1;
      for (const [key, count] of Object.entries(buckets)) {
        if (count > maxCount) {
          maxCount = count;
          bestKey = key;
        }
      }
      if (!bestKey) return null;
      return bestKey.split(',').map(Number);
    }

    let dominantBodyHex = '#6C2BD9';
    let dominantManeHex = '#A78BFA';
    let dominantManeShadow = '#59397E';

    // 1. Dominant Body / Outfit Color from Histogram Peak
    const bodyPeak = findHistogramPeak(bodyColors) || findHistogramPeak(faceColors);
    if (bodyPeak) {
      const match = findNearestPaletteColor(bodyPeak[0], bodyPeak[1], bodyPeak[2], extraPalette);
      // Snap to palette if very close; otherwise retain the artwork's exact vibrant accent
      dominantBodyHex = match.dist < 32 ? match.hex : rgbToHex(bodyPeak[0], bodyPeak[1], bodyPeak[2]);
    }

    // 2. Dominant Mane / Spikes Color from Crest Histogram Peak
    const manePeak = findHistogramPeak(maneColors) || findHistogramPeak(faceColors);
    if (manePeak) {
      const match = findNearestPaletteColor(manePeak[0], manePeak[1], manePeak[2], extraPalette);
      dominantManeHex = match.dist < 32 ? match.hex : rgbToHex(manePeak[0], manePeak[1], manePeak[2]);
      const mRgb = hexToRgb(dominantManeHex);
      dominantManeShadow = rgbToHex(
        Math.max(15, Math.round(mRgb[0] * 0.62)),
        Math.max(12, Math.round(mRgb[1] * 0.62)),
        Math.max(20, Math.round(mRgb[2] * 0.62))
      );
    }

    // Contrast guarantee: ensure body and mane are visually distinct
    const bRgb = hexToRgb(dominantBodyHex);
    const mRgbFinal = hexToRgb(dominantManeHex);
    if (colorDist(bRgb[0], bRgb[1], bRgb[2], mRgbFinal[0], mRgbFinal[1], mRgbFinal[2]) < 42) {
      const bLum = (bRgb[0] * 299 + bRgb[1] * 587 + bRgb[2] * 114) / 1000;
      if (bLum < 128) {
        dominantManeHex = rgbToHex(Math.min(255, mRgbFinal[0] + 60), Math.min(255, mRgbFinal[1] + 60), Math.min(255, mRgbFinal[2] + 70));
      } else {
        dominantManeHex = rgbToHex(Math.max(15, mRgbFinal[0] - 60), Math.max(15, mRgbFinal[1] - 60), Math.max(20, mRgbFinal[2] - 50));
      }
      const adjustedM = hexToRgb(dominantManeHex);
      dominantManeShadow = rgbToHex(
        Math.max(15, Math.round(adjustedM[0] * 0.62)),
        Math.max(12, Math.round(adjustedM[1] * 0.62)),
        Math.max(20, Math.round(adjustedM[2] * 0.62))
      );
    }

    // 3. Trait-aware refinements (if traits provide explicit visual metadata)
    const traits = metadata.attributes || [];
    const bodyTrait = (traits.find(t => t.trait_type === 'Body')?.value || '').toLowerCase();
    const skinTrait = (traits.find(t => t.trait_type === 'Skin')?.value || '').toLowerCase();

    if (bodyTrait.includes('yellow') || bodyTrait.includes('gold') || bodyTrait.includes('jersey')) {
      if (!bodyPeak || (bodyPeak[0] > 120 && bodyPeak[1] > 120)) {
        dominantBodyHex = dominantBodyHex === '#64748B' ? '#F59E0B' : dominantBodyHex;
      }
    } else if (bodyTrait.includes('red') || bodyTrait.includes('trackset')) {
      if (!bodyPeak || bodyPeak[0] > 120) {
        dominantBodyHex = dominantBodyHex === '#64748B' ? '#EF4444' : dominantBodyHex;
      }
    } else if (bodyTrait.includes('tuxedo') || bodyTrait.includes('dark vest')) {
      dominantBodyHex = '#241734';
    }

    if (skinTrait.includes('pink')) {
      if (dominantManeHex === '#64748B' || dominantManeHex === '#A78BFA') {
        dominantManeHex = '#F472B6';
        dominantManeShadow = '#BE185D';
      }
    } else if (skinTrait.includes('gold') || skinTrait.includes('yellow')) {
      dominantManeHex = '#F59E0B';
      dominantManeShadow = '#B45309';
    } else if (skinTrait.includes('zombie')) {
      dominantManeHex = '#15803D';
      dominantManeShadow = '#14532D';
    }

    // 11. Generate Matrix of Hex Strings (null = transparent)
    const headMatrix = [];
    for (let gy = 0; gy < gridH; gy++) {
      headMatrix[gy] = [];
      for (let gx = 0; gx < gridW; gx++) {
        headMatrix[gy][gx] = finalGrid[gy][gx] ? finalGrid[gy][gx].hex : null;
      }
    }

    // 12. Render 4x Scaled Portrait PNG (128x104)
    const scale = 4;
    const portW = gridW * scale;
    const portH = gridH * scale;
    const portraitPng = new PNG({ width: portW, height: portH });

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const p = finalGrid[gy][gx];
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const idx = ((gy * scale + dy) * portW + (gx * scale + dx)) * 4;
            if (p) {
              portraitPng.data[idx] = p.r;
              portraitPng.data[idx + 1] = p.g;
              portraitPng.data[idx + 2] = p.b;
              portraitPng.data[idx + 3] = 255;
            } else {
              portraitPng.data[idx + 3] = 0;
            }
          }
        }
      }
    }

    const portraitBuf = PNG.sync.write(portraitPng);
    fs.writeFileSync(portraitFile, portraitBuf);

    const result = {
      tokenId,
      pipelineVersion: PIPELINE_VERSION,
      status: 'ok',
      width: gridW,
      height: gridH,
      dominantColors: {
        body: dominantBodyHex,
        mane: dominantManeHex,
        maneShadow: dominantManeShadow,
      },
      headMatrix,
      palette: [...PALETTE_24, ...extraPalette.map(c => rgbToHex(c[0], c[1], c[2]))],
      portraitUrl: `/api/chog/${tokenId}/portrait`,
      portraitBase64: `data:image/png;base64,${portraitBuf.toString('base64')}`,
      traits: metadata.attributes || [],
      sourceImage: metadata.image,
      generatedAt: Date.now(),
    };

    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
    console.log(`[PixelConverter] Successfully auto-pixelated Chog #${tokenId} (${PIPELINE_VERSION})`);
    return result;
  } catch (err) {
    console.error(`[PixelConverter] Error converting Chog #${tokenId}:`, err.message);
    return generateDefaultFallback(tokenId, err.message);
  }
}

/**
 * Fallback generator ensures a Chog NEVER breaks or displays a blank character
 */
export function generateDefaultFallback(tokenId, reason = 'Unknown') {
  const gridW = 32;
  const gridH = 26;
  const headMatrix = Array.from({ length: gridH }, () => Array(gridW).fill(null));

  // Default classic purple head
  for (let y = 4; y < 24; y++) {
    for (let x = 6; x < 26; x++) {
      const dx = (x - 16) / 9;
      const dy = (y - 14) / 9;
      if (dx * dx + dy * dy <= 1) {
        headMatrix[y][x] = '#6C2BD9';
      }
    }
  }

  // 3-spike mane on the left
  if (headMatrix[8]) headMatrix[8][5] = '#A78BFA';
  if (headMatrix[9]) headMatrix[9][4] = '#A78BFA';
  if (headMatrix[13]) headMatrix[13][5] = '#A78BFA';
  if (headMatrix[14]) headMatrix[14][4] = '#A78BFA';
  if (headMatrix[18]) headMatrix[18][5] = '#A78BFA';
  if (headMatrix[19]) headMatrix[19][4] = '#A78BFA';

  // Eyes (at least 2x2 pixels)
  if (headMatrix[12]) {
    headMatrix[12][13] = '#FFFDF7';
    headMatrix[12][14] = '#FFFDF7';
    headMatrix[12][19] = '#FFFDF7';
    headMatrix[12][20] = '#FFFDF7';
  }
  if (headMatrix[13]) {
    headMatrix[13][13] = '#14101C';
    headMatrix[13][14] = '#14101C';
    headMatrix[13][19] = '#14101C';
    headMatrix[13][20] = '#14101C';
  }

  // Generate 4x portrait PNG
  const pWidth = gridW * 4;
  const pHeight = gridH * 4;
  const png = new PNG({ width: pWidth, height: pHeight });
  for (let py = 0; py < gridH; py++) {
    for (let px = 0; px < gridW; px++) {
      const colorHex = headMatrix[py][px];
      const rgb = colorHex ? hexToRgb(colorHex) : [0, 0, 0];
      const alpha = colorHex ? 255 : 0;
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          const idx = ((py * 4 + sy) * pWidth + (px * 4 + sx)) * 4;
          png.data[idx] = rgb[0];
          png.data[idx + 1] = rgb[1];
          png.data[idx + 2] = rgb[2];
          png.data[idx + 3] = alpha;
        }
      }
    }
  }
  const portraitBuf = PNG.sync.write(png);
  const portraitFile = path.join(SPRITES_CACHE_DIR, `${tokenId}_${PIPELINE_VERSION}_portrait.png`);
  try { fs.writeFileSync(portraitFile, portraitBuf); } catch (e) {}

  const fallbackResult = {
    tokenId,
    pipelineVersion: PIPELINE_VERSION,
    status: 'fallback',
    reason,
    width: gridW,
    height: gridH,
    dominantColors: {
      body: '#6C2BD9',
      mane: '#A78BFA',
      maneShadow: '#59397E',
    },
    headMatrix,
    palette: PALETTE_24,
    portraitUrl: `/api/chog/${tokenId}/portrait`,
    portraitBase64: `data:image/png;base64,${portraitBuf.toString('base64')}`,
    traits: [],
    generatedAt: Date.now(),
  };

  const cacheFile = path.join(SPRITES_CACHE_DIR, `${tokenId}_${PIPELINE_VERSION}.json`);
  try { fs.writeFileSync(cacheFile, JSON.stringify(fallbackResult, null, 2)); } catch (e) {}

  return fallbackResult;
}
