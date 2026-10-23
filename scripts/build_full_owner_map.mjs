// scripts/build_full_owner_map.mjs
// Safely and gently query all 1,969 Chog owners on Monad Mainnet (Chain 143)
import fs from 'fs';
import path from 'path';
import { MONAD_CONFIG, getOwnerOf } from '../server/chogService.js';

const TOTAL_SUPPLY = 1969;
const RPC_URL = MONAD_CONFIG.rpcUrl;
const NFT_CONTRACT = MONAD_CONFIG.nftContract;

async function queryBatch(tokenIds) {
  const batch = tokenIds.map(tid => ({
    jsonrpc: '2.0',
    id: tid,
    method: 'eth_call',
    params: [
      {
        to: NFT_CONTRACT,
        data: '0x6352211e' + tid.toString(16).padStart(64, '0'),
      },
      'latest',
    ],
  }));

  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error('Non-array response: ' + JSON.stringify(json));
  return json;
}

async function main() {
  console.log(`🌐 Scanning all ${TOTAL_SUPPLY} Chog owners on Monad Mainnet (${RPC_URL})...`);

  // Load any existing map
  let tokenOwners = {};
  const cacheFile = path.resolve('.cache', 'ownerMap.json');
  if (fs.existsSync(cacheFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      tokenOwners = data.tokenOwners || {};
      console.log(`Loaded ${Object.keys(tokenOwners).length} previously mapped tokens.`);
    } catch (e) {}
  }

  // Find remaining missing tokens
  const missing = [];
  for (let tid = 1; tid <= TOTAL_SUPPLY; tid++) {
    if (!tokenOwners[tid]) missing.push(tid);
  }
  console.log(`${missing.length} tokens remain to be queried.`);

  const BATCH_SIZE = 15;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const chunk = missing.slice(i, i + BATCH_SIZE);
    let success = false;

    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const results = await queryBatch(chunk);
        for (const item of results) {
          if (item.result && item.result.length >= 66 && item.result !== '0x') {
            const owner = ('0x' + item.result.slice(26)).toLowerCase();
            tokenOwners[item.id] = owner;
          }
        }
        success = true;
        break;
      } catch (err) {
        // Wait and back off
        await new Promise(r => setTimeout(r, 600 * attempt));
      }
    }

    if (!success) {
      console.warn(`Batch starting at Token #${chunk[0]} failed after retries. Falling back to single queries...`);
      for (const tid of chunk) {
        try {
          const owner = await getOwnerOf(tid);
          if (owner) tokenOwners[tid] = owner;
        } catch (e) {}
        await new Promise(r => setTimeout(r, 80));
      }
    }

    process.stdout.write(`\rProgress: ${Object.keys(tokenOwners).length} / ${TOTAL_SUPPLY} tokens mapped...`);
    // Throttle to respect Monad public RPC limit (<= 25 req/s)
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\n\nFinal check for any remaining gaps...');
  for (let tid = 1; tid <= TOTAL_SUPPLY; tid++) {
    if (!tokenOwners[tid]) {
      try {
        const owner = await getOwnerOf(tid);
        if (owner) tokenOwners[tid] = owner;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // Build owner -> tokens reverse map
  const ownerMap = {};
  for (const [tidStr, owner] of Object.entries(tokenOwners)) {
    const tid = parseInt(tidStr, 10);
    if (!ownerMap[owner]) ownerMap[owner] = [];
    ownerMap[owner].push(tid);
  }

  const mappedCount = Object.keys(tokenOwners).length;
  const uniqueOwners = Object.keys(ownerMap).length;

  console.log('========================================================');
  console.log(`🎉 Monad Mainnet Owner Scan Complete:`);
  console.log(`- Mapped Tokens: ${mappedCount} / ${TOTAL_SUPPLY} (${((mappedCount / TOTAL_SUPPLY) * 100).toFixed(2)}%)`);
  console.log(`- Unique Holders: ${uniqueOwners}`);
  console.log('========================================================');

  const finalPayload = {
    timestamp: Date.now(),
    totalSupply: TOTAL_SUPPLY,
    mappedCount,
    ownerCount: uniqueOwners,
    ownerMap,
    tokenOwners,
  };

  // Save to .cache
  fs.writeFileSync(cacheFile, JSON.stringify(finalPayload, null, 2));

  // Also save seed directly into server/ownerMap.json so fresh deployments NEVER start empty!
  const serverSeedFile = path.resolve('server', 'ownerMap.json');
  fs.writeFileSync(serverSeedFile, JSON.stringify(finalPayload, null, 2));
  console.log(`✅ Saved seed owner map directly to ${serverSeedFile} for production deployment!`);
}

main().catch(err => {
  console.error('Fatal error building owner map:', err);
  process.exit(1);
});
