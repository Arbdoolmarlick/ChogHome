// scripts/generate_standalone_contact_sheet.mjs
// Generate standalone contact sheet for 60 varied tokens using v1.4 static assets & raced IPFS
import fs from 'fs';
import path from 'path';

const STATS_FILE = path.resolve('.cache', 'batch_convert_stats.json');
const statsData = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
const allStats = statsData.allStats;

const sorted = [...allStats].sort((a, b) => a.qualityScore - b.qualityScore);
const weakest = sorted.slice(0, 20);
const mid = sorted.slice(Math.floor(sorted.length / 2) - 10, Math.floor(sorted.length / 2) + 10);
const strongest = sorted.slice(-20);
const sample60 = [...weakest, ...mid, ...strongest];

console.log(`Building contact sheet for ${sample60.length} varied tokens using v1.4 assets...`);

const sampleWebpBase64 = fs.readFileSync(path.resolve('sample_chog_1.webp')).toString('base64');

const IPFS_GATEWAYS = [
  'https://magic.decentralized-content.com/ipfs',
  'https://ipfs.filebase.io/ipfs',
  'https://dweb.link/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://ipfs.io/ipfs',
];

async function getOriginalImageBase64(tokenId) {
  const idx = (tokenId + 1460) % 1969 + 1;
  const ipfsHash = 'bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e';

  // Race gateways for fast, reliable image retrieval
  const fetchPromises = IPFS_GATEWAYS.map(async (gateway) => {
    const url = `${gateway}/${ipfsHash}/${idx}.webp`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 500) throw new Error('Empty payload');
    return `data:image/webp;base64,${Buffer.from(buf).toString('base64')}`;
  });

  try {
    return await Promise.any(fetchPromises);
  } catch (e) {
    return `data:image/webp;base64,${sampleWebpBase64}`;
  }
}

async function build() {
  const cardsHtml = await Promise.all(sample60.map(async (item) => {
    const origBase64 = await getOriginalImageBase64(item.tokenId);

    // Prefer public static portrait, fallback to cache
    const staticPort = path.resolve('public', 'assets', 'chogs', 'portraits', `${item.tokenId}.png`);
    const cachePort14 = path.resolve('.cache', 'sprites', `${item.tokenId}_v1.4_portrait.png`);
    const cachePort13 = path.resolve('.cache', 'sprites', `${item.tokenId}_v1.3_portrait.png`);

    let pixelBase64 = '';
    if (fs.existsSync(staticPort)) {
      pixelBase64 = `data:image/png;base64,${fs.readFileSync(staticPort).toString('base64')}`;
    } else if (fs.existsSync(cachePort14)) {
      pixelBase64 = `data:image/png;base64,${fs.readFileSync(cachePort14).toString('base64')}`;
    } else if (fs.existsSync(cachePort13)) {
      pixelBase64 = `data:image/png;base64,${fs.readFileSync(cachePort13).toString('base64')}`;
    }

    // Read sprite JSON for up-to-date colors and metrics
    const staticJson = path.resolve('public', 'assets', 'chogs', 'sprites', `${item.tokenId}.json`);
    let bodyColor = item.bodyColor || '#64748B';
    let maneColor = item.maneColor || '#A78BFA';
    let pixelCount = item.nonNullPixels;
    let uniqueColors = item.uniqueColors;

    if (fs.existsSync(staticJson)) {
      try {
        const s = JSON.parse(fs.readFileSync(staticJson, 'utf8'));
        if (s.dominantColors?.body) bodyColor = s.dominantColors.body;
        if (s.dominantColors?.mane) maneColor = s.dominantColors.mane;
        if (s.headMatrix) {
          pixelCount = s.headMatrix.flat().filter(p => p !== null).length;
          uniqueColors = new Set(s.headMatrix.flat().filter(p => p !== null)).size;
        }
      } catch (e) {}
    }

    const tierBadge = item.qualityScore < 45 
      ? '<span class="badge weak">Tier: Re-converted Fallback</span>' 
      : (item.qualityScore > 65 ? '<span class="badge strong">Tier: High Detail</span>' : '<span class="badge">Tier: Median</span>');

    return `
      <div class="card">
        <div class="images-row">
          <div class="img-box">
            <span>ORIGINAL NFT</span>
            <img src="${origBase64}" alt="Original Chog #${item.tokenId}" />
          </div>
          <div class="img-box">
            <span>16-BIT PIXEL</span>
            <img src="${pixelBase64}" alt="Pixel Chog #${item.tokenId}" />
          </div>
        </div>
        <div class="info">
          <span><strong>Chog #${item.tokenId}</strong> ${tierBadge}</span>
          <span>Score: ${item.qualityScore}</span>
        </div>
        <div class="info" style="border: none; padding-top: 2px;">
          <span>Colors: ${uniqueColors} | Px: ${pixelCount}</span>
          <div class="swatches">
            <div class="swatch" style="background:${bodyColor}" title="Body: ${bodyColor}"></div>
            <div class="swatch" style="background:${maneColor}" title="Mane: ${maneColor}"></div>
          </div>
        </div>
      </div>
    `;
  }));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Chog Genesis Auto-Pixel Contact Sheet (Pipeline v1.4)</title>
  <style>
    body {
      background: #0B0813;
      color: #FFFDF7;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      padding: 32px;
      margin: 0;
    }
    h1 {
      color: #836EF9;
      font-size: 26px;
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
    }
    .subtitle {
      color: #A78BFA;
      font-size: 14px;
      margin-bottom: 28px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
    .card {
      background: #14101C;
      border: 1px solid #241734;
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .images-row {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 12px;
    }
    .img-box {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .img-box span {
      font-size: 10px;
      color: #64748B;
      margin-bottom: 6px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .img-box img {
      width: 120px;
      height: 120px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #241734;
      background: #0B0813;
      image-rendering: pixelated;
    }
    .info {
      font-size: 12px;
      width: 100%;
      display: flex;
      justify-content: space-between;
      color: #CBD5E1;
      border-top: 1px solid #241734;
      padding-top: 8px;
    }
    .swatches {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .swatch {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #241734;
      font-weight: 600;
    }
    .badge.weak { background: #3b0764; color: #d8b4fe; }
    .badge.strong { background: #14532d; color: #86efac; }
  </style>
</head>
<body>
  <h1>Chog Genesis — Auto-Pixel Contact Sheet (Pipeline v1.4)</h1>
  <div class="subtitle">Side-by-side comparison of Real NFT Genesis WebP vs 16-Bit Town Sprite (60 Varied Tokens across Weakest, Median, and Strongest tiers)</div>
  <div class="grid">
    ${cardsHtml.join('\n')}
  </div>
</body>
</html>`;

  const outHtmlPath = path.resolve('shots', 'contact_sheet.html');
  fs.writeFileSync(outHtmlPath, html, 'utf8');
  console.log(`✅ Standalone contact sheet saved to ${outHtmlPath}`);
}

build().catch(err => {
  console.error('Build contact sheet error:', err);
  process.exit(1);
});
