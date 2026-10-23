// scripts/batch_convert_all.mjs
// Batch converts all 1,969 Chog Genesis tokens with concurrency & quality scoring
import fs from 'fs';
import path from 'path';
import { convertChogToPixelSprite, PIPELINE_VERSION } from '../server/pixelConverter.js';
import { MONAD_CONFIG } from '../server/chogService.js';

const TOTAL_SUPPLY = MONAD_CONFIG.totalSupply; // 1969
const CONCURRENCY = 12;
const STATS_FILE = path.resolve('.cache', 'batch_convert_stats.json');

async function batchConvertAll() {
  console.log(`🚀 Starting batch conversion of all ${TOTAL_SUPPLY} Chog Genesis NFTs (Pipeline ${PIPELINE_VERSION})...`);
  const startTime = Date.now();

  const tokenList = [];
  for (let i = 1; i <= TOTAL_SUPPLY; i++) tokenList.push(i);

  const stats = [];
  const failures = [];
  let completed = 0;

  // Worker loop
  async function worker(tokens) {
    for (const tid of tokens) {
      try {
        const t0 = performance.now();
        const sprite = await convertChogToPixelSprite(tid);
        const duration = Math.round(performance.now() - t0);

        // Calculate quality metric
        let nonNullPixels = 0;
        const colorSet = new Set();
        if (sprite.headMatrix) {
          for (const row of sprite.headMatrix) {
            for (const cell of row) {
              if (cell) {
                nonNullPixels++;
                colorSet.add(cell);
              }
            }
          }
        }

        // Quality score: balanced mix of pixel coverage (out of 32x26=832) and color diversity
        const coverageRatio = nonNullPixels / 832;
        const colorRichness = Math.min(1, colorSet.size / 16);
        const qualityScore = Math.round((coverageRatio * 0.55 + colorRichness * 0.45) * 100);

        stats.push({
          tokenId: tid,
          status: sprite.status,
          durationMs: duration,
          nonNullPixels,
          uniqueColors: colorSet.size,
          qualityScore,
          bodyColor: sprite.dominantColors?.body,
          maneColor: sprite.dominantColors?.mane,
          sourceImage: sprite.sourceImage || '',
          portraitUrl: `/api/chog/${tid}/portrait`,
        });

        if (sprite.status !== 'ok') {
          failures.push({ tokenId: tid, status: sprite.status, reason: sprite.reason });
        }
      } catch (err) {
        failures.push({ tokenId: tid, status: 'error', reason: err.message });
      }

      completed++;
      if (completed % 100 === 0 || completed === TOTAL_SUPPLY) {
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);
        console.log(`⚡ Progress: ${completed}/${TOTAL_SUPPLY} tokens (${Math.round((completed / TOTAL_SUPPLY) * 100)}%) in ${elapsedSec}s | Failures: ${failures.length}`);
      }
    }
  }

  // Partition tokens into CONCURRENCY chunks
  const chunks = Array.from({ length: CONCURRENCY }, () => []);
  tokenList.forEach((tid, idx) => {
    chunks[idx % CONCURRENCY].push(tid);
  });

  await Promise.all(chunks.map(chunk => worker(chunk)));

  const totalDuration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🎉 Batch Conversion Completed in ${totalDuration}s!`);
  console.log(`Total Tokens: ${stats.length} | Succeeded: ${stats.filter(s => s.status === 'ok').length} | Failures: ${failures.length}`);

  // Sort by qualityScore ascending to find the 20 weakest tokens
  stats.sort((a, b) => a.qualityScore - b.qualityScore);
  const weakest20 = stats.slice(0, 20);

  fs.writeFileSync(STATS_FILE, JSON.stringify({
    timestamp: Date.now(),
    pipelineVersion: PIPELINE_VERSION,
    totalSupply: TOTAL_SUPPLY,
    totalConverted: stats.length,
    succeeded: stats.filter(s => s.status === 'ok').length,
    failuresCount: failures.length,
    failures,
    weakest20,
    allStats: stats,
  }, null, 2));

  console.log('\n📉 Top 20 Weakest Tokens (by pixel density & color variety):');
  console.table(weakest20.map(w => ({
    tokenId: w.tokenId,
    status: w.status,
    qualityScore: w.qualityScore,
    pixels: w.nonNullPixels,
    colors: w.uniqueColors,
    body: w.bodyColor,
    mane: w.maneColor,
  })));

  // Generate Contact Sheet HTML for 60 varied tokens
  generateContactSheet(stats, weakest20);
}

function generateContactSheet(allStats, weakest20) {
  // Select 60 varied tokens: 20 weakest, 20 median, 20 top-tier
  const sorted = [...allStats].sort((a, b) => a.qualityScore - b.qualityScore);
  const weakest = sorted.slice(0, 20);
  const mid = sorted.slice(Math.floor(sorted.length / 2) - 10, Math.floor(sorted.length / 2) + 10);
  const strongest = sorted.slice(-20);

  const sample60 = [...weakest, ...mid, ...strongest];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Chog Genesis Auto-Pixel Contact Sheet (60 Varied Tokens)</title>
  <style>
    body {
      background: #0B0813;
      color: #FFFDF7;
      font-family: monospace;
      padding: 24px;
      margin: 0;
    }
    h1 {
      color: #836EF9;
      font-size: 24px;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #A78BFA;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .card {
      background: #14101C;
      border: 1px solid #241734;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .images-row {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 8px;
    }
    .img-box {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .img-box span {
      font-size: 10px;
      color: #64748B;
      margin-bottom: 4px;
    }
    .img-box img {
      width: 110px;
      height: 110px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #241734;
      background: #0B0813;
      image-rendering: pixelated;
    }
    .info {
      font-size: 11px;
      width: 100%;
      display: flex;
      justify-content: space-between;
      color: #CBD5E1;
      border-top: 1px solid #241734;
      padding-top: 6px;
    }
    .swatches {
      display: flex;
      gap: 6px;
      margin-top: 4px;
    }
    .swatch {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      border: 1px solid #000;
    }
    .badge {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #241734;
    }
    .badge.weak { background: #7f1d1d; color: #fca5a5; }
    .badge.strong { background: #14532d; color: #86efac; }
  </style>
</head>
<body>
  <h1>Chog Genesis — Auto-Pixel Contact Sheet (Pipeline ${PIPELINE_VERSION})</h1>
  <div class="subtitle">Side-by-side comparison of Real NFT Genesis WebP vs 16-Bit Town Sprite (60 Varied Tokens across Weakest, Median, and Strongest tiers)</div>

  <div class="grid">
    ${sample60.map(item => {
      const idx = (item.tokenId + 1460) % 1969 + 1;
      const originalWebpUrl = `https://magic.decentralized-content.com/ipfs/bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/${idx}.webp`;
      const pixelPortraitUrl = `http://localhost:3001/api/chog/${item.tokenId}/portrait`;
      const tierBadge = item.qualityScore < 45 ? '<span class="badge weak">Tier: Weakest</span>' : (item.qualityScore > 65 ? '<span class="badge strong">Tier: High Detail</span>' : '<span class="badge">Tier: Median</span>');

      return `
      <div class="card">
        <div class="images-row">
          <div class="img-box">
            <span>ORIGINAL NFT</span>
            <img src="${originalWebpUrl}" alt="Original Chog #${item.tokenId}" onerror="this.src='/sample_chog_1.webp'" />
          </div>
          <div class="img-box">
            <span>16-BIT PIXEL</span>
            <img src="${pixelPortraitUrl}" alt="Pixel Chog #${item.tokenId}" />
          </div>
        </div>
        <div class="info">
          <span><strong>Chog #${item.tokenId}</strong> ${tierBadge}</span>
          <span>Score: ${item.qualityScore}</span>
        </div>
        <div class="info" style="border: none; padding-top: 2px;">
          <span>Colors: ${item.uniqueColors} | Px: ${item.nonNullPixels}</span>
          <div class="swatches">
            <div class="swatch" style="background:${item.bodyColor}" title="Body: ${item.bodyColor}"></div>
            <div class="swatch" style="background:${item.maneColor}" title="Mane: ${item.maneColor}"></div>
          </div>
        </div>
      </div>
      `;
    }).join('\n')}
  </div>
</body>
</html>`;

  const sheetPath = path.resolve('shots', 'contact_sheet.html');
  try {
    if (!fs.existsSync(path.resolve('shots'))) fs.mkdirSync(path.resolve('shots'), { recursive: true });
    fs.writeFileSync(sheetPath, html, 'utf8');
    console.log(`\n📄 Generated Contact Sheet HTML: ${sheetPath}`);
  } catch (e) {
    console.warn('Could not write contact sheet HTML:', e.message);
  }
}

batchConvertAll().then(() => process.exit(0)).catch(err => {
  console.error('Batch convert failed:', err);
  process.exit(1);
});
