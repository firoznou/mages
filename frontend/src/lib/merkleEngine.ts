import { encodeAbiParameters, keccak256, concat } from 'viem';
import phaseASummary from '../data/merkle/merkle_phase_a_summary.json';
import phaseAProofs from '../data/merkle/merkle_phase_a_proofs.json';

export const BSC_CHAIN_ID = 56;
export const MAGES_AIRDROP_ADDRESS = (
  process.env.NEXT_PUBLIC_MAGES_AIRDROP || '0x7B88a86FAf66ea06df05A89EEda19B09A9C4b90B'
) as `0x${string}`;

export const REWARD_PER_NFT = 1000n * 10n ** 18n; // 1,000 MAGES in 18 decimals

export function isValidEVMAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export interface AirdropTokenClaim {
  tokenId: number;
  phase: number;
  phaseName: string;
  epoch?: number;
  leaf: `0x${string}`;
  proof: `0x${string}`[];
  rewardMAGES: number;
  isClaimed?: boolean;
}

export interface WalletAirdropProfile {
  address: string;
  totalSnapshotTokens: number;
  totalFutureTokens: number;
  totalClaimableMAGES: number;
  tokens: AirdropTokenClaim[];
}

/**
 * Hashing format strictly adhering to MAGES Airdrop specification:
 * Phase 0 (Existing): keccak256(abi.encode(chainId, airdropAddress, phase, tokenId, beneficiary, rewardPerNFT))
 */
export function hashLeafExisting(
  tokenId: number | bigint,
  beneficiary: string,
  chainId: number = BSC_CHAIN_ID,
  airdropAddress: string = MAGES_AIRDROP_ADDRESS,
  reward: bigint = REWARD_PER_NFT
): `0x${string}` {
  const encoded = encodeAbiParameters(
    [
      { type: 'uint256' },
      { type: 'address' },
      { type: 'uint8' },
      { type: 'uint256' },
      { type: 'address' },
      { type: 'uint256' }
    ],
    [
      BigInt(chainId),
      airdropAddress as `0x${string}`,
      0, // EXISTING_PHASE
      BigInt(tokenId),
      beneficiary as `0x${string}`,
      reward
    ]
  );
  return keccak256(encoded);
}

/**
 * Phase 1 (Future): keccak256(abi.encode(chainId, airdropAddress, phase, epoch, tokenId, beneficiary, rewardPerNFT))
 */
export function hashLeafFuture(
  epoch: number | bigint,
  tokenId: number | bigint,
  beneficiary: string,
  chainId: number = BSC_CHAIN_ID,
  airdropAddress: string = MAGES_AIRDROP_ADDRESS,
  reward: bigint = REWARD_PER_NFT
): `0x${string}` {
  const encoded = encodeAbiParameters(
    [
      { type: 'uint256' },
      { type: 'address' },
      { type: 'uint8' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'address' },
      { type: 'uint256' }
    ],
    [
      BigInt(chainId),
      airdropAddress as `0x${string}`,
      1, // FUTURE_PHASE
      BigInt(epoch),
      BigInt(tokenId),
      beneficiary as `0x${string}`,
      reward
    ]
  );
  return keccak256(encoded);
}

/**
 * OpenZeppelin sorted-pair hashing
 */
export function hashPair(a: `0x${string}`, b: `0x${string}`): `0x${string}` {
  return a.toLowerCase() < b.toLowerCase()
    ? keccak256(concat([a, b]))
    : keccak256(concat([b, a]));
}

/**
 * Verify proof client-side before sending transaction
 */
export function verifyProof(leaf: `0x${string}`, proof: `0x${string}`[], root: `0x${string}`): boolean {
  if (!root || root === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return false;
  }
  let computed = leaf;
  for (const p of proof) {
    computed = hashPair(computed, p);
  }
  return computed.toLowerCase() === root.toLowerCase();
}

/**
 * Merkle Tree Generator for administrative future epoch sets
 */
export class MerkleTree {
  leaves: `0x${string}`[];
  layers: `0x${string}`[][];

  constructor(leaves: `0x${string}`[]) {
    this.leaves = leaves;
    this.layers = [leaves];
    while (this.layers[this.layers.length - 1].length > 1) {
      this.layers.push(this.getNextLayer(this.layers[this.layers.length - 1]));
    }
  }

  private getNextLayer(elements: `0x${string}`[]): `0x${string}`[] {
    const next: `0x${string}`[] = [];
    for (let i = 0; i < elements.length; i += 2) {
      if (i + 1 < elements.length) {
        next.push(hashPair(elements[i], elements[i + 1]));
      } else {
        next.push(elements[i]);
      }
    }
    return next;
  }

  getRoot(): `0x${string}` {
    if (!this.layers[this.layers.length - 1] || this.layers[this.layers.length - 1].length === 0) {
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
    return this.layers[this.layers.length - 1][0];
  }

  getProof(leaf: `0x${string}`): `0x${string}`[] {
    let index = this.leaves.findIndex(l => l.toLowerCase() === leaf.toLowerCase());
    if (index === -1) return [];

    const proof: `0x${string}`[] = [];
    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRight = index % 2 === 1;
      const pairIndex = isRight ? index - 1 : index + 1;
      if (pairIndex < layer.length) {
        proof.push(layer[pairIndex]);
      }
      index = Math.floor(index / 2);
    }
    return proof;
  }
}

/**
 * Get Merkle proof & eligibility for any wallet
 */
export function getWalletAirdropData(walletAddress: string): WalletAirdropProfile {
  if (!walletAddress || !walletAddress.startsWith('0x')) {
    return {
      address: '',
      totalSnapshotTokens: 0,
      totalFutureTokens: 0,
      totalClaimableMAGES: 0,
      tokens: []
    };
  }

  const normalized = walletAddress.toLowerCase();
  const entry = (phaseAProofs as Record<string, any>)[normalized];

  const tokens: AirdropTokenClaim[] = [];
  if (entry && Array.isArray(entry.tokens)) {
    for (const t of entry.tokens) {
      tokens.push({
        tokenId: t.tokenId,
        phase: 0,
        phaseName: 'Phase A (Snapshot)',
        leaf: t.leaf as `0x${string}`,
        proof: t.proof as `0x${string}`[],
        rewardMAGES: t.rewardMAGES || 1000
      });
    }
  }

  const totalSnapshot = tokens.filter(t => t.phase === 0).length;
  const totalFuture = tokens.filter(t => t.phase === 1).length;

  return {
    address: walletAddress,
    totalSnapshotTokens: totalSnapshot,
    totalFutureTokens: totalFuture,
    totalClaimableMAGES: tokens.length * 1000,
    tokens
  };
}

export { phaseASummary };

