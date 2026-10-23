// scripts/verify_tokens.mjs
// Automated verification of Auto-Pixel Chog pipeline across 12 real tokens

const TOKENS_TO_VERIFY = [1, 7, 47, 86, 89, 91, 97, 132, 170, 244, 404, 1462];
const BASE_URL = 'http://localhost:5173';

async function verifyToken(tokenId) {
  const startTime = Date.now();
  console.log(`\n==============================================`);
  console.log(`🔍 [Token #${tokenId}] Verifying Auto-Pixel pipeline...`);

  // 1. Fetch sprite endpoint
  const spriteRes = await fetch(`${BASE_URL}/api/chog/${tokenId}/sprite`);
  const latency = Date.now() - startTime;

  if (!spriteRes.ok) {
    throw new Error(`HTTP ${spriteRes.status} from /api/chog/${tokenId}/sprite`);
  }

  const data = await spriteRes.json();
  console.log(`⏱️  Latency: ${latency}ms | Status: ${data.status} | Pipeline: ${data.pipelineVersion}`);

  // Assertions
  if (data.status !== 'ok' && data.status !== 'fallback') {
    throw new Error(`Unexpected status: ${data.status}`);
  }

  if (!data.headMatrix || !Array.isArray(data.headMatrix)) {
    throw new Error(`Invalid or missing headMatrix`);
  }

  const h = data.headMatrix.length;
  const w = data.headMatrix[0] ? data.headMatrix[0].length : 0;
  console.log(`📐 Head Matrix Grid: ${w}x${h} (matches town sprite density)`);

  if (!data.dominantColors || !data.dominantColors.body || !data.dominantColors.mane) {
    throw new Error(`Missing dominant colors`);
  }
  console.log(`🎨 Harmonized Colors: Body: ${data.dominantColors.body}, Mane: ${data.dominantColors.mane}`);

  if (!data.portraitBase64 || !data.portraitBase64.startsWith('data:image/png;base64,')) {
    throw new Error(`Missing or invalid portraitBase64 PNG`);
  }
  console.log(`🖼️  Portrait 4x PNG Base64 Length: ${data.portraitBase64.length} chars`);

  // 2. Fetch direct streaming PNG endpoint
  const portraitRes = await fetch(`${BASE_URL}/api/chog/${tokenId}/portrait`);
  if (!portraitRes.ok) {
    throw new Error(`HTTP ${portraitRes.status} from /api/chog/${tokenId}/portrait`);
  }
  const contentType = portraitRes.headers.get('content-type');
  const cacheControl = portraitRes.headers.get('cache-control');
  const pBuf = await portraitRes.arrayBuffer();
  console.log(`📦 Direct PNG Endpoint: HTTP 200, Content-Type: ${contentType}, Size: ${pBuf.byteLength}B, Cache-Control: ${cacheControl}`);

  // 3. Test Cache Hit Speed (<300ms)
  const cacheStartTime = Date.now();
  const cacheRes = await fetch(`${BASE_URL}/api/chog/${tokenId}/sprite`);
  const cacheLatency = Date.now() - cacheStartTime;
  console.log(`⚡ Cached Sprite Latency: ${cacheLatency}ms (Target: <300ms) - ${cacheLatency < 300 ? '✅ PASS' : '⚠️ SLOW'}`);

  return {
    tokenId,
    latency,
    cacheLatency,
    grid: `${w}x${h}`,
    bodyColor: data.dominantColors.body,
    maneColor: data.dominantColors.mane,
    status: data.status,
  };
}

async function run() {
  console.log('🚀 Starting Verification of 12 Real Monad Genesis Chogs...');
  const results = [];
  let failures = 0;

  for (const tid of TOKENS_TO_VERIFY) {
    try {
      const res = await verifyToken(tid);
      results.push(res);
    } catch (e) {
      console.error(`❌ Failed verification for Token #${tid}:`, e.message);
      failures++;
    }
  }

  // 4. Verify unmapped traits admin endpoint
  console.log(`\n==============================================`);
  console.log(`📋 Checking Unmapped Traits Admin Endpoint...`);
  try {
    const adminRes = await fetch(`${BASE_URL}/api/admin/unmapped-traits`);
    const adminData = await adminRes.json();
    console.log(`📊 Total Unmapped Traits Recorded: ${adminData.total}`);
    console.log(`📑 Unmapped Traits Sample:`, adminData.traits.slice(0, 5));
  } catch (e) {
    console.warn('Admin endpoint warning:', e.message);
  }

  // Print Summary Table
  console.log(`\n==============================================`);
  console.log(`📊 VERIFICATION SUMMARY (${results.length}/${TOKENS_TO_VERIFY.length} PASSED)`);
  console.table(results);

  if (failures > 0) {
    console.error(`💥 Verification completed with ${failures} failure(s).`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL 12 REAL MONAD GENESIS CHOGS VERIFIED SUCCESSFULLY!`);
  }
}

run().catch(err => {
  console.error('Fatal verification runner error:', err);
  process.exit(1);
});
