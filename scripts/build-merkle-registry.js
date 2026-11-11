const fs = require('fs');
const path = require('path');
const { encodeAbiParameters, keccak256, concat } = require('viem');

const CHAIN_ID = 56;
const AIRDROP_ADDRESS = process.env.NEXT_PUBLIC_MAGES_AIRDROP || '0x7B88a86FAf66ea06df05A89EEda19B09A9C4b90B';
const REWARD_PER_NFT = 1000n * 10n ** 18n;

function hashLeafExisting(tokenId, beneficiary) {
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
      BigInt(CHAIN_ID),
      AIRDROP_ADDRESS,
      0, // EXISTING_PHASE
      BigInt(tokenId),
      beneficiary,
      REWARD_PER_NFT
    ]
  );
  return keccak256(encoded);
}

function hashPair(a, b) {
  return a.toLowerCase() < b.toLowerCase()
    ? keccak256(concat([a, b]))
    : keccak256(concat([b, a]));
}

class MerkleTree {
  constructor(leaves) {
    this.leaves = leaves;
    this.layers = [leaves];
    while (this.layers[this.layers.length - 1].length > 1) {
      this.layers.push(this.getNextLayer(this.layers[this.layers.length - 1]));
    }
  }

  getNextLayer(elements) {
    const next = [];
    for (let i = 0; i < elements.length; i += 2) {
      if (i + 1 < elements.length) {
        next.push(hashPair(elements[i], elements[i + 1]));
      } else {
        next.push(elements[i]);
      }
    }
    return next;
  }

  getRoot() {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(leaf) {
    let index = this.leaves.findIndex(l => l.toLowerCase() === leaf.toLowerCase());
    if (index === -1) return [];

    const proof = [];
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

async function main() {
  const snapshotPath = path.join(__dirname, '../frontend/src/data/merkle/snapshot_phase_a.json');
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot file not found at ${snapshotPath}. Run generate-snapshot.js first.`);
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  console.log(`Processing ${snapshot.length} tokens for Merkle Tree construction...`);

  // Build leaves
  const leafEntries = snapshot.map((item) => ({
    tokenId: item.tokenId,
    owner: item.owner,
    leaf: hashLeafExisting(item.tokenId, item.owner)
  }));

  const leaves = leafEntries.map(e => e.leaf);
  const tree = new MerkleTree(leaves);
  const root = tree.getRoot();

  console.log('Phase A Merkle Root:', root);

  // Group by wallet address
  const walletMap = {};
  for (const entry of leafEntries) {
    const normalized = entry.owner.toLowerCase();
    if (!walletMap[normalized]) {
      walletMap[normalized] = {
        address: entry.owner,
        tokens: []
      };
    }
    const proof = tree.getProof(entry.leaf);
    walletMap[normalized].tokens.push({
      tokenId: entry.tokenId,
      phase: 0,
      rewardMAGES: 1000,
      leaf: entry.leaf,
      proof
    });
  }

  const outDir = path.join(__dirname, '../frontend/src/data/merkle');
  fs.writeFileSync(
    path.join(outDir, 'merkle_phase_a_proofs.json'),
    JSON.stringify(walletMap, null, 2)
  );

  const summary = {
    phase: 0,
    phaseName: 'Phase A — Snapshot NFT Holders',
    chainId: CHAIN_ID,
    airdropContract: AIRDROP_ADDRESS,
    merkleRoot: root,
    eligibleCount: snapshot.length,
    totalAllocatedMAGES: snapshot.length * 1000,
    uniqueWallets: Object.keys(walletMap).length,
    generatedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(outDir, 'merkle_phase_a_summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log(`Summary written to merkle_phase_a_summary.json`);
  console.log(`Proofs for ${Object.keys(walletMap).length} wallets written to merkle_phase_a_proofs.json`);
}

main().catch(console.error);

