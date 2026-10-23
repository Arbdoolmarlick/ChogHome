// server/index.js
// Production Express Backend for Chog Town (Monad Mainnet Chain 143)

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import {
  getWalletChogs,
  getChogMetadata,
  handleImageProxy,
  refreshOwnerMap,
  getOwnerOf,
  MONAD_CONFIG
} from './chogService.js';
import { convertChogToPixelSprite, PIPELINE_VERSION } from './pixelConverter.js';
import { getUnmappedTraitsReport } from './unmappedTraits.js';
import { createNonce, verifySiweMessage, requireSessionAuth } from './siweAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const SPRITES_CACHE_DIR = path.resolve(ROOT_DIR, '.cache', 'sprites');
const STATIC_SPRITES_DIR = path.resolve(ROOT_DIR, 'public', 'assets', 'chogs', 'sprites');
const STATIC_PORTRAITS_DIR = path.resolve(ROOT_DIR, 'public', 'assets', 'chogs', 'portraits');

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase cloud persistence client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
  console.log('[Server] Supabase cloud storage client initialized.');
} else {
  console.log('[Server] Running in local persistent storage mode (Supabase credentials optional).');
}

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    network: MONAD_CONFIG.name,
    chainId: MONAD_CONFIG.chainId,
    contract: MONAD_CONFIG.nftContract,
    totalSupply: MONAD_CONFIG.totalSupply,
    pipelineVersion: PIPELINE_VERSION,
    supabaseConnected: !!supabase,
    timestamp: Date.now(),
  });
});

// 2. Image Proxy (SSRF safe)
app.get('/api/image-proxy', async (req, res) => {
  await handleImageProxy(req.url, res);
});

// 3. Auto-Pixel Sprite API (Static Asset -> Disk Cache -> Live Converter)
app.get('/api/chog/:tokenId/sprite', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId, 10);
    if (isNaN(tokenId) || tokenId < 1 || tokenId > MONAD_CONFIG.totalSupply) {
      return res.status(400).json({ error: `Token ID must be between 1 and ${MONAD_CONFIG.totalSupply}` });
    }

    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    // 1. Static pre-generated asset fast-path (instant, zero IPFS)
    const staticSpriteFile = path.resolve(STATIC_SPRITES_DIR, `${tokenId}.json`);
    if (fs.existsSync(staticSpriteFile)) {
      return res.sendFile(staticSpriteFile);
    }

    // 2. Disk cache fast-path
    const cacheFile = path.resolve(SPRITES_CACHE_DIR, `${tokenId}_${PIPELINE_VERSION}.json`);
    if (fs.existsSync(cacheFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (cached && cached.status === 'ok') {
          return res.json(cached);
        }
      } catch (e) {}
    }

    const spriteData = await convertChogToPixelSprite(tokenId);
    res.json(spriteData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Auto-Pixel Portrait PNG (Static Asset -> Disk Cache -> Live Converter)
app.get('/api/chog/:tokenId/portrait', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId, 10);
    if (isNaN(tokenId) || tokenId < 1 || tokenId > MONAD_CONFIG.totalSupply) {
      return res.status(400).send('Invalid token ID');
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    // 1. Static pre-generated asset fast-path (<5ms)
    const staticPortraitFile = path.resolve(STATIC_PORTRAITS_DIR, `${tokenId}.png`);
    if (fs.existsSync(staticPortraitFile)) {
      return fs.createReadStream(staticPortraitFile).pipe(res);
    }

    // 2. Disk cache fast-path
    const portraitFile = path.resolve(SPRITES_CACHE_DIR, `${tokenId}_${PIPELINE_VERSION}_portrait.png`);
    if (fs.existsSync(portraitFile)) {
      return fs.createReadStream(portraitFile).pipe(res);
    }

    // 3. Live converter fallback
    await convertChogToPixelSprite(tokenId);
    if (fs.existsSync(portraitFile)) {
      return fs.createReadStream(portraitFile).pipe(res);
    }

    res.status(404).send('Portrait not found');
  } catch (err) {
    res.status(500).send('Portrait error: ' + err.message);
  }
});

// 5. Wallet Chogs Discovery
app.get('/api/wallet/:address/chogs', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum/Monad wallet address format' });
    }

    const data = await getWalletChogs(address);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Single Chog Metadata
app.get('/api/chog/:tokenId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId, 10);
    const data = await getChogMetadata(tokenId);
    if (!data) return res.status(404).json({ error: 'Token not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Unmapped traits report
app.get('/api/admin/unmapped-traits', (req, res) => {
  res.json(getUnmappedTraitsReport());
});

// 8A. Generate Cryptographic SIWE Nonce
app.get('/api/auth/nonce', (req, res) => {
  const nonce = createNonce();
  res.json({ nonce });
});

// 8B. Sign-In Verification (Real EIP-4361 SIWE)
app.post('/api/auth/verify-signature', async (req, res) => {
  try {
    const result = await verifySiweMessage(req.body || {});
    if (!result.success) {
      return res.status(result.status || 401).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Authentication error: ' + err.message });
  }
});

// 9. Server-side ownership & session verification for Spawn & Nudges
app.post('/api/chog/spawn', requireSessionAuth, async (req, res) => {
  const { wallet, tokenId } = req.body || {};
  if (!wallet || !tokenId) {
    return res.status(400).json({ error: 'wallet and tokenId are required' });
  }

  const tid = parseInt(tokenId, 10);
  const normalizedWallet = wallet.toLowerCase();

  // 1. Session wallet must match request wallet
  if (req.sessionWallet !== normalizedWallet) {
    return res.status(403).json({
      error: 'Session authorization mismatch: session wallet does not match target wallet',
      sessionWallet: req.sessionWallet,
      targetWallet: normalizedWallet,
    });
  }

  // 2. Re-verify strictly on Monad Mainnet chain 143
  const currentOwner = await getOwnerOf(tid);
  if (!currentOwner || currentOwner !== req.sessionWallet) {
    console.warn(`[Security Alert] Session wallet ${req.sessionWallet} attempted to spawn Chog #${tid} owned by ${currentOwner}!`);
    return res.status(403).json({
      error: 'Ownership verification failed: You do not own this Chog on Monad Mainnet',
      currentOwner: currentOwner || 'none',
      sessionWallet: req.sessionWallet,
    });
  }

  console.log(`[Spawn] Verified ownership for Token #${tid} by session wallet ${req.sessionWallet}`);
  res.json({
    success: true,
    message: "I'm home!",
    tokenId: tid,
    owner: req.sessionWallet,
    spawnPosition: { x: 500, y: 380 },
  });
});

app.post('/api/chog/nudge', requireSessionAuth, async (req, res) => {
  const { wallet, tokenId, targetCitizen } = req.body || {};
  if (!wallet || !tokenId) {
    return res.status(400).json({ error: 'wallet and tokenId are required' });
  }

  const tid = parseInt(tokenId, 10);
  const normalizedWallet = wallet.toLowerCase();

  if (req.sessionWallet !== normalizedWallet) {
    return res.status(403).json({ error: 'Session wallet mismatch' });
  }

  // Re-verify strictly on Monad Mainnet chain 143
  const currentOwner = await getOwnerOf(tid);
  if (!currentOwner || currentOwner !== req.sessionWallet) {
    return res.status(403).json({
      error: 'Ownership verification failed: You do not own this Chog',
    });
  }

  res.json({
    success: true,
    nudgeFrom: tid,
    targetCitizen: targetCitizen || 'TownResident',
    action: 'nudge_bubble',
    timestamp: Date.now(),
  });
});

// Serve frontend assets from dist in production
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

export default app;

// Start server
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Chog Town Backend listening on port ${PORT}`);
    console.log(`📡 Monad Mainnet Chain ID: ${MONAD_CONFIG.chainId} | Contract: ${MONAD_CONFIG.nftContract}`);
    // Initial background refresh if needed
    refreshOwnerMap().catch(err => console.warn('[Server] Initial owner map refresh error:', err.message));
  });
}
