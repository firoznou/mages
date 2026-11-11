const fs = require('fs');
const path = require('path');
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

const BSC_RPC = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/';
const NFT_ADDRESS = process.env.NEXT_PUBLIC_WEZARDS_NFT || '0xe4d7Ec33Fcf7D93cBE7F4D46d0ef35F437956aab';

const client = createPublicClient({
  chain: bsc,
  transport: http(BSC_RPC)
});

const NFT_ABI = parseAbi([
  'function totalMinted() view returns (uint256)',
  'function freeMinted() view returns (uint256)',
  'function paidMinted() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)'
]);

async function main() {
  console.log('Querying WeZards NFT Contract at:', NFT_ADDRESS);

  const [totalMinted, freeMinted, paidMinted] = await Promise.all([
    client.readContract({ address: NFT_ADDRESS, abi: NFT_ABI, functionName: 'totalMinted' }),
    client.readContract({ address: NFT_ADDRESS, abi: NFT_ABI, functionName: 'freeMinted' }),
    client.readContract({ address: NFT_ADDRESS, abi: NFT_ABI, functionName: 'paidMinted' })
  ]);

  const total = Number(totalMinted);
  console.log(`Stats -> Total: ${total}, Free: ${freeMinted}, Paid: ${paidMinted}`);

  const snapshot = [];
  const BATCH_SIZE = 100;

  for (let start = 1; start <= total; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, total);
    const contracts = [];
    for (let id = start; id <= end; id++) {
      contracts.push({
        address: NFT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'ownerOf',
        args: [BigInt(id)]
      });
    }

    const results = await client.multicall({ contracts });
    for (let i = 0; i < results.length; i++) {
      const tokenId = start + i;
      const res = results[i];
      if (res.status === 'success') {
        snapshot.push({ tokenId, owner: res.result });
      } else {
        console.warn(`Failed to fetch owner for tokenId ${tokenId}`);
      }
    }
    console.log(`Fetched ${snapshot.length} / ${total} token owners...`);
  }

  const outDir = path.join(__dirname, '../frontend/src/data/merkle');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'snapshot_phase_a.json');
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(`Phase A snapshot written to ${outPath} (${snapshot.length} tokens)`);
}

main().catch(console.error);
