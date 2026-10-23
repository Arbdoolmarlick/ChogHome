// scripts/test_siwe_security.mjs
// Proof of EIP-4361 SIWE Security, Nonce Replay Prevention, Expiry, and Ownership Enforcement

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { SiweMessage } from 'siwe';

const BASE_URL = 'http://localhost:3001';

async function testSecurity() {
  console.log('======================================================================');
  console.log('🔒 EIP-4361 SIWE SECURITY & ACCESS CONTROL COMPREHENSIVE TEST SUITE');
  console.log('======================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`Test assertion failed: ${message}`);
    }
    passedTests++;
    console.log(`✅ PASS: ${message}`);
  }

  // Generate test accounts
  const testAccount = privateKeyToAccount(generatePrivateKey());
  const attackerAccount = privateKeyToAccount(generatePrivateKey());
  console.log(`Test Account Address:     ${testAccount.address}`);
  console.log(`Attacker Account Address: ${attackerAccount.address}\n`);

  // TEST 1: Unauthenticated access without session token
  console.log('--- TEST 1: Unauthenticated request to /api/chog/spawn ---');
  const unauthRes = await fetch(`${BASE_URL}/api/chog/spawn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: testAccount.address, tokenId: 1 }),
  });
  const unauthData = await unauthRes.json();
  assert(unauthRes.status === 401, 'Request without session token returns HTTP 401');
  assert(unauthData.error && unauthData.error.includes('SIWE session token required'), 'Error explicitly states SIWE session token required');

  // TEST 2: Request with fake / forged session token
  console.log('\n--- TEST 2: Request with forged session token ---');
  const fakeTokenRes = await fetch(`${BASE_URL}/api/chog/spawn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer siwe_000000000000000000000000fakeforgedtoken1234567890',
    },
    body: JSON.stringify({ wallet: testAccount.address, tokenId: 1 }),
  });
  const fakeTokenData = await fakeTokenRes.json();
  assert(fakeTokenRes.status === 401, 'Request with forged session token returns HTTP 401');
  assert(fakeTokenData.error && fakeTokenData.error.includes('Invalid or expired session token'), 'Error rejects invalid session token');

  // TEST 3: Submit empty payload to verify-signature
  console.log('\n--- TEST 3: Submit empty payload to /api/auth/verify-signature ---');
  const emptyRes = await fetch(`${BASE_URL}/api/auth/verify-signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(emptyRes.status === 400, 'Empty auth request returns HTTP 400');

  // TEST 4: Fetch genuine SIWE nonce from server
  console.log('\n--- TEST 4: Fetch cryptographic SIWE nonce ---');
  const nonceRes = await fetch(`${BASE_URL}/api/auth/nonce`);
  const { nonce } = await nonceRes.json();
  assert(nonceRes.status === 200, 'Nonce endpoint returns HTTP 200');
  assert(typeof nonce === 'string' && nonce.length >= 8, `Valid nonce generated: "${nonce}"`);

  // TEST 5: Construct and cryptographically sign valid EIP-4361 SIWE message
  console.log('\n--- TEST 5: Sign and authenticate valid SIWE message ---');
  const siweMessage = new SiweMessage({
    domain: 'localhost',
    address: testAccount.address,
    statement: 'Sign in to Chog Town on Monad Mainnet',
    uri: 'http://localhost:5173',
    version: '1',
    chainId: 143, // Monad Mainnet
    nonce: nonce,
    issuedAt: new Date().toISOString(),
  });
  const messageText = siweMessage.prepareMessage();
  const signature = await testAccount.signMessage({ message: messageText });

  const authRes = await fetch(`${BASE_URL}/api/auth/verify-signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: messageText, signature }),
  });
  const authData = await authRes.json();
  assert(authRes.status === 200, 'Valid SIWE signature returns HTTP 200 OK');
  assert(authData.success === true, 'Response contains success: true');
  assert(authData.sessionToken && authData.sessionToken.startsWith('siwe_'), `Valid session token issued: ${authData.sessionToken.slice(0, 16)}...`);
  assert(authData.address.toLowerCase() === testAccount.address.toLowerCase(), 'Authenticated address matches signer');
  const validSessionToken = authData.sessionToken;

  // TEST 6: Replay Attack Prevention (Re-submitting the exact same signature)
  console.log('\n--- TEST 6: Nonce replay attack prevention ---');
  const replayRes = await fetch(`${BASE_URL}/api/auth/verify-signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: messageText, signature }),
  });
  const replayData = await replayRes.json();
  assert(replayRes.status === 401, 'Replayed signature rejected with HTTP 401');
  assert(replayData.error && replayData.error.includes('Invalid or replayed nonce'), 'Replayed nonce correctly identified as consumed/invalid');

  // TEST 7: Expired Message Rejection
  console.log('\n--- TEST 7: Expired SIWE message rejection ---');
  const nonce2Res = await fetch(`${BASE_URL}/api/auth/nonce`);
  const { nonce: nonce2 } = await nonce2Res.json();
  const expiredMessage = new SiweMessage({
    domain: 'localhost',
    address: testAccount.address,
    statement: 'Expired session test',
    uri: 'http://localhost:5173',
    version: '1',
    chainId: 143,
    nonce: nonce2,
    issuedAt: new Date(Date.now() - 600000).toISOString(),
    expirationTime: new Date(Date.now() - 300000).toISOString(), // expired 5 mins ago
  });
  const expiredText = expiredMessage.prepareMessage();
  const expiredSig = await testAccount.signMessage({ message: expiredText });

  const expiredRes = await fetch(`${BASE_URL}/api/auth/verify-signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: expiredText, signature: expiredSig }),
  });
  const expiredData = await expiredRes.json();
  assert(expiredRes.status === 401, 'Expired SIWE message rejected with HTTP 401');
  assert(expiredData.error && expiredData.error.includes('expired'), 'Error message confirms message expiration');

  // TEST 8: Session wallet impersonation / target mismatch
  console.log('\n--- TEST 8: Session wallet impersonation prevention ---');
  // Attacker attempts to use their valid session token to spawn as testAccount
  const impRes = await fetch(`${BASE_URL}/api/chog/spawn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${validSessionToken}`,
    },
    body: JSON.stringify({ wallet: attackerAccount.address, tokenId: 1 }),
  });
  const impData = await impRes.json();
  assert(impRes.status === 403, 'Session wallet mismatch rejected with HTTP 403');
  assert(impData.error && impData.error.includes('Session authorization mismatch'), 'Rejection reasons session authorization mismatch');

  // TEST 9: Ownership check on Monad Mainnet contract
  console.log('\n--- TEST 9: Spawning a token not owned by the session wallet ---');
  // testAccount does not own Token 1 on Monad Mainnet
  const ownRes = await fetch(`${BASE_URL}/api/chog/spawn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${validSessionToken}`,
    },
    body: JSON.stringify({ wallet: testAccount.address, tokenId: 1 }),
  });
  const ownData = await ownRes.json();
  assert(ownRes.status === 403, 'Non-owner spawn attempt rejected with HTTP 403');
  assert(ownData.error && ownData.error.includes('Ownership verification failed'), 'Error explicitly states ownership verification failed on Monad Mainnet');

  console.log('\n======================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} SIWE & ACCESS CONTROL SECURITY TESTS PASSED!`);
  console.log('======================================================================');
}

testSecurity().catch(err => {
  console.error('\n❌ Security test failed with uncaught error:', err);
  process.exit(1);
});
