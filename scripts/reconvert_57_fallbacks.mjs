// scripts/reconvert_57_fallbacks.mjs
// Re-convert the 57 previous fallback tokens using v1.4 raced parallel IPFS gateways
import fs from 'fs';
import path from 'path';
import { convertChogToPixelSprite, PIPELINE_VERSION } from '../server/pixelConverter.js';

const FALLBACK_57 = [
  84, 68, 67, 42, 94, 28, 147, 657, 930, 859, 1110, 1163, 1147, 1234, 1248,
  1179, 1203, 1182, 1204, 1232, 1165, 1211, 1223, 1193, 1202, 1171, 1183, 1258,
  1228, 1194, 1206, 1197, 1209, 1272, 1284, 1229, 1268, 1225, 1214, 1292, 1235,
  1263, 1318, 1293, 1278, 1255, 1274, 1319, 1312, 1364, 1390, 1289, 1301, 1297,
  1413, 1541, 1644
];

async function main() {
  console.log(`🚀 Starting Re-conversion of 57 Fallback Tokens with Pipeline ${PIPELINE_VERSION}`);
  console.log('Using 5 raced parallel IPFS gateways with 12s timeout and 3 retries...');

  const results = [];
  let succeeded = 0;
  let failed = 0;

  // Process in batches of 4 concurrency to avoid socket exhaustion while maximizing throughput
  const CONCURRENCY = 4;
  for (let i = 0; i < FALLBACK_57.length; i += CONCURRENCY) {
    const batch = FALLBACK_57.slice(i, i + CONCURRENCY);
    const batchPromises = batch.map(async (tokenId) => {
      const start = Date.now();
      try {
        const sprite = await convertChogToPixelSprite(tokenId);
        const duration = Date.now() - start;
        if (sprite.status === 'ok') {
          succeeded++;
          console.log(`✅ Token #${tokenId}: OK (${duration}ms) - body: ${sprite.dominantColors?.body}, mane: ${sprite.dominantColors?.mane}, rows: ${sprite.headMatrix?.length}`);
          return { tokenId, status: 'ok', duration, body: sprite.dominantColors?.body, mane: sprite.dominantColors?.mane };
        } else {
          failed++;
          console.log(`⚠️ Token #${tokenId}: FALLBACK (${duration}ms) - ${sprite.fallbackReason}`);
          return { tokenId, status: 'fallback', duration, reason: sprite.fallbackReason };
        }
      } catch (err) {
        failed++;
        console.error(`❌ Token #${tokenId}: ERROR - ${err.message}`);
        return { tokenId, status: 'error', error: err.message };
      }
    });

    const batchRes = await Promise.all(batchPromises);
    results.push(...batchRes);
  }

  console.log('\n==================================================');
  console.log(`🎯 Re-conversion Complete: ${succeeded}/${FALLBACK_57.length} Succeeded (${failed} failed)`);
  console.log('==================================================');

  fs.writeFileSync('.cache/reconvert_57_results.json', JSON.stringify({
    timestamp: Date.now(),
    pipelineVersion: PIPELINE_VERSION,
    total: FALLBACK_57.length,
    succeeded,
    failed,
    results
  }, null, 2));
}

main().catch(err => {
  console.error('Fatal error in reconvert script:', err);
  process.exit(1);
});
