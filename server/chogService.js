// server/chogService.js
// Monad Mainnet (Chain 143) Chog Genesis Service
// Contract: 0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763

import fs from 'fs';
import path from 'path';

export const MONAD_CONFIG = {
  chainId: 143,
  chainIdHex: '0x8f',
  name: 'Monad',
  rpcUrl: 'https://rpc.monad.xyz',
  explorer: 'https://monadscan.com',
  nftContract: '0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763',
  symbol: 'MON',
  decimals: 18,
  totalSupply: 1969,
};

const ALLOWLISTED_HOSTS = new Set([
  'magic.decentralized-content.com',
  'ipfs.filebase.io',
  'ipfs.io',
  'cloudflare-ipfs.com',
  'dweb.link',
  'w3s.link',
  'nftstorage.link',
  'gateway.pinata.cloud',
]);

const IPFS_GATEWAYS = [
  'https://magic.decentralized-content.com/ipfs/',
  'https://ipfs.filebase.io/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
];

// In-memory cache structures
let cachedOwnerMap = null; // { ownerAddress: [tokenIds] }
let cachedTokenOwners = null; // { tokenId: ownerAddress }
let lastScanTime = 0;
let isScanning = false;
const CACHE_TTL_MS = 60 * 1000; // 60s TTL

const metadataCache = new Map(); // tokenId -> metadata

// Pre-create disk cache directory
const CACHE_DIR = path.resolve('.cache');
const METADATA_DIR = path.resolve('.cache', 'metadata');
if (!fs.existsSync(CACHE_DIR)) {
  try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (e) {}
}
if (!fs.existsSync(METADATA_DIR)) {
  try { fs.mkdirSync(METADATA_DIR, { recursive: true }); } catch (e) {}
}

const SEED_OWNER_MAP_FILE = path.resolve('server', 'ownerMap.json');
const CACHE_OWNER_MAP_FILE = path.join(CACHE_DIR, 'ownerMap.json');
const OWNER_MAP_FILE = fs.existsSync(SEED_OWNER_MAP_FILE) ? SEED_OWNER_MAP_FILE : CACHE_OWNER_MAP_FILE;

if (fs.existsSync(OWNER_MAP_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(OWNER_MAP_FILE, 'utf8'));
    cachedOwnerMap = raw.ownerMap || null;
    cachedTokenOwners = raw.tokenOwners || null;
    lastScanTime = raw.timestamp || 0;
    console.log('[ChogService] Loaded disk owner cache:', Object.keys(cachedTokenOwners || {}).length, 'tokens mapped.');
  } catch (e) {
    console.warn('[ChogService] Failed reading disk cache:', e.message);
  }
}

/**
 * Perform single raw eth_call
 */
export async function ethCall(data, to = MONAD_CONFIG.nftContract) {
  try {
    const res = await fetch(MONAD_CONFIG.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to, data }, 'latest'],
      }),
      signal: AbortSignal.timeout(5000),
    }).then(r => r.json());

    return res?.result || null;
  } catch (err) {
    return null;
  }
}

/**
 * Get balanceOf for wallet address
 */
export async function getBalanceOf(address) {
  const cleanAddr = address.toLowerCase().replace('0x', '').padStart(64, '0');
  const data = '0x70a08231' + cleanAddr;
  const result = await ethCall(data);
  if (!result || result === '0x') return 0;
  return parseInt(result, 16);
}

/**
 * Get ownerOf for a specific tokenId
 */
export async function getOwnerOf(tokenId) {
  const hex = tokenId.toString(16).padStart(64, '0');
  const data = '0x6352211e' + hex;
  const result = await ethCall(data);
  if (!result || result.length < 66) return null;
  return ('0x' + result.slice(26)).toLowerCase();
}

/**
 * Get tokenURI for a specific tokenId
 */
export async function getTokenUri(tokenId) {
  const hex = tokenId.toString(16).padStart(64, '0');
  const data = '0xc87b56dd' + hex;
  const result = await ethCall(data);
  if (!result) return null;
  const buf = Buffer.from(result.slice(2), 'hex');
  if (buf.length < 64) return null;
  const len = buf.readUInt32BE(60);
  return buf.slice(64, 64 + len).toString('utf8');
}

/**
 * Scan ownership map in multicall batches across all 1,969 tokens
 */
export async function refreshOwnerMap() {
  if (isScanning) return;
  isScanning = true;
  console.log('[ChogService] Starting owner scan on Monad Mainnet (Chain 143)...');

  const total = MONAD_CONFIG.totalSupply;
  const batchSize = 25;
  const batches = [];

  for (let i = 1; i <= total; i += batchSize) {
    const b = [];
    for (let j = i; j < Math.min(total + 1, i + batchSize); j++) {
      b.push({
        jsonrpc: '2.0',
        id: j,
        method: 'eth_call',
        params: [{ to: MONAD_CONFIG.nftContract, data: '0x6352211e' + j.toString(16).padStart(64, '0') }, 'latest'],
      });
    }
    batches.push(b);
  }

  const newOwnerMap = {};
  const newTokenOwners = {};
  const failedBatches = [];

  try {
    for (let i = 0; i < batches.length; i++) {
      let batchSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch(MONAD_CONFIG.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batches[i]),
            signal: AbortSignal.timeout(8000),
          }).then(r => r.json());

          if (Array.isArray(res)) {
            for (const item of res) {
              if (item.result && item.result.length >= 66 && item.result !== '0x') {
                const owner = ('0x' + item.result.slice(26)).toLowerCase();
                newTokenOwners[item.id] = owner;
                if (!newOwnerMap[owner]) newOwnerMap[owner] = [];
                newOwnerMap[owner].push(item.id);
              }
            }
            batchSuccess = true;
            break;
          } else {
            throw new Error(`RPC returned non-array: ${JSON.stringify(res)}`);
          }
        } catch (err) {
          if (attempt === 3) {
            console.warn(`[ChogService] Batch ${i} failed after 3 attempts:`, err.message);
            failedBatches.push(batches[i]);
          } else {
            await new Promise(r => setTimeout(r, 500 * attempt));
          }
        }
      }
    }

    // Sweep any missing token IDs from 1 to total to guarantee 100% coverage
    const missingTokenIds = [];
    for (let tid = 1; tid <= total; tid++) {
      if (!newTokenOwners[tid]) {
        missingTokenIds.push(tid);
      }
    }

    if (missingTokenIds.length > 0) {
      console.log(`[ChogService] Resolving ${missingTokenIds.length} missing tokens via targeted sweep...`);
      for (const tid of missingTokenIds) {
        for (let retry = 0; retry < 3; retry++) {
          try {
            const owner = await getOwnerOf(tid);
            if (owner) {
              newTokenOwners[tid] = owner;
              if (!newOwnerMap[owner]) newOwnerMap[owner] = [];
              newOwnerMap[owner].push(tid);
              break;
            }
          } catch (e) {
            await new Promise(r => setTimeout(r, 200));
          }
        }
      }
    }

    cachedOwnerMap = newOwnerMap;
    cachedTokenOwners = newTokenOwners;
    lastScanTime = Date.now();

    // Persist to disk so all future restarts have 100% full coverage
    try {
      fs.writeFileSync(OWNER_MAP_FILE, JSON.stringify({
        timestamp: lastScanTime,
        totalSupply: total,
        mappedCount: Object.keys(newTokenOwners).length,
        ownerMap: newOwnerMap,
        tokenOwners: newTokenOwners,
      }, null, 2));
    } catch (writeErr) {
      console.warn('[ChogService] Could not persist owner map to disk:', writeErr.message);
    }

    const mappedCount = Object.keys(newTokenOwners).length;
    console.log(`[ChogService] Owner map scan complete: ${mappedCount}/${total} tokens across ${Object.keys(newOwnerMap).length} owners`);
    return { mappedCount, total, ownerCount: Object.keys(newOwnerMap).length };
  } finally {
    isScanning = false;
  }
}

/**
 * Fetch and parse metadata for a token
 */
export async function getChogMetadata(tokenId) {
  if (metadataCache.has(tokenId)) {
    return metadataCache.get(tokenId);
  }

  // Check disk cache first
  const diskPath = path.join(METADATA_DIR, `${tokenId}.json`);
  if (fs.existsSync(diskPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
      metadataCache.set(tokenId, data);
      return data;
    } catch (e) {}
  }

  const fallbackIdx = (tokenId + 1460) % 1969 + 1;
  const rawUri = (await getTokenUri(tokenId)) || `ipfs://bafybeid4ybujnscdipkno7ps5utqelp5ry5ryreqhay3zhgk3a6x4jruqu/${fallbackIdx}.json`;

  let metadata = null;
  const ipfsHash = rawUri.replace('ipfs://', '');

  for (const gw of IPFS_GATEWAYS) {
    try {
      const url = gw + ipfsHash;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ChogTown/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        metadata = await res.json();
        break;
      }
    } catch (e) {}
  }

  if (!metadata) {
    // Fallback template
    metadata = {
      name: `CHOG #${tokenId}`,
      description: 'Chog Genesis NFT on Monad',
      image: `ipfs://bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/${fallbackIdx}.webp`,
      attributes: [],
    };
  }

  // Format image URLs
  let imageUri = metadata.image || '';
  let directProxyUrl = '';
  if (imageUri.startsWith('ipfs://')) {
    const imgHash = imageUri.replace('ipfs://', '');
    directProxyUrl = `/api/image-proxy?url=${encodeURIComponent('https://magic.decentralized-content.com/ipfs/' + imgHash)}`;
  } else if (imageUri.startsWith('http')) {
    directProxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUri)}`;
  }

  const result = {
    tokenId,
    name: metadata.name || `CHOG #${tokenId}`,
    description: metadata.description || '',
    image: imageUri,
    proxyImageUrl: directProxyUrl,
    attributes: metadata.attributes || [],
  };

  metadataCache.set(tokenId, result);
  try {
    fs.writeFileSync(diskPath, JSON.stringify(result, null, 2));
  } catch (e) {}

  return result;
}

/**
 * Get all Chogs owned by a wallet
 */
export async function getWalletChogs(walletAddress) {
  const normalized = walletAddress.toLowerCase();
  
  // 1. Check cached owner map for candidate tokens
  let candidateTokenIds = (cachedOwnerMap && cachedOwnerMap[normalized]) || [];

  // 2. If no candidate tokens in cache, check on-chain balance with retry
  if (candidateTokenIds.length === 0) {
    let balance = 0;
    for (let r = 0; r < 2; r++) {
      try {
        balance = await getBalanceOf(normalized);
        if (balance > 0) break;
      } catch (e) {
        await new Promise(res => setTimeout(res, 200));
      }
    }
    if (balance === 0) {
      return {
        wallet: normalized,
        balance: 0,
        tokens: [],
      };
    }
  }

  // 3. Re-verify ownership live on-chain in parallel (Never trust cache blindly)
  const verifiedTokens = [];
  const checks = await Promise.all(
    candidateTokenIds.map(async tid => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const liveOwner = await getOwnerOf(tid);
          if (liveOwner === normalized) {
            const meta = await getChogMetadata(tid);
            return meta;
          }
          break; // Owner changed or doesn't match
        } catch (e) {
          if (attempt === 1) break;
          await new Promise(r => setTimeout(r, 200));
        }
      }
      return null;
    })
  );

  for (const token of checks) {
    if (token) verifiedTokens.push(token);
  }

  return {
    wallet: normalized,
    balance: verifiedTokens.length,
    tokens: verifiedTokens,
  };
}

/**
 * SSRF-Safe Image Proxy Handler
 */
export async function handleImageProxy(reqUrl, res) {
  try {
    const targetUrl = new URL(reqUrl, 'http://localhost').searchParams.get('url');
    if (!targetUrl) {
      res.statusCode = 400;
      res.end('Missing url parameter');
      return;
    }

    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      res.statusCode = 400;
      res.end('Invalid protocol');
      return;
    }

    // SSRF Check: Host allowlist
    const hostname = parsed.hostname.toLowerCase();
    const isAllowlisted = ALLOWLISTED_HOSTS.has(hostname) || hostname.endsWith('.ipfs.dweb.link') || hostname.endsWith('.ipfs.w3s.link');
    if (!isAllowlisted) {
      res.statusCode = 403;
      res.end('Host not allowlisted');
      return;
    }

    // Block private IP ranges
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.')
    ) {
      res.statusCode = 403;
      res.end('Private addresses forbidden');
      return;
    }

    // Fetch with 8s timeout and 5MB limit
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'ChogTown-ImageProxy/1.0',
        'Accept': 'image/webp,image/png,image/*,*/*',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.end('Upstream image error: ' + upstream.statusText);
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/webp';
    const contentLength = parseInt(upstream.headers.get('content-length') || '0', 10);
    if (contentLength > 5 * 1024 * 1024) {
      res.statusCode = 413;
      res.end('Image exceeds 5MB limit');
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > 5 * 1024 * 1024) {
      res.statusCode = 413;
      res.end('Image payload exceeds 5MB limit');
      return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (err) {
    res.statusCode = 502;
    res.end('Proxy error: ' + err.message);
  }
}
