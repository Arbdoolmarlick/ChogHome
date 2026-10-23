// server/siweAuth.js
// Enterprise SIWE (EIP-4361) Authentication Engine for Chog Town (Monad Mainnet Chain 143)
import crypto from 'crypto';
import { SiweMessage, generateNonce } from 'siwe';
import { MONAD_CONFIG } from './chogService.js';

// Active nonces store: nonce -> { createdAt }
const activeNonces = new Map();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Active sessions store: sessionToken -> { address, expiresAt }
const activeSessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup interval for stale nonces & sessions
setInterval(() => {
  const now = Date.now();
  for (const [nonce, data] of activeNonces.entries()) {
    if (now - data.createdAt > NONCE_TTL_MS) activeNonces.delete(nonce);
  }
  for (const [token, data] of activeSessions.entries()) {
    if (now > data.expiresAt) activeSessions.delete(token);
  }
}, 60 * 1000);

/**
 * Generate a cryptographically secure SIWE nonce
 */
export function createNonce() {
  const nonce = generateNonce();
  activeNonces.set(nonce, { createdAt: Date.now() });
  return nonce;
}

/**
 * Verify full EIP-4361 SIWE message, check expiry, chain ID 143, and consume nonce (prevent replay)
 */
export async function verifySiweMessage({ message, signature }) {
  if (!message || !signature) {
    return { success: false, status: 400, error: 'Missing message or signature' };
  }

  let siweMsg;
  try {
    siweMsg = new SiweMessage(message);
  } catch (parseErr) {
    return { success: false, status: 400, error: 'Invalid SIWE message structure: ' + parseErr.message };
  }

  // 1. Validate Chain ID is Monad Mainnet (143)
  if (siweMsg.chainId !== MONAD_CONFIG.chainId) {
    return { success: false, status: 400, error: `Invalid chainId: expected ${MONAD_CONFIG.chainId} (Monad Mainnet), got ${siweMsg.chainId}` };
  }

  // 2. Validate Nonce exists (has not been consumed)
  const nonceEntry = activeNonces.get(siweMsg.nonce);
  if (!nonceEntry) {
    return { success: false, status: 401, error: 'Invalid or replayed nonce' };
  }

  // 3. Validate Nonce TTL
  if (Date.now() - nonceEntry.createdAt > NONCE_TTL_MS) {
    activeNonces.delete(siweMsg.nonce);
    return { success: false, status: 401, error: 'Nonce has expired' };
  }

  // 4. Validate Message Expiration Time
  if (siweMsg.expirationTime) {
    const expTime = new Date(siweMsg.expirationTime).getTime();
    if (Date.now() > expTime) {
      activeNonces.delete(siweMsg.nonce);
      return { success: false, status: 401, error: 'SIWE message has expired' };
    }
  }

  // 5. Verify Cryptographic Signature
  try {
    const verifyResult = await siweMsg.verify({
      signature,
      nonce: siweMsg.nonce,
    });

    if (!verifyResult.success) {
      return { success: false, status: 401, error: 'Cryptographic signature verification failed' };
    }

    // 6. CONSUME NONCE (Single use: strictly prevents replay attacks)
    activeNonces.delete(siweMsg.nonce);

    // 7. Issue cryptographically secure session token
    const sessionToken = 'siwe_' + crypto.randomBytes(32).toString('hex');
    const walletAddress = siweMsg.address.toLowerCase();

    activeSessions.set(sessionToken, {
      address: walletAddress,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return {
      success: true,
      sessionToken,
      address: walletAddress,
      chainId: siweMsg.chainId,
    };
  } catch (verifyErr) {
    return { success: false, status: 401, error: 'Verification error: ' + verifyErr.message };
  }
}

/**
 * Express middleware requiring a valid active SIWE session token
 */
export function requireSessionAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-session-token'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (customHeader) {
    token = String(customHeader).trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: SIWE session token required' });
  }

  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return res.status(401).json({ error: 'Unauthorized: Session has expired' });
  }

  req.sessionWallet = session.address;
  next();
}

/**
 * Helper to inspect active session count (for telemetry/testing)
 */
export function getActiveSessionCount() {
  return activeSessions.size;
}
