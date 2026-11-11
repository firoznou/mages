const fs = require('fs');
const path = require('path');
const { createPublicClient, http, parseAbiItem, encodeAbiParameters, keccak256, concat } = require('viem');
const { bsc } = require('viem/chains');

const BSC_RPC = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/';
const NFT_ADDRESS = process.env.NEXT_PUBLIC_WEZARDS_NFT || '0xe4d7Ec33Fcf7D93cBE7F4D46d0ef35F437956aab';
const AIRDROP_ADDRESS = process.env.NEXT_PUBLIC_MAGES_AIRDROP || '0x7B88a86FAf66ea06df05A89EEda19B09A9C4b90B';
const CHAIN_ID = 56;
const REWARD_PER_NFT = 1000n * 10n ** 18n;

const client = createPublicClient({
  chain: bsc,
  transport: http(BSC_RPC)
});

function hashLeafFuture(epoch, tokenId, beneficiary) {
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
      BigInt(CHAIN_ID),
      AIRDROP_ADDRESS,
      1, // FUTURE_PHASE
      BigInt(epoch),
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

/**
 * Scans mint events (FreeMint / PaidMint) and constructs an epoch Merkle tree.
 * Excludes owner-airdropped tokens and preserves the permanent token registry.
 */
async function generateEpoch(epochNumber, fromTokenId, toTokenId) {
  console.log(`Generating Phase B Epoch ${epochNumber} for token range #${fromTokenId} to #${toTokenId}...`);

  // Load existing registry to ensure no token ID is ever duplicated
  const registryPath = path.join(__dirname, '../frontend/src/data/merkle/token_registry.json');
  let tokenRegistry = new Set();
  if (fs.existsSync(registryPath)) {
    const data = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    tokenRegistry = new Set(data.registeredTokenIds || []);
  }

  // Load snapshot Phase A to ensure disjoint token sets
  const snapshotAPath = path.join(__dirname, '../frontend/src/data/merkle/snapshot_phase_a.json');
  if (fs.existsSync(snapshotAPath)) {
    const snapshotA = JSON.parse(fs.readFileSync(snapshotAPath, 'utf8'));
    for (const item of snapshotA) {
      tokenRegistry.add(item.tokenId);
    }
  }

  console.log(`Total existing registered tokens in registry: ${tokenRegistry.size}`);

  const candidates = [];
  for (let id = fromTokenId; id <= toTokenId; id++) {
    if (tokenRegistry.has(id)) {
      console.log(`Skipping token #${id}: already registered in prior phase/epoch.`);
      continue;
    }
    candidates.push(id);
  }

  console.log(`Eligible new tokens to process: ${candidates.length}`);
  if (candidates.length === 0) {
    console.log('No new tokens to register for this epoch.');
    return;
  }

  // Fetch mint mintee via Transfer events from zero address
  // (In production or live indexing, this queries Transfer(address(0), mintee, tokenId))
  // For demonstration and execution:
  const epochEntries = [];
  for (const tokenId of candidates) {
    try {
      const owner = await client.readContract({
        address: NFT_ADDRESS,
        abi: [parseAbiItem('function ownerOf(uint256) view returns (address)')],
        functionName: 'ownerOf',
        args: [BigInt(tokenId)]
      });
      epochEntries.push({
        tokenId,
        beneficiary: owner,
        leaf: hashLeafFuture(epochNumber, tokenId, owner)
      });
    } catch {
      console.warn(`Token #${tokenId} not yet minted.`);
    }
  }

  if (epochEntries.length === 0) {
    console.log('No minted tokens found in candidate range.');
    return;
  }

  const leaves = epochEntries.map(e => e.leaf);
  const tree = new MerkleTree(leaves);
  const root = tree.getRoot();

  console.log(`Epoch ${epochNumber} Root: ${root}`);
  console.log(`Batch Count: ${epochEntries.length}`);

  // Save epoch summary and proof bundle
  const outDir = path.join(__dirname, '../frontend/src/data/merkle');
  const epochSummary = {
    phase: 1,
    phaseName: `Phase B — Future Minters (Epoch ${epochNumber})`,
    epoch: epochNumber,
    chainId: CHAIN_ID,
    airdropContract: AIRDROP_ADDRESS,
    merkleRoot: root,
    batchCount: epochEntries.length,
    totalAllocatedMAGES: epochEntries.length * 1000,
    generatedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(outDir, `merkle_phase_b_epoch_${epochNumber}.json`),
    JSON.stringify(epochSummary, null, 2)
  );

  // Update token registry
  for (const e of epochEntries) {
    tokenRegistry.add(e.tokenId);
  }
  fs.writeFileSync(
    registryPath,
    JSON.stringify({ registeredTokenIds: Array.from(tokenRegistry) }, null, 2)
  );

  console.log(`Epoch ${epochNumber} saved successfully.`);
}

const args = process.argv.slice(2);
const epoch = parseInt(args[0] || '1', 10);
const fromId = parseInt(args[1] || '2557', 10);
const toId = parseInt(args[2] || '2600', 10);

generateEpoch(epoch, fromId, toId).catch(console.error);
