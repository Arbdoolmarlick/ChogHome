// scripts/accelerate_batch.mjs
// Parallel accelerator that converts any remaining tokens among 1..1969
import fs from 'fs';
import path from 'path';
import { convertChogToPixelSprite, PIPELINE_VERSION } from '../server/pixelConverter.js';
import { MONAD_CONFIG } from '../server/chogService.js';

const TOTAL = MONAD_CONFIG.totalSupply;
const CONCURRENCY = 24;

async function run() {
  const missing = [];
  for (let i = 1; i <= TOTAL; i++) {
    const jsonPath = path.resolve('.cache', 'sprites', `${i}_${PIPELINE_VERSION}.json`);
    const pngPath = path.resolve('.cache', 'sprites', `${i}_${PIPELINE_VERSION}_portrait.png`);
    if (!fs.existsSync(jsonPath) || !fs.existsSync(pngPath)) {
      missing.push(i);
    }
  }

  console.log(`[Accelerator] Found ${missing.length} remaining tokens out of ${TOTAL}. Spawning ${CONCURRENCY} workers...`);
  if (missing.length === 0) {
    console.log('[Accelerator] All tokens already converted!');
    return;
  }

  let done = 0;
  async function worker(tokens) {
    for (const tid of tokens) {
      try {
        await convertChogToPixelSprite(tid);
      } catch (err) {}
      done++;
      if (done % 50 === 0 || done === missing.length) {
        console.log(`[Accelerator] Completed ${done}/${missing.length} remaining tokens.`);
      }
    }
  }

  const chunks = Array.from({ length: CONCURRENCY }, () => []);
  missing.forEach((tid, idx) => {
    chunks[idx % CONCURRENCY].push(tid);
  });

  await Promise.all(chunks.map(chunk => worker(chunk)));
  console.log('[Accelerator] Finished acceleration run!');
}

run();
