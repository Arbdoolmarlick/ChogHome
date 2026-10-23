// scripts/benchmark_cold_cache.mjs
import fs from 'fs';
import path from 'path';
import { convertChogToPixelSprite, PIPELINE_VERSION } from '../server/pixelConverter.js';

const TOKENS = [2, 5, 10, 18, 25, 50, 75, 100, 150, 200];
const SPRITES_CACHE_DIR = path.resolve('.cache', 'sprites');
const METADATA_DIR = path.resolve('.cache', 'metadata');

async function runBenchmark() {
  console.log('🚀 Running Cold-Cache & Warm-Cache Benchmark across 10 Tokens...');
  console.log('================================================================');

  const results = [];

  for (const tid of TOKENS) {
    // 1. CLEAR CACHE FOR THIS TOKEN (Guarantee 100% cold run)
    const jsonFile = path.join(SPRITES_CACHE_DIR, `${tid}_${PIPELINE_VERSION}.json`);
    const pngFile = path.join(SPRITES_CACHE_DIR, `${tid}_${PIPELINE_VERSION}_portrait.png`);
    const metaFile = path.join(METADATA_DIR, `${tid}.json`);

    try { if (fs.existsSync(jsonFile)) fs.unlinkSync(jsonFile); } catch (e) {}
    try { if (fs.existsSync(pngFile)) fs.unlinkSync(pngFile); } catch (e) {}
    try { if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile); } catch (e) {}

    // 2. COLD RUN (Download + WASM Decode + Quantize + Save)
    const tColdStart = performance.now();
    const coldResult = await convertChogToPixelSprite(tid);
    const coldDuration = Math.round(performance.now() - tColdStart);

    // 3. WARM RUN (Disk & memory cache retrieval)
    const tWarmStart = performance.now();
    const warmResult = await convertChogToPixelSprite(tid);
    const warmDuration = Math.round((performance.now() - tWarmStart) * 100) / 100;

    results.push({
      tokenId: tid,
      status: coldResult.status,
      coldMs: coldDuration,
      warmMs: warmDuration,
      body: coldResult.dominantColors?.body,
      mane: coldResult.dominantColors?.mane,
      grid: `${coldResult.width}x${coldResult.height}`,
    });

    console.log(`Token #${tid.toString().padEnd(4)} | Cold: ${coldDuration.toString().padStart(5)}ms | Warm: ${warmDuration.toFixed(2).padStart(6)}ms | Body: ${coldResult.dominantColors?.body} | Mane: ${coldResult.dominantColors?.mane} | Status: ${coldResult.status}`);
  }

  console.log('\n================================================================');
  console.log('📊 BENCHMARK SUMMARY TABLE:');
  console.table(results);

  const avgCold = Math.round(results.reduce((acc, r) => acc + r.coldMs, 0) / results.length);
  const avgWarm = Math.round((results.reduce((acc, r) => acc + r.warmMs, 0) / results.length) * 100) / 100;
  console.log(`\n⚡ Average First-Time Cold Latency: ${avgCold} ms (Target: <3000ms)`);
  console.log(`⚡ Average Cache-Hit Warm Latency: ${avgWarm} ms (Target: <300ms)`);

  fs.writeFileSync('.cache/cold_benchmark_results.json', JSON.stringify({ avgCold, avgWarm, results }, null, 2));
}

runBenchmark().then(() => process.exit(0)).catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
