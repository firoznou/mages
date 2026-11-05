/**
 * Web3 & Binance Wallet / Binance Agentic Wallet Integration Helpers
 */

export const BSC_TESTNET_CHAIN_ID = 97;
export const BSC_MAINNET_CHAIN_ID = 56;

export const CONTRACT_ADDRESSES = {
  NFT: process.env.NEXT_PUBLIC_WEZARDS_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
  TOKEN: process.env.NEXT_PUBLIC_WEZARDS_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
  MARKETPLACE: process.env.NEXT_PUBLIC_WEZARDS_MARKETPLACE_ADDRESS || '0x0000000000000000000000000000000000000000',
  REWARD_DISTRIBUTOR: process.env.NEXT_PUBLIC_WEZARDS_REWARD_DISTRIBUTOR_ADDRESS || '0x0000000000000000000000000000000000000000',
};

export const WEZARDS_NFT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function MAX_SUPPLY() view returns (uint256)',
  'function totalMinted() view returns (uint256)',
  'function agenticFreeMinted() view returns (uint256)',
  'function publicPaidMinted() view returns (uint256)',
  'function agenticFreeAllocationLimit() view returns (uint256)',
  'function publicPaidAllocationLimit() view returns (uint256)',
  'function mintPrice() view returns (uint256)',
  'function isRevealed() view returns (bool)',
  'function hasClaimedFreeMint(address) view returns (bool)',
  'function mintAgenticFree(bytes32 nonce, uint256 deadline, bytes calldata signature) external',
  'function mintPublicPaid() external payable',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)'
];

export const WEZARDS_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)'
];

export const WEZARDS_MARKETPLACE_ABI = [
  'function listItem(address nftContract, uint256 tokenId, uint256 price) returns (bytes32)',
  'function buyItem(bytes32 listingId) payable',
  'function delistItem(bytes32 listingId)',
  'function updateListingPrice(bytes32 listingId, uint256 newPrice)',
  'function feeBps() view returns (uint256)',
  'function listings(bytes32) view returns (address seller, address nftContract, uint256 tokenId, uint256 price, bool isActive)'
];

export const WEZARDS_REWARD_DISTRIBUTOR_ABI = [
  'function isCampaignFinalized() view returns (bool)',
  'function rewardAmountPerWinner() view returns (uint256)',
  'function isWinner(address) view returns (bool)',
  'function hasReceivedPayment(address) view returns (bool)',
  'function claimReward() external'
];

/**
 * Detects Binance Wallet, Binance Agentic Wallet, or standard injected provider
 */
export function getWalletProvider(): any {
  if (typeof window === 'undefined') return null;
  const anyWindow = window as any;

  // Binance Chain Wallet or Binance Agentic Wallet provider
  if (anyWindow.BinanceChain) {
    return anyWindow.BinanceChain;
  }
  if (anyWindow.ethereum?.isBinance || anyWindow.ethereum?.isBinanceAgentic) {
    return anyWindow.ethereum;
  }
  if (anyWindow.ethereum) {
    return anyWindow.ethereum;
  }
  return null;
}

/**
 * Connects wallet and verifies BSC Network
 */
export async function connectBinanceWallet(): Promise<{
  address: string;
  chainId: number;
  isAgentic: boolean;
}> {
  const provider = getWalletProvider();
  if (!provider) {
    throw new Error('No Binance Wallet or Web3 provider detected. Please install Binance Wallet or Binance Agentic Wallet extension.');
  }

  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('Wallet connection rejected or no account selected.');
  }

  const chainIdHex = await provider.request({ method: 'eth_chainId' });
  const chainId = parseInt(chainIdHex, 16);

  // Check if provider has Binance Agentic flags
  const isAgentic = !!(
    provider.isBinanceAgentic ||
    provider.isAgentic ||
    (provider.flags && provider.flags.isAgentic)
  );

  return {
    address: accounts[0],
    chainId,
    isAgentic
  };
}

/**
 * Switches network to BNB Smart Chain Testnet (97) or Mainnet (56)
 */
export async function switchToBSC(targetChainId: number = BSC_TESTNET_CHAIN_ID): Promise<void> {
  const provider = getWalletProvider();
  if (!provider) return;

  const hexChainId = `0x${targetChainId.toString(16)}`;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }]
    });
  } catch (switchError: any) {
    // Chain has not been added to wallet
    if (switchError.code === 4902) {
      const isTestnet = targetChainId === BSC_TESTNET_CHAIN_ID;
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: hexChainId,
            chainName: isTestnet ? 'BNB Smart Chain Testnet' : 'BNB Smart Chain Mainnet',
            nativeCurrency: { name: 'tBNB', symbol: isTestnet ? 'tBNB' : 'BNB', decimals: 18 },
            rpcUrls: [isTestnet ? 'https://data-seed-prebsc-1-s1.binance.org:8545/' : 'https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: [isTestnet ? 'https://testnet.bscscan.com' : 'https://bscscan.com']
          }
        ]
      });
    } else {
      throw switchError;
    }
  }
}
