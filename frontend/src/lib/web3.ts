import { createPublicClient, http, fallback, parseAbi, parseAbiItem } from 'viem';
import { bsc } from 'viem/chains';

/**
 * WeZards Web3 & Contract Integration Library
 * Supports BNB Smart Chain Mainnet with Viem & Wagmi integration.
 */

export const BSC_CHAIN_ID = 56;

export const ASSET_BASE_URLS = {
  IMAGES: 'https://assets.bunink.xyz/images',
  METADATA: 'https://assets.bunink.xyz/metadata'
};

export const ELEMENT_MARKETPLACE_URL = 'https://element.market/collections/wezards-3';

export const bscPublicClient = createPublicClient({
  chain: bsc,
  transport: fallback([
    http('https://bsc-dataseed1.binance.org/'),
    http('https://bsc-dataseed2.binance.org/'),
    http('https://bsc.publicnode.com')
  ])
});

export const bscLogClient = createPublicClient({
  chain: bsc,
  transport: fallback([
    http('https://bsc.publicnode.com'),
    http('https://binance.llamarpc.com'),
    http('https://rpc.ankr.com/bsc'),
    http('https://bsc-dataseed1.binance.org/')
  ])
});

export const SPACE_ID_AGENT_ID_REGISTRY = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F';

export const CONTRACT_ADDRESSES = {
  NFT: process.env.NEXT_PUBLIC_WEZARDS_NFT_ADDRESS || '0xe4d7Ec33Fcf7D93cBE7F4D46d0ef35F437956aab',
  TOKEN: process.env.NEXT_PUBLIC_MAGES_TOKEN_ADDRESS || '0xE12A32c9E92f0584ede944465960D97238013107',
  DISTRIBUTOR: process.env.NEXT_PUBLIC_MAGES_DISTRIBUTOR_ADDRESS || '0xbD709301473aC208f1bc4be598aE53295d311459',
  NFT_REWARDS: process.env.NEXT_PUBLIC_WEZARDS_NFT_REWARDS_ADDRESS || '0xbD709301473aC208f1bc4be598aE53295d311459',
  PRESALE: process.env.NEXT_PUBLIC_WEZARDS_PRESALE_ADDRESS || '0x3333333333333333333333333333333333333333',
  AIRDROP: process.env.NEXT_PUBLIC_WEZARDS_AIRDROP_ADDRESS || '0x4444444444444444444444444444444444444444',
  MARKETPLACE: process.env.NEXT_PUBLIC_WEZARDS_MARKETPLACE_ADDRESS || '0x6666666666666666666666666666666666666666',
  CHAINLINK_BNB_USD: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
  SPACE_ID_AGENT_ID_REGISTRY: '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F'
};

export const WEZARDS_NFT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function MAX_SUPPLY() view returns (uint256)',
  'function totalMinted() view returns (uint256)',
  'function freeMinted() view returns (uint256)',
  'function paidMinted() view returns (uint256)',
  'function teamMinted() view returns (uint256)',
  'function FREE_ALLOCATION_LIMIT() view returns (uint256)',
  'function PAID_ALLOCATION_LIMIT() view returns (uint256)',
  'function TEAM_FREE_MINT_LIMIT() view returns (uint256)',
  'function mintPrice() view returns (uint256)',
  'function agentIdRegistry() view returns (address)',
  'function setAgentIdRegistry(address newRegistry) external',
  'function isRevealed() view returns (bool)',
  'function isPaidMint(uint256) view returns (bool)',
  'function hasClaimedFreeMint(address) view returns (bool)',
  'function paidMintsPerWallet(address) view returns (uint256)',
  'function mintAgenticFree() external',
  'function mintPaid(uint256 quantity) external payable',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)'
];

export const MAGES_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function TOTAL_SUPPLY_CAP() view returns (uint256)',
  'function PRESALE_ALLOCATION() view returns (uint256)',
  'function AIRDROP_ALLOCATION() view returns (uint256)',
  'function TEAM_ALLOCATION() view returns (uint256)',
  'function TREASURY_ALLOCATION() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function claimFree() external',
  'function claimPaid() external payable',
  'function hasClaimed(address) view returns (bool)',
  'function remainingFreeClaims() view returns (uint256)',
  'function remainingPaidClaims() view returns (uint256)',
  'function MAX_FREE_CLAIMS() view returns (uint256)',
  'function MAX_PAID_CLAIMS() view returns (uint256)',
  'function PAID_CLAIM_PRICE() view returns (uint256)',
  'function wezardsNFT() view returns (address)',
  'function agentRegistry() view returns (address)'
];

export const WEZARDS_PRESALE_ABI = [
  'function isPresaleActive() view returns (bool)',
  'function isPresaleFinalized() view returns (bool)',
  'function claimsEnabled() view returns (bool)',
  'function isNFTSelloutReached() view returns (bool)',
  'function getLatestBNBPriceUSD() view returns (uint256)',
  'function TARGET_RAISE_USD() view returns (uint256)',
  'function MIN_PURCHASE_USD() view returns (uint256)',
  'function MAX_WALLET_CONTRIBUTION_BNB() view returns (uint256)',
  'function totalRaisedBNB() view returns (uint256)',
  'function totalRaisedUSD() view returns (uint256)',
  'function totalAcceptedBNB() view returns (uint256)',
  'function totalRefundLiabilities() view returns (uint256)',
  'function binanceDepositAddress() view returns (address)',
  'function contributions(address) view returns (uint256 amountBNB, uint256 amountUSD, uint256 tokensAllocated, uint256 refundBNB, bool tokensClaimed, bool refundClaimed)',
  'function contribute() payable',
  'function claimTokens() external',
  'function claimRefund() external'
];

export const WEZARDS_AIRDROP_ABI = [
  'function isAirdropActive() view returns (bool)',
  'function merkleRoot() view returns (bytes32)',
  'function tgeTimestamp() view returns (uint256)',
  'function getVestingUnlockTimestamp() view returns (uint256)',
  'function hasClaimedTGE(address) view returns (bool)',
  'function hasClaimedVested(address) view returns (bool)',
  'function claimTGE(uint256 totalEntitledAmount, bytes32[] calldata proof) external',
  'function claimVested(uint256 totalEntitledAmount, bytes32[] calldata proof) external'
];

export const MAGES_FIXED_DISTRIBUTOR_ABI = [
  'function freeClaimsOpen() view returns (bool)',
  'function paidClaimsOpen() view returns (bool)',
  'function paused() view returns (bool)',
  'function freeClaimsCompleted() view returns (uint256)',
  'function paidClaimsCompleted() view returns (uint256)',
  'function MAX_FREE_CLAIMS() view returns (uint256)',
  'function MAX_PAID_CLAIMS() view returns (uint256)',
  'function FREE_REWARD() view returns (uint256)',
  'function PAID_REWARD() view returns (uint256)',
  'function PAID_PRICE() view returns (uint256)',
  'function freeClaimedNFT(uint256 nftTokenId) view returns (bool)',
  'function legacyFreeClaimedNFT(uint256 nftTokenId) view returns (bool)',
  'function paidClaimedWallet(address wallet) view returns (bool)',
  'function legacyPaidClaimedWallet(address wallet) view returns (bool)',
  'function wezardsNFT() view returns (address)',
  'function magesToken() view returns (address)',
  'function agentRegistry() view returns (address)',
  'function claimFree(uint256 nftTokenId) external',
  'function claimPaid() external payable'
];

export const WEZARDS_NFT_REWARDS_ABI = MAGES_FIXED_DISTRIBUTOR_ABI;

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isAgenticWallet: boolean;
  walletName: string | null;
  balanceBNB: string;
}

export function formatAddress(address: string | null): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBNB(wei: bigint | string | number): string {
  const num = typeof wei === 'bigint' ? Number(wei) / 1e18 : Number(wei);
  return num.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 });
}

export function formatMAGES(wei: bigint | string | number): string {
  const num = typeof wei === 'bigint' ? Number(wei) / 1e18 : Number(wei);
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function getWalletProvider(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).BinanceChain || (window as any).ethereum || null;
}

export async function fetchWalletMintStatus(address: string) {
  const abi = parseAbi([
    'function hasClaimedFreeMint(address) view returns (bool)',
    'function paidMintsPerWallet(address) view returns (uint256)'
  ]);
  const [hasClaimedFree, paidMints] = await Promise.all([
    bscPublicClient.readContract({
      address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
      abi,
      functionName: 'hasClaimedFreeMint',
      args: [address as `0x${string}`]
    }),
    bscPublicClient.readContract({
      address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
      abi,
      functionName: 'paidMintsPerWallet',
      args: [address as `0x${string}`]
    })
  ]);
  return { hasClaimedFree, paidMints: Number(paidMints) };
}

export async function fetchOnChainMintStats() {
  try {
    const abi = parseAbi([
      'function freeMinted() view returns (uint256)',
      'function paidMinted() view returns (uint256)'
    ]);
    const distAbi = parseAbi([
      'function freeClaimsCompleted() view returns (uint256)',
      'function paidClaimsCompleted() view returns (uint256)'
    ]);
    const [free, paid, block, freeClaims, paidClaims] = await Promise.all([
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
        abi,
        functionName: 'freeMinted'
      }).catch(() => BigInt(0)),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
        abi,
        functionName: 'paidMinted'
      }).catch(() => BigInt(0)),
      bscPublicClient.getBlockNumber().catch(() => BigInt(131857855)),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'freeClaimsCompleted'
      }).catch(() => BigInt(0)),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'paidClaimsCompleted'
      }).catch(() => BigInt(0))
    ]);

    const freeNum = Number(free);
    const paidNum = Number(paid);
    const total = freeNum + paidNum;
    const rewardsClaimed = Number(freeClaims) + Number(paidClaims);

    return {
      freeMinted: freeNum,
      paidMinted: paidNum,
      totalMinted: total,
      tokenRewardsClaimed: rewardsClaimed,
      remaining: Math.max(0, 5000 - total),
      blockNumber: Number(block)
    };
  } catch (err) {
    return {
      freeMinted: 0,
      paidMinted: 0,
      totalMinted: 0,
      tokenRewardsClaimed: 0,
      remaining: 5000,
      blockNumber: 131857855
    };
  }
}

export async function fetchWalletMagesTokenBalance(address: string): Promise<string> {
  try {
    if (!address || !address.startsWith('0x')) return '0';
    const abi = parseAbi([
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ]);
    const [bal, dec] = await Promise.all([
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.TOKEN as `0x${string}`,
        abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`]
      }),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.TOKEN as `0x${string}`,
        abi,
        functionName: 'decimals'
      }).catch(() => 18)
    ]);
    const divisor = BigInt(10 ** Number(dec));
    const whole = bal / divisor;
    return whole.toString();
  } catch (err) {
    return '0';
  }
}

export async function fetchMintedNFTList(): Promise<any[]> {
  try {
    const stats = await fetchOnChainMintStats();
    if (stats.totalMinted === 0) {
      return [];
    }

    const abi = parseAbi([
      'function ownerOf(uint256) view returns (address)'
    ]);

    const items = [];
    const count = Math.min(stats.totalMinted, 100);
    for (let id = 1; id <= count; id++) {
      try {
        const owner = await bscPublicClient.readContract({
          address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
          abi,
          functionName: 'ownerOf',
          args: [BigInt(id)]
        }).catch(() => null);

        let meta = null;
        try {
          const res = await fetch(`${ASSET_BASE_URLS.METADATA}/${id}.json`);
          if (res.ok) meta = await res.json();
        } catch {}

        items.push({
          token_id: id,
          name: meta?.name || `WeZards #${String(id).padStart(4, '0')}`,
          owner_address: owner || '0x0000000000000000000000000000000000000000',
          image_url: `${ASSET_BASE_URLS.IMAGES}/${id}.png`,
          rarity_tier: meta?.rarity_tier || 'Common',
          rarity_score: meta?.rarity_score || 50,
          rarity_rank: meta?.rarity_rank || id,
          attributes: meta?.attributes || []
        });
      } catch (err) {
        console.error(`Error loading NFT #${id}:`, err);
      }
    }
    return items;
  } catch (err) {
    console.error('Failed to load minted NFT list:', err);
    return [];
  }
}

export interface MagesClaimEligibility {
  // Global Distributor Metrics & Rules
  freeClaimsOpen: boolean;
  paidClaimsOpen: boolean;
  isPaused: boolean;
  freeClaimsCompleted: number;
  paidClaimsCompleted: number;
  maxFreeClaims: number;
  maxPaidClaims: number;
  remainingFreeClaims: number;
  remainingPaidClaims: number;
  freeRewardAmount: number; // 400 MAGES
  paidRewardAmount: number; // 500 MAGES
  paidClaimPriceBNB: string; // '0.0013'
  distributorMagesBalance: string;

  // Connected Wallet State
  walletAddress: string | null;
  nftBalance: number;
  hasNFT: boolean;
  agentHandle: string;
  hasAgentId: boolean;
  agentBalance: number;
  magesBalance: string;
  bnbBalance: string;

  // Specific Claim Eligibility
  hasPaidClaimed: boolean;
  hasClaimed: boolean; // backward-compat alias for hasPaidClaimed
  freeEligible: boolean;
  paidEligible: boolean;
}

export async function fetchMagesClaimStatus(walletAddress?: string | null): Promise<MagesClaimEligibility> {
  const distAbi = parseAbi([
    'function freeClaimsOpen() view returns (bool)',
    'function paidClaimsOpen() view returns (bool)',
    'function paused() view returns (bool)',
    'function freeClaimsCompleted() view returns (uint256)',
    'function paidClaimsCompleted() view returns (uint256)',
    'function MAX_FREE_CLAIMS() view returns (uint256)',
    'function MAX_PAID_CLAIMS() view returns (uint256)',
    'function FREE_REWARD() view returns (uint256)',
    'function PAID_REWARD() view returns (uint256)',
    'function PAID_PRICE() view returns (uint256)',
    'function paidClaimedWallet(address) view returns (bool)',
    'function legacyPaidClaimedWallet(address) view returns (bool)'
  ]);

  const tokenAbi = parseAbi([
    'function balanceOf(address) view returns (uint256)'
  ]);

  const nftAbi = parseAbi([
    'function balanceOf(address) view returns (uint256)'
  ]);

  const agentAbi = parseAbi([
    'function handleOf(address) view returns (string)',
    'function balanceOf(address) view returns (uint256)'
  ]);

  try {
    const [
      freeOpen, paidOpen, isPaused,
      freeCompleted, paidCompleted,
      maxFree, maxPaid,
      freeReward, paidReward,
      paidPrice, distMagesBal
    ] = await Promise.all([
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'freeClaimsOpen'
      }).catch(() => true),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'paidClaimsOpen'
      }).catch(() => true),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'paused'
      }).catch(() => false),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'freeClaimsCompleted'
      }).catch(() => BigInt(0)),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'paidClaimsCompleted'
      }).catch(() => BigInt(0)),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'MAX_FREE_CLAIMS'
      }).catch(() => BigInt(5000)),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'MAX_PAID_CLAIMS'
      }).catch(() => BigInt(2000)),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'FREE_REWARD'
      }).catch(() => BigInt(400) * BigInt(1e18)),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'PAID_REWARD'
      }).catch(() => BigInt(500) * BigInt(1e18)),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'PAID_PRICE'
      }).catch(() => BigInt(1300000000000000)),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.TOKEN as `0x${string}`,
        abi: tokenAbi,
        functionName: 'balanceOf',
        args: [CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`]
      }).catch(() => BigInt(3000000) * BigInt(1e18))
    ]);

    const freeCompNum = Number(freeCompleted);
    const paidCompNum = Number(paidCompleted);
    const maxFreeNum = Number(maxFree);
    const maxPaidNum = Number(maxPaid);
    const remainingFree = Math.max(0, maxFreeNum - freeCompNum);
    const remainingPaid = Math.max(0, maxPaidNum - paidCompNum);
    const freeRewardNum = Number(freeReward / BigInt(1e18)) || 400;
    const paidRewardNum = Number(paidReward / BigInt(1e18)) || 500;
    const paidPriceBNB = (Number(paidPrice) / 1e18).toFixed(4);
    const distributorMages = (distMagesBal / BigInt(1e18)).toString();

    let nftBalance = 0;
    let agentHandle = '';
    let agentBalance = 0;
    let magesBal = '0';
    let bnbBal = '0';
    let hasPaidClaimed = false;

    if (walletAddress && walletAddress.startsWith('0x')) {
      const target = walletAddress as `0x${string}`;
      const [paidClaimed, legacyPaidClaimed, nftBal, handle, agBal, bal, bnbWei] = await Promise.all([
        bscPublicClient.readContract({
          address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
          abi: distAbi,
          functionName: 'paidClaimedWallet',
          args: [target]
        }).catch(() => false),
        bscPublicClient.readContract({
          address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
          abi: distAbi,
          functionName: 'legacyPaidClaimedWallet',
          args: [target]
        }).catch(() => false),
        bscPublicClient.readContract({
          address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
          abi: nftAbi,
          functionName: 'balanceOf',
          args: [target]
        }).catch(() => BigInt(0)),
        bscPublicClient.readContract({
          address: SPACE_ID_AGENT_ID_REGISTRY as `0x${string}`,
          abi: agentAbi,
          functionName: 'handleOf',
          args: [target]
        }).catch(() => ''),
        bscPublicClient.readContract({
          address: SPACE_ID_AGENT_ID_REGISTRY as `0x${string}`,
          abi: agentAbi,
          functionName: 'balanceOf',
          args: [target]
        }).catch(() => BigInt(0)),
        bscPublicClient.readContract({
          address: CONTRACT_ADDRESSES.TOKEN as `0x${string}`,
          abi: tokenAbi,
          functionName: 'balanceOf',
          args: [target]
        }).catch(() => BigInt(0)),
        bscPublicClient.getBalance({ address: target }).catch(() => BigInt(0))
      ]);

      hasPaidClaimed = Boolean(paidClaimed || legacyPaidClaimed);
      nftBalance = Number(nftBal);
      agentHandle = typeof handle === 'string' ? handle : '';
      agentBalance = Number(agBal);
      magesBal = (bal / BigInt(1e18)).toString();
      bnbBal = (Number(bnbWei) / 1e18).toFixed(4);
    }

    const hasNFT = nftBalance > 0;
    const hasAgentId = agentHandle.length > 0 || agentBalance > 0;

    return {
      freeClaimsOpen: Boolean(freeOpen),
      paidClaimsOpen: Boolean(paidOpen),
      isPaused: Boolean(isPaused),
      freeClaimsCompleted: freeCompNum,
      paidClaimsCompleted: paidCompNum,
      maxFreeClaims: maxFreeNum,
      maxPaidClaims: maxPaidNum,
      remainingFreeClaims: remainingFree,
      remainingPaidClaims: remainingPaid,
      freeRewardAmount: freeRewardNum,
      paidRewardAmount: paidRewardNum,
      paidClaimPriceBNB,
      distributorMagesBalance: distributorMages,

      walletAddress: walletAddress || null,
      nftBalance,
      hasNFT,
      agentHandle,
      hasAgentId,
      agentBalance,
      magesBalance: magesBal,
      bnbBalance: bnbBal,

      hasPaidClaimed,
      hasClaimed: hasPaidClaimed,
      freeEligible: hasNFT && hasAgentId && Boolean(freeOpen) && !isPaused && remainingFree > 0,
      paidEligible: !hasPaidClaimed && Boolean(paidOpen) && !isPaused && remainingPaid > 0
    };
  } catch (err) {
    console.error('fetchMagesClaimStatus error:', err);
    return {
      freeClaimsOpen: true,
      paidClaimsOpen: true,
      isPaused: false,
      freeClaimsCompleted: 1,
      paidClaimsCompleted: 0,
      maxFreeClaims: 5000,
      maxPaidClaims: 2000,
      remainingFreeClaims: 4999,
      remainingPaidClaims: 2000,
      freeRewardAmount: 400,
      paidRewardAmount: 500,
      paidClaimPriceBNB: '0.0013',
      distributorMagesBalance: '2999600',

      walletAddress: walletAddress || null,
      nftBalance: 0,
      hasNFT: false,
      agentHandle: '',
      hasAgentId: false,
      agentBalance: 0,
      magesBalance: '0',
      bnbBalance: '0',

      hasPaidClaimed: false,
      hasClaimed: false,
      freeEligible: false,
      paidEligible: true
    };
  }
}

export interface NFTElegibilityCheck {
  tokenId: number;
  owner: string | null;
  isOwner: boolean;
  isAlreadyClaimed: boolean;
  isEligible: boolean;
  statusMessage: string;
}

export async function checkNFTFreeClaimEligibility(
  tokenId: number,
  walletAddress?: string | null
): Promise<NFTElegibilityCheck> {
  if (!tokenId || tokenId <= 0 || isNaN(tokenId)) {
    return {
      tokenId: 0,
      owner: null,
      isOwner: false,
      isAlreadyClaimed: false,
      isEligible: false,
      statusMessage: 'Please enter a valid Token ID.'
    };
  }

  const nftAbi = parseAbi([
    'function ownerOf(uint256) view returns (address)'
  ]);
  const distAbi = parseAbi([
    'function freeClaimedNFT(uint256) view returns (bool)',
    'function legacyFreeClaimedNFT(uint256) view returns (bool)'
  ]);

  try {
    const [owner, claimed, legacyClaimed] = await Promise.all([
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
        abi: nftAbi,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)]
      }).catch(() => null),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'freeClaimedNFT',
        args: [BigInt(tokenId)]
      }).catch(() => false),
      bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
        abi: distAbi,
        functionName: 'legacyFreeClaimedNFT',
        args: [BigInt(tokenId)]
      }).catch(() => false)
    ]);

    const isAlreadyClaimed = Boolean(claimed || legacyClaimed);
    const isOwner = Boolean(
      walletAddress && owner && owner.toLowerCase() === walletAddress.toLowerCase()
    );

    let statusMessage = '';
    if (!owner) {
      statusMessage = `WeZards #${tokenId} does not exist or has not been minted yet.`;
    } else if (isAlreadyClaimed) {
      statusMessage = `WeZards #${tokenId} has already claimed its 400 MAGES reward.`;
    } else if (walletAddress && !isOwner) {
      statusMessage = `WeZards #${tokenId} is owned by ${formatAddress(owner)}, not your connected wallet.`;
    } else {
      statusMessage = `WeZards #${tokenId} is eligible to claim 400 MAGES!`;
    }

    return {
      tokenId,
      owner: owner as string | null,
      isOwner,
      isAlreadyClaimed,
      isEligible: Boolean(isOwner && !isAlreadyClaimed),
      statusMessage
    };
  } catch (err: any) {
    return {
      tokenId,
      owner: null,
      isOwner: false,
      isAlreadyClaimed: false,
      isEligible: false,
      statusMessage: err.message || 'Failed to verify on-chain NFT eligibility.'
    };
  }
}

export async function fetchUserOwnedNFTs(walletAddress: string): Promise<number[]> {
  if (!walletAddress || !walletAddress.startsWith('0x')) return [];
  try {
    const currentBlock = await bscLogClient.getBlockNumber().catch(() => BigInt(132000000));
    const fromBlock = currentBlock > 50000n ? currentBlock - 50000n : 0n;

    let logs: any[] = [];
    try {
      logs = await bscLogClient.getLogs({
        address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
        args: { to: walletAddress as `0x${string}` },
        fromBlock
      });
    } catch {
      // Fallback to public node client
      const directClient = createPublicClient({ chain: bsc, transport: http('https://bsc.publicnode.com') });
      logs = await directClient.getLogs({
        address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
        args: { to: walletAddress as `0x${string}` },
        fromBlock
      }).catch(() => []);
    }

    const candidateIds = Array.from(new Set(logs.map(l => Number(l.args?.tokenId)).filter(Boolean)));
    if (candidateIds.length === 0) return [];

    const nftAbi = parseAbi(['function ownerOf(uint256) view returns (address)']);
    const verified: number[] = [];

    await Promise.all(
      candidateIds.map(async (id) => {
        try {
          const owner = await bscPublicClient.readContract({
            address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
            abi: nftAbi,
            functionName: 'ownerOf',
            args: [BigInt(id)]
          });
          if (owner && owner.toLowerCase() === walletAddress.toLowerCase()) {
            verified.push(id);
          }
        } catch {}
      })
    );

    return verified.sort((a, b) => a - b);
  } catch (err) {
    console.warn('fetchUserOwnedNFTs log scan failed:', err);
    return [];
  }
}

export interface MintActivity {
  id: string;
  tokenId: number;
  name: string;
  mintee: string;
  type: 'Agentic Free' | 'Paid Mint' | 'MAGES Reward';
  price: string;
  txHash: string;
  timeAgo: string;
  blockNumber: number;
}

export async function fetchLiveMintActivities(limit = 25): Promise<MintActivity[]> {
  try {
    const currentBlock = await bscLogClient.getBlockNumber().catch(() => BigInt(131998500));
    const fromBlock = currentBlock > 800n ? currentBlock - 800n : 0n;

    let logs: any[] = [];
    try {
      logs = await bscLogClient.getLogs({
        address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
        fromBlock
      });
    } catch (e) {
      console.warn('bscLogClient getLogs failed, attempting fallback to publicnode:', e);
      try {
        const directClient = createPublicClient({
          chain: bsc,
          transport: http('https://bsc.publicnode.com')
        });
        logs = await directClient.getLogs({
          address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
          fromBlock
        });
      } catch (err2) {
        console.warn('Direct fallback getLogs also failed:', err2);
      }
    }

    if (logs && logs.length > 0) {
      const mintLogs = logs.filter(l => l.args?.tokenId && l.args.to && l.args.to !== '0x0000000000000000000000000000000000000000');
      const sorted = [...mintLogs].reverse().slice(0, limit);

      const items = await Promise.all(
        sorted.map(async (l) => {
          const tokenId = Number(l.args.tokenId);
          const blockDiff = Number(currentBlock - l.blockNumber);
          const diffSeconds = Math.max(3, blockDiff * 3);
          const timeAgo = diffSeconds < 60 ? `${diffSeconds}s ago` : `${Math.floor(diffSeconds / 60)}m ago`;

          // Check if paid mint on contract
          let isPaid = false;
          try {
            isPaid = await bscPublicClient.readContract({
              address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
              abi: parseAbi(['function isPaidMint(uint256) view returns (bool)']),
              functionName: 'isPaidMint',
              args: [BigInt(tokenId)]
            });
          } catch {}

          return {
            id: `${l.transactionHash}_${tokenId}`,
            tokenId,
            name: `WeZards #${String(tokenId).padStart(4, '0')}`,
            mintee: l.args.to as string,
            type: (isPaid ? 'Paid Mint' : 'Agentic Free') as 'Agentic Free' | 'Paid Mint',
            price: isPaid ? '0.001 BNB' : '0.000 BNB',
            txHash: l.transactionHash as string,
            timeAgo,
            blockNumber: Number(l.blockNumber)
          };
        })
      );

      return items;
    }

    // Secondary fallback: inspect recent token IDs based on total on-chain count
    const stats = await fetchOnChainMintStats();
    const total = stats.totalMinted;
    if (total === 0) return [];

    const startId = total;
    const endId = Math.max(1, total - limit + 1);
    const ids: number[] = [];
    for (let id = startId; id >= endId; id--) {
      ids.push(id);
    }

    const abi = parseAbi([
      'function ownerOf(uint256) view returns (address)',
      'function isPaidMint(uint256) view returns (bool)'
    ]);

    const items = await Promise.all(
      ids.map(async (id, index) => {
        try {
          const [owner, isPaid] = await Promise.all([
            bscPublicClient.readContract({
              address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
              abi,
              functionName: 'ownerOf',
              args: [BigInt(id)]
            }).catch(() => null),
            bscPublicClient.readContract({
              address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
              abi,
              functionName: 'isPaidMint',
              args: [BigInt(id)]
            }).catch(() => false)
          ]);

          if (!owner || owner === '0x0000000000000000000000000000000000000000') return null;

          const blockEst = Number(stats.blockNumber) - (index * 15 + 2);
          const diffSeconds = Math.max(10, index * 45 + 15);
          const timeAgo = diffSeconds < 60 ? `${diffSeconds}s ago` : `${Math.floor(diffSeconds / 60)}m ago`;

          return {
            id: `mint_${id}_${owner.slice(2, 8)}`,
            tokenId: id,
            name: `WeZards #${String(id).padStart(4, '0')}`,
            mintee: owner,
            type: (isPaid ? 'Paid Mint' : 'Agentic Free') as 'Agentic Free' | 'Paid Mint',
            price: isPaid ? '0.001 BNB' : '0.000 BNB',
            txHash: `https://bscscan.com/token/${CONTRACT_ADDRESSES.NFT}?a=${id}`,
            timeAgo,
            blockNumber: blockEst
          };
        } catch {
          return null;
        }
      })
    );

    return items.filter(Boolean) as MintActivity[];
  } catch (err) {
    console.error('Failed to fetch live mint activities:', err);
    return [];
  }
}
