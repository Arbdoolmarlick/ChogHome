// scripts/build_static_chog_assets.mjs
// Build static sprite JSON and portrait PNG for all 1,969 Chogs into public/assets/chogs/
import fs from 'fs';
import path from 'path';
import { convertChogToPixelSprite, PIPELINE_VERSION } from '../server/pixelConverter.js';
import { MONAD_CONFIG } from '../server/chogService.js';

const ROOT_DIR = process.cwd();
const CACHE_SPRITES_DIR = path.resolve(ROOT_DIR, '.cache', 'sprites');
const OUT_SPRITES_DIR = path.resolve(ROOT_DIR, 'public', 'assets', 'chogs', 'sprites');
const OUT_PORTRAITS_DIR = path.resolve(ROOT_DIR, 'public', 'assets', 'chogs', 'portraits');

fs.mkdirSync(OUT_SPRITES_DIR, { recursive: true });
fs.mkdirSync(OUT_PORTRAITS_DIR, { recursive: true });

async function main() {
  console.log('📦 Building static asset library for all 1,969 Chogs...');
  const total = MONAD_CONFIG.totalSupply; // 1969
  let copiedFromCache = 0;
  let freshlyConverted = 0;
  let failed = 0;

  const toConvert = [];

  for (let id = 1; id <= total; id++) {
    const targetJson = path.resolve(OUT_SPRITES_DIR, `${id}.json`);
    const targetPng = path.resolve(OUT_PORTRAITS_DIR, `${id}.png`);

    // Check if target files already exist in public
    if (fs.existsSync(targetJson) && fs.existsSync(targetPng)) {
      continue;
    }

    // Check v1.4 cache first, then v1.3 cache
    const cacheV14 = path.resolve(CACHE_SPRITES_DIR, `${id}_v1.4.json`);
    const portV14 = path.resolve(CACHE_SPRITES_DIR, `${id}_v1.4_portrait.png`);
    const cacheV13 = path.resolve(CACHE_SPRITES_DIR, `${id}_v1.3.json`);
    const portV13 = path.resolve(CACHE_SPRITES_DIR, `${id}_v1.3_portrait.png`);

    if (fs.existsSync(cacheV14) && fs.existsSync(portV14)) {
      fs.copyFileSync(cacheV14, targetJson);
      fs.copyFileSync(portV14, targetPng);
      copiedFromCache++;
    } else if (fs.existsSync(cacheV13) && fs.existsSync(portV13)) {
      fs.copyFileSync(cacheV13, targetJson);
      fs.copyFileSync(portV13, targetPng);
      copiedFromCache++;
    } else {
      toConvert.push(id);
    }
  }

  console.log(`Pre-populated ${copiedFromCache} tokens from local high-fidelity cache.`);
  if (toConvert.length > 0) {
    console.log(`Converting ${toConvert.length} remaining tokens...`);
    const CONCURRENCY = 8;
    for (let i = 0; i < toConvert.length; i += CONCURRENCY) {
      const batch = toConvert.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(async (id) => {
        try {
          const sprite = await convertChogToPixelSprite(id);
          const portPath = path.resolve(CACHE_SPRITES_DIR, `${id}_${PIPELINE_VERSION}_portrait.png`);
          const targetJson = path.resolve(OUT_SPRITES_DIR, `${id}.json`);
          const targetPng = path.resolve(OUT_PORTRAITS_DIR, `${id}.png`);

          fs.writeFileSync(targetJson, JSON.stringify(sprite, null, 2));
          if (fs.existsSync(portPath)) {
            fs.copyFileSync(portPath, targetPng);
          }
          freshlyConverted++;
        } catch (e) {
          failed++;
          console.error(`Error on token #${id}:`, e.message);
        }
      }));
    }
  }

  // Count final static files
  const finalSprites = fs.readdirSync(OUT_SPRITES_DIR).filter(f => f.endsWith('.json')).length;
  const finalPortraits = fs.readdirSync(OUT_PORTRAITS_DIR).filter(f => f.endsWith('.png')).length;

  console.log('====================================================');
  console.log(`🎉 Static Chog Assets Built Successfully:`);
  console.log(`- Sprites JSON:   ${finalSprites} / ${total} tokens`);
  console.log(`- Portraits PNG:  ${finalPortraits} / ${total} tokens`);
  console.log(`- Total Coverage: ${((finalSprites / total) * 100).toFixed(2)}%`);
  console.log('====================================================');
}

main().catch(err => {
  console.error('Fatal building static chogs:', err);
  process.exit(1);
});
