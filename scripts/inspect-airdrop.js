const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

async function check() {
  const client = createPublicClient({ chain: bsc, transport: http('https://bsc-dataseed.binance.org/') });
  const addr = '0x7B88a86FAf66ea06df05A89EEda19B09A9C4b90B';
  
  const abi = parseAbi([
    'function EXISTING_PHASE() view returns (uint8)',
    'function FUTURE_PHASE() view returns (uint8)',
    'function REWARD_PER_NFT() view returns (uint256)',
    'function MAX_ELIGIBLE_NFTS() view returns (uint256)',
    'function MAX_AIRDROP() view returns (uint256)',
    'function CLAIM_PERIOD() view returns (uint256)',
    'function claimDeadline() view returns (uint256)',
    'function eligibilityFinalized() view returns (bool)',
    'function existingMerkleRoot() view returns (bytes32)',
    'function existingEligibleCount() view returns (uint256)',
    'function existingClaimedCount() view returns (uint256)',
    'function futureEpochCount() view returns (uint256)',
    'function totalEligibleNFTs() view returns (uint256)',
    'function totalClaimed() view returns (uint256)',
    'function remainingEligibleNFTs() view returns (uint256)',
    'function remainingAirdropTokens() view returns (uint256)',
    'function paused() view returns (bool)',
    'function owner() view returns (address)'
  ]);

  for (const item of abi) {
    if (item.type === 'function' && item.inputs.length === 0) {
      try {
        const res = await client.readContract({ address: addr, abi: [item], functionName: item.name });
        console.log(`${item.name}():`, res);
      } catch (e) {
        console.log(`${item.name}(): ERROR`, e.shortMessage || e.message);
      }
    }
  }

  // Check sample token
  const isClaimed1 = await client.readContract({
    address: addr,
    abi: parseAbi(['function isTokenClaimed(uint256) view returns (bool)']),
    functionName: 'isTokenClaimed',
    args: [1n]
  });
  console.log('isTokenClaimed(1):', isClaimed1);
}
check().catch(console.error);

