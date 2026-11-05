/**
 * Verifiable Random Winner Selection System
 * Deterministic Fisher-Yates shuffle using cryptographically hashed seed.
 */

export class VerifiableRandomGenerator {
  private currentHash: Uint8Array;
  private offset: number = 0;

  constructor(seedHex: string) {
    const cleanSeed = seedHex.startsWith('0x') ? seedHex.slice(2) : seedHex;
    this.currentHash = new Uint8Array(
      cleanSeed.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || new Uint8Array(32)
    );
  }

  private async cycleHash() {
    this.currentHash = new Uint8Array(
      await crypto.subtle.digest('SHA-256', this.currentHash)
    );
    this.offset = 0;
  }

  public async nextUint32(): Promise<number> {
    if (this.offset + 4 > this.currentHash.length) {
      await this.cycleHash();
    }
    const view = new DataView(this.currentHash.buffer, this.currentHash.byteOffset + this.offset, 4);
    this.offset += 4;
    return view.getUint32(0, false);
  }

  public async nextFloat(): Promise<number> {
    const u32 = await this.nextUint32();
    return u32 / 4294967296;
  }
}

export interface CandidateEntry {
  submission_id: string;
  wallet_address: string;
}

export interface SelectedWinner {
  submission_id: string;
  wallet_address: string;
  rank: number;
}

/**
 * Selects up to targetCount unique winners using a verifiable seed.
 */
export async function selectVerifiableWinners(
  candidates: CandidateEntry[],
  verifiableSeed: string,
  targetCount: number = 1000
): Promise<{
  winners: SelectedWinner[];
  seed: string;
  totalEligible: number;
  totalSelected: number;
}> {
  const eligibleCount = candidates.length;
  const countToSelect = Math.min(targetCount, eligibleCount);

  // Clone array to avoid in-place side effects
  const pool = [...candidates];
  const rng = new VerifiableRandomGenerator(verifiableSeed);

  // Partial Fisher-Yates shuffle to pick exactly countToSelect items
  for (let i = 0; i < countToSelect; i++) {
    const randomFloat = await rng.nextFloat();
    const j = i + Math.floor(randomFloat * (pool.length - i));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  const selectedWinners: SelectedWinner[] = [];
  for (let rank = 1; rank <= countToSelect; rank++) {
    const candidate = pool[rank - 1];
    selectedWinners.push({
      submission_id: candidate.submission_id,
      wallet_address: candidate.wallet_address,
      rank
    });
  }

  return {
    winners: selectedWinners,
    seed: verifiableSeed,
    totalEligible: eligibleCount,
    totalSelected: countToSelect
  };
}
