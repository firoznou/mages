import { hashPassword, verifyPassword, generateSessionToken } from '../src/auth.ts';
import { selectVerifiableWinners } from '../src/winner_selector.ts';
import type { CandidateEntry } from '../src/winner_selector.ts';

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
  // Let's create 1,200 simulated candidates
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

  // Test 4: Less than 1,000 eligible participants
  const smallCandidates: CandidateEntry[] = [
    { submission_id: 'sub_a', wallet_address: '0x0001' },
    { submission_id: 'sub_b', wallet_address: '0x0002' }
  ];
  const smallResult = await selectVerifiableWinners(smallCandidates, seed, 1000);
  if (smallResult.totalSelected !== 2) {
    throw new Error(`Test 4 Failed: Expected 2 winners when only 2 exist, got ${smallResult.totalSelected}`);
  }
  console.log('[Test 3 & 4 PASS] Verifiable winner selection passed all constraints!');

  console.log('--------------------------------------------------');
  console.log('All Backend Logic Unit Tests PASSED Successfully!');
  console.log('--------------------------------------------------');
}

runBackendTests().catch(err => {
  console.error('[Test Error]', err);
  process.exit(1);
});
