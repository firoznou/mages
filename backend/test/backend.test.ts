import { hashPassword, verifyPassword, generateSessionToken } from '../src/auth.ts';
import { selectVerifiableWinners } from '../src/winner_selector.ts';
import type { CandidateEntry } from '../src/winner_selector.ts';
import { generateNonce, createSiweMessage, parseSiweMessage } from '../src/siwe.ts';
import { db } from '../src/db.ts';
import { handleAgenticVerify, type Env } from '../src/handlers.ts';
import { encodeFunctionResult, parseAbi } from 'viem';
import { SPACE_ID_AGENT_ID_REGISTRY } from '../src/agent_id.ts';

async function runBackendTests() {
  console.log('--- Running Backend & D1 Logic Tests ---');

  // Test 1: Password Hashing & Verification
  const pass = 'WeZardsMagic#2026';
  const hashed = await hashPassword(pass);
  console.log('[Test 1] Password hashed:', hashed.slice(0, 32) + '...');
  const isValid = await verifyPassword(pass, hashed);
  const isInvalid = await verifyPassword('WrongPassword', hashed);

  if (!isValid || isInvalid) {
    throw new Error('Test 1 Failed: Password verification logic error');
  }
  console.log('[Test 1 PASS] Password hashing and verification passed!');

  // Test 2: Session Token Generation
  const token1 = generateSessionToken();
  const token2 = generateSessionToken();
  if (token1 === token2 || token1.length !== 64) {
    throw new Error('Test 2 Failed: Session token uniqueness/length error');
  }
  console.log('[Test 2 PASS] Session token generator passed!');

  // Test 3: Verifiable Random Winner Selection (Exactly 1000 or N)
  const candidates: CandidateEntry[] = [];
  for (let i = 1; i <= 1200; i++) {
    candidates.push({
      submission_id: `sub_${i}`,
      wallet_address: `0x${i.toString(16).padStart(40, '0')}`
    });
  }

  const seed = '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
  const result = await selectVerifiableWinners(candidates, seed, 1000);

  if (result.totalSelected !== 1000) {
    throw new Error(`Test 3 Failed: Expected 1000 winners, got ${result.totalSelected}`);
  }

  // Verify uniqueness (No duplicates)
  const winnerWallets = new Set(result.winners.map(w => w.wallet_address));
  if (winnerWallets.size !== 1000) {
    throw new Error('Test 3 Failed: Duplicate winners detected in selection!');
  }

  // Verify determinism (Same seed must produce identical order)
  const result2 = await selectVerifiableWinners(candidates, seed, 1000);
  for (let i = 0; i < 1000; i++) {
    if (result.winners[i].wallet_address !== result2.winners[i].wallet_address) {
      throw new Error(`Test 3 Failed: Determinism check failed at index ${i}`);
    }
  }
  console.log('[Test 3 PASS] Verifiable winner selection passed all constraints!');

  // Test 4: SIWE Nonce Generation & Message Parsing
  const wallet = '0x1234567890123456789012345678901234567890';
  const nonce = generateNonce();
  const siweMsg = createSiweMessage({
    domain: 'wezards.io',
    address: wallet,
    uri: 'https://wezards.io',
    version: '1',
    chainId: 56,
    nonce,
    issuedAt: new Date().toISOString()
  });

  const parsed = parseSiweMessage(siweMsg);
  if (parsed.address?.toLowerCase() !== wallet.toLowerCase() || parsed.nonce !== nonce) {
    throw new Error('Test 4 Failed: SIWE message parsing mismatch');
  }
  console.log('[Test 4 PASS] SIWE nonce generation and parsing passed!');

  // Test 5: In-Memory / PostgreSQL DB Sessions
  const sessionToken = generateSessionToken();
  db.createSession(wallet, sessionToken, 56, 24);
  const validSession = db.validateSession(sessionToken);
  if (!validSession || validSession.wallet_address !== wallet.toLowerCase()) {
    throw new Error('Test 5 Failed: DB session validation failed');
  }
  console.log('[Test 5 PASS] DB user and session management passed!');

  const registryAbi = parseAbi([
    'function handleOf(address owner) view returns (string)'
  ]);
  const agentIdWallet = '0x0000000000000000000000000000000000001234';
  const env: Env = {
    ENVIRONMENT: 'test',
    CHAIN_ID: 56,
    MAX_WINNERS_TARGET: 1000,
    BNB_PRICE_USD_SNAPSHOT: 600,
    BSC_RPC_URL: 'https://rpc.test.invalid',
    SPACE_ID_AGENT_ID_REGISTRY
  };

  async function verifyWithRegistry(handle: string, chainId = '0x38') {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      const request = JSON.parse(String(init?.body)) as { id: number; method: string };
      const result = request.method === 'eth_chainId'
        ? chainId
        : encodeFunctionResult({
            abi: registryAbi,
            functionName: 'handleOf',
            result: handle
          });
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result
      }), { headers: { 'Content-Type': 'application/json' } });
    };

    try {
      return await handleAgenticVerify(
        new Request(`https://api.test/api/agentic/verify?wallet=${agentIdWallet}`),
        env
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  const verifiedResponse = await verifyWithRegistry('registered-agent');
  const verifiedResult = await verifiedResponse.json() as { eligible: boolean; handle: string; signature?: string };
  if (verifiedResponse.status !== 200 || !verifiedResult.eligible ||
      verifiedResult.handle !== 'registered-agent' || 'signature' in verifiedResult) {
    throw new Error('Test 6 Failed: Agent ID owner should be verified from registry without a signature');
  }
  console.log('[Test 6 PASS] Agent ID owner verified against on-chain registry');

  const unverifiedResponse = await verifyWithRegistry('');
  const unverifiedResult = await unverifiedResponse.json() as { eligible: boolean; handle: string | null };
  if (unverifiedResponse.status !== 200 || unverifiedResult.eligible || unverifiedResult.handle !== null) {
    throw new Error('Test 7 Failed: Wallet without an Agent ID must not be eligible');
  }
  console.log('[Test 7 PASS] Wallet without Agent ID is ineligible');

  const wrongChainResponse = await verifyWithRegistry('registered-agent', '0x61');
  if (wrongChainResponse.status !== 503) {
    throw new Error('Test 8 Failed: Registry verification must reject a non-mainnet RPC');
  }
  console.log('[Test 8 PASS] Agent ID verification rejects non-mainnet RPC');

  const invalidWalletResponse = await handleAgenticVerify(
    new Request('https://api.test/api/agentic/verify?wallet=not-an-address'),
    env
  );
  if (invalidWalletResponse.status !== 400) {
    throw new Error('Test 9 Failed: Invalid wallet address must be rejected');
  }
  console.log('[Test 9 PASS] Invalid wallet address is rejected');

  console.log('--------------------------------------------------');
  console.log('All Backend Logic Unit Tests PASSED Successfully!');
  console.log('--------------------------------------------------');
}

runBackendTests().catch(err => {
  console.error(err);
  process.exit(1);
});
