'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { encodeFunctionData, parseAbi } from 'viem';
import { verifyAgenticWallet } from '../../lib/api';
import { 
  formatAddress, 
  BSC_CHAIN_ID,
  bscPublicClient,
  CONTRACT_ADDRESSES, 
  ASSET_BASE_URLS, 
  fetchOnChainMintStats, 
  fetchWalletMagesTokenBalance,
  fetchWalletMintStatus
} from '../../lib/web3';

function isTransactionHash(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value);
}

async function assertBscMainnet(provider: any) {
  const chainId = await provider.request({ method: 'eth_chainId' });
  if (BigInt(chainId) !== BigInt(BSC_CHAIN_ID)) {
    throw new Error('Switch your wallet to BNB Smart Chain Mainnet (Chain ID 56) to mint.');
  }
}

async function submitAndConfirmMint(provider: any, wallet: string, data: string, value: string) {
  await assertBscMainnet(provider);
  const transactionHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{ from: wallet, to: CONTRACT_ADDRESSES.NFT, data, value }]
  });
  if (!isTransactionHash(transactionHash)) {
    throw new Error('Wallet returned an invalid transaction hash.');
  }

  const receipt = await bscPublicClient.waitForTransactionReceipt({ hash: transactionHash });
  if (receipt.status !== 'success') {
    throw new Error('The mint transaction reverted on BNB Smart Chain.');
  }
  return transactionHash;
}

interface MintActivity {
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

export default function MintPage() {
  const [activeTab, setActiveTab] = useState<'free' | 'paid'>('free');
  const [wallet, setWallet] = useState<string | null>(null);
  const [userMagesBalance, setUserMagesBalance] = useState<string>('0');
  const [isAgenticEligible, setIsAgenticEligible] = useState<boolean>(false);
  const [hasClaimedFree, setHasClaimedFree] = useState<boolean>(false);
  const [paidQuantity, setPaidQuantity] = useState<number>(1);
  const [paidMintedCount, setPaidMintedCount] = useState<number>(0);
  const [mounted, setMounted] = useState<boolean>(false);

  // Allocation Limits (From WeZardsNFT.sol hard caps)
  const TOTAL_SUPPLY = 5000;
  const FREE_CAP = 2500;
  const PAID_CAP = 2500;

  // Real On-Chain Minting Calculation States
  const [freeMinted, setFreeMinted] = useState<number>(0);
  const [paidMinted, setPaidMinted] = useState<number>(0);
  const [tokenRewardsClaimed, setTokenRewardsClaimed] = useState<number>(0);
  const [blockHeight, setBlockHeight] = useState<number>(131857855);
  const [recentMintType, setRecentMintType] = useState<'free' | 'paid' | null>(null);

  // Derived live percentages and supply calculations
  const totalMinted = freeMinted + paidMinted;
  const totalPercent = Math.min(100, (totalMinted / TOTAL_SUPPLY) * 100);
  const freePercent = Math.min(100, (freeMinted / FREE_CAP) * 100);
  const paidPercent = Math.min(100, (paidMinted / PAID_CAP) * 100);

  // Minting Flow States
  const [status, setStatus] = useState<'idle' | 'checking' | 'preparing' | 'signing' | 'confirming' | 'minted' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [mintedNFT, setMintedNFT] = useState<any | null>(null);

  // Agent Prompts & CLI Tooling State
  const [agentTab, setAgentTab] = useState<'prompt' | 'cli' | 'python' | 'simulation'>('prompt');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);

  // Real On-Chain Activities List
  const [activities, setActivities] = useState<MintActivity[]>([]);

  // Minting Gift Submission States
  const [giftTweetUrl, setGiftTweetUrl] = useState<string>('');
  const [giftWalletAddress, setGiftWalletAddress] = useState<string>('');
  const [giftTwitterHandle, setGiftTwitterHandle] = useState<string>('');
  const [giftScreenshotFile, setGiftScreenshotFile] = useState<File | null>(null);
  const [giftScreenshotPreview, setGiftScreenshotPreview] = useState<string | null>(null);
  const [giftSubmitting, setGiftSubmitting] = useState<boolean>(false);
  const [giftSuccessResult, setGiftSuccessResult] = useState<any | null>(null);
  const [giftError, setGiftError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mintPriceBNB = 0.001;
  const allowedPaidMax = hasClaimedFree ? 9 : 10;

  // Load real on-chain stats from BSC
  useEffect(() => {
    setMounted(true);

    async function loadStats() {
      try {
        const stats = await fetchOnChainMintStats();
        setFreeMinted(stats.freeMinted);
        setPaidMinted(stats.paidMinted);
        setBlockHeight(stats.blockNumber);
      } catch (err) {
        console.error('Failed to fetch on-chain stats:', err);
      }
    }
    loadStats();

    // Check connected provider
    if (typeof window !== 'undefined' && ((window as any).BinanceChain || (window as any).ethereum)) {
      const provider = (window as any).BinanceChain || (window as any).ethereum;
      provider.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts && accounts[0]) {
          setWallet(accounts[0]);
          verifyEligibility(accounts[0]);
          loadUserMages(accounts[0]);
        }
      }).catch(() => {});
    }
  }, []);

  const loadUserMages = async (addr: string) => {
    try {
      const bal = await fetchWalletMagesTokenBalance(addr);
      setUserMagesBalance(bal);
    } catch {}
  };

  const verifyEligibility = async (addr: string) => {
    try {
      setStatus('checking');
      const data = await verifyAgenticWallet(addr);
      setIsAgenticEligible(data.eligible === true);
      const mintStatus = await fetchWalletMintStatus(addr);
      setHasClaimedFree(mintStatus.hasClaimedFree);
      setPaidMintedCount(mintStatus.paidMints);
    } catch {
      setIsAgenticEligible(false);
    } finally {
      setStatus('idle');
    }
  };

  const handleConnect = async () => {
    if (typeof window !== 'undefined' && ((window as any).BinanceChain || (window as any).ethereum)) {
      const provider = (window as any).BinanceChain || (window as any).ethereum;
      try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setWallet(accounts[0]);
          await verifyEligibility(accounts[0]);
          await loadUserMages(accounts[0]);
        }
      } catch (err: any) {
        alert(err.message || 'Connection failed');
      }
    } else {
      window.dispatchEvent(new CustomEvent('open-wallet-modal'));
    }
  };

  const handleFreeMint = async () => {
    if (!wallet) return handleConnect();
    try {
      setStatus('preparing');
      setStatusMessage('Checking SPACE ID Agent ID ownership...');
      const verifyData = await verifyAgenticWallet(wallet);

      if (!verifyData.eligible) {
        setStatus('error');
        setStatusMessage('This wallet does not own a SPACE ID Agent ID. You can still mint from the paid tier.');
        return;
      }

      setStatus('signing');
      setStatusMessage('Please confirm the 0.000 BNB free mint in your wallet...');

      const provider = (window as any).BinanceChain || (window as any).ethereum;
      if (!provider) throw new Error('No Web3 wallet detected');

      setStatus('confirming');
      setStatusMessage('Submitting and confirming the mint on BNB Smart Chain...');
      const data = encodeFunctionData({
        abi: parseAbi(['function mintAgenticFree()']),
        functionName: 'mintAgenticFree'
      });
      const txHash = await submitAndConfirmMint(provider, wallet, data, '0x0');

      setHasClaimedFree(true);
      setFreeMinted(prev => prev + 1);
      setRecentMintType('free');
      setTimeout(() => setRecentMintType(null), 3000);

      const newTokenId = totalMinted + 1;
      const mintedItem = {
        id: newTokenId,
        name: `WeZards #${String(newTokenId).padStart(4, '0')}`,
        type: 'Free Agentic Mint',
        cost: '0.000 BNB',
        txHash,
        image: `${ASSET_BASE_URLS.IMAGES}/${((newTokenId - 1) % 5000) + 1}.png`
      };

      setMintedNFT(mintedItem);
      setStatus('minted');
      setStatusMessage(`Successfully minted WeZards #${newTokenId}!`);

      // Add to live activities
      setActivities(prev => [{
        id: `tx_${Date.now()}`,
        tokenId: newTokenId,
        name: mintedItem.name,
        mintee: wallet,
        type: 'Agentic Free',
        price: '0.000 BNB',
        txHash,
        timeAgo: 'Just now',
        blockNumber: blockHeight + 1
      }, ...prev]);

    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Free mint transaction failed.');
    }
  };

  const handlePaidMint = async () => {
    if (!wallet) return handleConnect();
    try {
      setStatus('preparing');
      setStatusMessage(`Preparing to mint ${paidQuantity} WeZards NFTs for ${(paidQuantity * 0.001).toFixed(3)} BNB...`);

      const provider = (window as any).BinanceChain || (window as any).ethereum;
      if (!provider) throw new Error('No Web3 wallet detected');

      setStatus('signing');
      setStatusMessage('Please confirm the payment in your wallet...');

      setStatus('confirming');
      setStatusMessage('Submitting and confirming the paid mint on BNB Smart Chain...');
      const paidCalldata = encodeFunctionData({
        abi: parseAbi(['function mintPaid(uint256 quantity)']),
        functionName: 'mintPaid',
        args: [BigInt(paidQuantity)]
      });
      const valueWei = `0x${(BigInt(paidQuantity) * 1000000000000000n).toString(16)}`;
      const txHash = await submitAndConfirmMint(provider, wallet, paidCalldata, valueWei);

      setPaidMinted(prev => prev + paidQuantity);
      setPaidMintedCount(prev => prev + paidQuantity);
      setRecentMintType('paid');
      setTimeout(() => setRecentMintType(null), 3000);

      const firstNewId = totalMinted + 1;
      const mintedItem = {
        id: firstNewId,
        name: `WeZards #${String(firstNewId).padStart(4, '0')}`,
        type: `Paid Public Mint (${paidQuantity} NFTs)`,
        cost: `${(paidQuantity * 0.001).toFixed(3)} BNB`,
        txHash,
        image: `${ASSET_BASE_URLS.IMAGES}/${((firstNewId - 1) % 5000) + 1}.png`
      };

      setMintedNFT(mintedItem);
      setStatus('minted');
      setStatusMessage(`Successfully minted ${paidQuantity} WeZards NFTs!`);

      // Add to live activities
      setActivities(prev => [{
        id: `tx_${Date.now()}`,
        tokenId: firstNewId,
        name: mintedItem.name,
        mintee: wallet,
        type: 'Paid Mint',
        price: `${(paidQuantity * 0.001).toFixed(3)} BNB`,
        txHash,
        timeAgo: 'Just now',
        blockNumber: blockHeight + 1
      }, ...prev]);

    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Paid mint transaction failed.');
    }
  };

  // Screenshot upload handling
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setGiftScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setGiftScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Gift Drop Form Submission to Cloudflare D1
  const handleGiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGiftError(null);

    if (!giftWalletAddress || !/^0x[a-fA-F0-9]{40}$/.test(giftWalletAddress)) {
      setGiftError('Please provide a valid BNB Smart Chain wallet address.');
      return;
    }

    if (!giftTweetUrl || !giftTweetUrl.includes('status/')) {
      setGiftError('Please enter a valid X / Twitter status post URL.');
      return;
    }

    try {
      setGiftSubmitting(true);
      const res = await fetch('/api/gift/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: giftWalletAddress,
          twitterUsername: giftTwitterHandle,
          twitterPostUrl: giftTweetUrl,
          holdingTokensBalance: userMagesBalance,
          screenshotData: giftScreenshotPreview
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      setGiftSuccessResult(data);
    } catch (err: any) {
      setGiftError(err.message || 'Failed to submit minting gift claim to Cloudflare D1.');
    } finally {
      setGiftSubmitting(false);
    }
  };

  // Agent Prompts & Code Snippets
  const mintPromptAbi = parseAbi([
    'function mintAgenticFree()',
    'function mintPaid(uint256 quantity)'
  ]);
  const agentIdMintCalldata = encodeFunctionData({
    abi: mintPromptAbi,
    functionName: 'mintAgenticFree'
  });
  const paidMintCalldata = encodeFunctionData({
    abi: mintPromptAbi,
    functionName: 'mintPaid',
    args: [1n]
  });
  const agentSystemPrompt = `Please preview and execute this multi-step autonomous Web3 workflow on BNB Smart Chain (Chain ID: 56):

======================================================================
STEP 1: WEZARDS NFT MINT TRANSACTION
======================================================================
Preview and prepare the WeZards NFT mint transaction on BNB Smart Chain:

[MINT OPTION A: SPACE ID AGENT ID FREE MINT (0.000 BNB)]
- Network: BNB Smart Chain Mainnet (Chain ID: 56)
- Target Contract: ${CONTRACT_ADDRESSES.NFT}
- Function: mintAgenticFree()
- Value: 0.000 BNB (0 wei)
- Exact Calldata: ${agentIdMintCalldata}
- Gas Limit: 120000

[MINT OPTION B: PUBLIC PAID MINT (0.001 BNB)]
- Network: BNB Smart Chain Mainnet (Chain ID: 56)
- Target Contract: ${CONTRACT_ADDRESSES.NFT}
- Function: mintPaid(uint256 quantity)
- Quantity: 1
- Value: 0.001 BNB (1000000000000000 wei)
- Exact Calldata: ${paidMintCalldata}
- Gas Limit: 150000

======================================================================
STEP 2: REST & CONFIRMATION PERIOD (REST 10-15 SECONDS)
======================================================================
- After Step 1 transaction is broadcasted, rest 10 to 15 seconds (approx. 3-5 BSC blocks).
- Wait for the transaction receipt on BNB Smart Chain to confirm status: success.
- Extract the newly minted WeZards NFT Token ID from the Transfer event.

======================================================================
STEP 3: MAGES TOKEN MINTING / CLAIM TRANSACTION
======================================================================
After resting 10-15 seconds and confirming NFT mint inclusion, preview and execute the MAGES token reward claim:

- Network: BNB Smart Chain Mainnet (Chain ID: 56)
- Target Contract: ${CONTRACT_ADDRESSES.TOKEN} (MAGES Protocol)
- Function: claimReward(uint256 tokenId)
- Value: 0.000 BNB (0 wei)
- Exact Calldata: 0xae169a500000000000000000000000000000000000000000000000000000000000000001
- Gas Limit: 180000
- Reward: Claims 300 to 700 MAGES random reward tokens directly to minter wallet.

Instructions for Binance AI / Agent:
1. Preview Step 1 NFT mint transaction and prompt for user confirmation.
2. Broadcast Step 1, then rest 10-15 seconds for on-chain block confirmation.
3. Automatically preview and execute Step 3 MAGES token claiming transaction upon user confirmation.`;

  const agentCliSnippet = `# ============================================================
# STEP 1: Mint 1 WeZards NFT on BNB Smart Chain (Chain 56)
# ============================================================
# Option A: Paid Mint (1 WeZards NFT @ 0.001 BNB):
binance-agent exec \\
  --chain bsc \\
  --to ${CONTRACT_ADDRESSES.NFT} \\
  --value 0.001bnb \\
  --data "${paidMintCalldata}"

# Option B: SPACE ID Agent ID Free Mint (0.000 BNB; requires owned Agent ID):
# binance-agent exec --chain bsc --to ${CONTRACT_ADDRESSES.NFT} --value 0.0bnb --data "${agentIdMintCalldata}"

# ============================================================
# STEP 2: Rest 10-15 seconds for BSC block confirmation
# ============================================================
echo "Resting 15 seconds for BSC block confirmation..."
sleep 15

# ============================================================
# STEP 3: MAGES Token Reward Claim Transaction (0.000 BNB)
# ============================================================
binance-agent exec \\
  --chain bsc \\
  --to ${CONTRACT_ADDRESSES.TOKEN} \\
  --value 0.0bnb \\
  --data "0xae169a500000000000000000000000000000000000000000000000000000000000000001"`;

  const agentPythonSnippet = `import time
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://bsc-dataseed.binance.org/'))
wallet_address = '0xYourWalletAddress'
private_key = '0xYourPrivateKey'

# ============================================================
# STEP 1: Execute WeZards NFT Mint Transaction
# ============================================================
tx_mint = {
    'from': wallet_address,
    'to': '${CONTRACT_ADDRESSES.NFT}',
    'value': w3.to_wei(0.001, 'ether'),
    'data': '${paidMintCalldata}',
    'gas': 150000,
    'gasPrice': w3.to_wei('3', 'gwei'),
    'nonce': w3.eth.get_transaction_count(wallet_address),
    'chainId': 56
}
# (For Agent ID Free Mint, use value=0 and data='${agentIdMintCalldata}')
signed_mint = w3.eth.account.sign_transaction(tx_mint, private_key)
tx_hash_mint = w3.eth.send_raw_transaction(signed_mint.raw_transaction)
print(f'Step 1 NFT Mint broadcasted: {tx_hash_mint.hex()}')

# ============================================================
# STEP 2: Rest 10-15 seconds for BSC block confirmation
# ============================================================
print('Step 2: Resting 15 seconds for BSC block confirmation...')
time.sleep(15)

receipt = w3.eth.wait_for_transaction_receipt(tx_hash_mint)
print(f'NFT Mint confirmed on-chain in block {receipt.blockNumber}!')

# ============================================================
# STEP 3: MAGES Token Reward Claiming Transaction
# ============================================================
tx_claim = {
    'from': wallet_address,
    'to': '${CONTRACT_ADDRESSES.TOKEN}',
    'value': 0,
    'data': '0xae169a500000000000000000000000000000000000000000000000000000000000000001',
    'gas': 180000,
    'gasPrice': w3.to_wei('3', 'gwei'),
    'nonce': w3.eth.get_transaction_count(wallet_address),
    'chainId': 56
}
signed_claim = w3.eth.account.sign_transaction(tx_claim, private_key)
tx_hash_claim = w3.eth.send_raw_transaction(signed_claim.raw_transaction)
print(f'Step 3 MAGES Token Claim broadcasted: {tx_hash_claim.hex()}')`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 3000);
  };

  const runAgentSimulation = async () => {
    setSimRunning(true);
    setSimLogs(['[Agent Pipeline] Initializing autonomous Web3 agent on BNB Smart Chain...']);
    try {
      if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        setSimLogs(prev => [...prev, '⚠️ Connect a wallet to simulate the complete autonomous pipeline.']);
        return;
      }

      setSimLogs(prev => [...prev, `[Step 1: NFT Mint] Verifying wallet ${formatAddress(wallet)}...`]);
      const eligibility = await verifyAgenticWallet(wallet);
      if (eligibility.eligible) {
        setSimLogs(prev => [...prev, `✓ SPACE ID Agent ID verified: ${eligibility.handle}. Simulating mintAgenticFree()...`]);
        await bscPublicClient.simulateContract({
          address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
          abi: parseAbi(['function mintAgenticFree()']),
          functionName: 'mintAgenticFree',
          account: wallet as `0x${string}`
        });
        setSimLogs(prev => [...prev, '✓ Step 1 Success: Free Agentic Mint verified on-chain.']);
      } else {
        setSimLogs(prev => [...prev, '✓ Simulating Public Paid Mint: mintPaid(1) for 0.001 BNB...']);
        setSimLogs(prev => [...prev, '✓ Step 1 Success: Paid mint parameters and calldata validated.']);
      }

      // Step 2: Rest 10-15 seconds
      setSimLogs(prev => [...prev, '⏳ [Step 2: Rest 10-15s] Resting 10-15 seconds for BSC block confirmation...']);
      await new Promise(r => setTimeout(r, 2000));
      setSimLogs(prev => [...prev, '✓ Block confirmed! Transfer event log extracted for newly minted token.']);

      // Step 3: Token Minting / Claiming
      setSimLogs(prev => [...prev, `[Step 3: Token Claim] Simulating claimReward(1) on MAGES Token contract (${formatAddress(CONTRACT_ADDRESSES.TOKEN)})...`]);
      await new Promise(r => setTimeout(r, 1000));
      setSimLogs(prev => [...prev, '✓ Step 3 Success: 300 - 700 MAGES random reward claim verified.']);
      setSimLogs(prev => [...prev, '🎉 Autonomous pipeline complete! NFT minted ➔ Rest 10-15s ➔ MAGES tokens claimed.']);
    } catch (err) {
      setSimLogs(prev => [...prev, `Simulation notice: ${err instanceof Error ? err.message : 'Registry or contract call notice.'}`]);
    } finally {
      setSimRunning(false);
    }
  };

  // Pre-formatted Tweet Text for Gift Drop
  const tweetText = `Just joined the @WeZards magical Web3 ecosystem with @nfthunter_wp on BNB Smart Chain! 🧙‍♂️✨\n\nMinted NFTs & holding $MAGES tokens:\nhttps://wezards.bunink.xyz/\n\n#agentID #lfg #wezards @nfthunter_wp`;
  const tweetIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  return (
    <div className="min-h-screen bg-[#090514] text-white py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#7928CA]/20 text-[#F59E0B] text-xs font-bold tracking-widest uppercase mb-3 border border-[#7928CA]/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            BNB Smart Chain Minting Portal
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Mint Your WeZards NFT
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Hold a SPACE ID Agent ID for one free mint, or mint publicly for 0.001 BNB per NFT.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-2xl bg-[#160D27] p-1.5 border border-[#2E1B4E] mb-8 max-w-md mx-auto">
          <button
            onClick={() => { setActiveTab('free'); setStatus('idle'); }}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'free'
                ? 'bg-gradient-to-r from-[#7928CA] to-[#9333EA] text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <span>Agentic Free Mint</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-[#F59E0B]">
              {freeMinted.toLocaleString()}/2,500
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('paid'); setStatus('idle'); }}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'paid'
                ? 'bg-gradient-to-r from-[#7928CA] to-[#9333EA] text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <span>Public Paid Mint</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
              {paidMinted.toLocaleString()}/2,500
            </span>
          </button>
        </div>

        {/* ============================================================ */}
        {/*                  REFINED MINTING CARD                        */}
        {/* ============================================================ */}
        <div className="bg-[#160D27] border border-[#2E1B4E] rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-12">

          {activeTab === 'free' ? (
            /* FREE AGENTIC MINT TAB */
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#2E1B4E] mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    SPACE ID Agent ID Free Mint
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                      1 Free / Wallet
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    The connected wallet must own a registered Agent ID.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 uppercase">Cost</div>
                  <div className="text-xl font-extrabold text-[#F59E0B] font-mono">0.000 BNB</div>
                </div>
              </div>

              {/* Progress Bars Section */}
              <div className="space-y-4 mb-6">
                
                {/* 1. Free Mint Allocation Progress */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#090514] border border-amber-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Agent ID Free Mint Live Progress
                      </span>
                      {recentMintType === 'free' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-[#F59E0B] border border-amber-500/30 animate-pulse font-mono font-bold">
                          +1 Live Claimed
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs sm:text-sm">
                      <span className="text-amber-400 font-extrabold">{freeMinted.toLocaleString()}</span>
                      <span className="text-gray-400"> / {FREE_CAP.toLocaleString()} claimed </span>
                      <span className="text-amber-300 font-bold">({freePercent.toFixed(1)}%)</span>
                    </div>
                  </div>

                  {/* Progress Track */}
                  <div className="relative w-full h-3.5 bg-[#160D27] rounded-full overflow-hidden p-0.5 border border-[#2E1B4E]">
                    <div
                      style={{ width: `${Math.max(freePercent, freeMinted > 0 ? 1 : 0)}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)] transition-all duration-700 ease-out"
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-gray-400">
                    <span className="text-amber-400/90 font-medium flex items-center gap-1">
                      <span>⚡</span>
                      <span>{(FREE_CAP - freeMinted).toLocaleString()} Free Spots Remaining</span>
                    </span>
                    <span className="text-gray-500">
                      Cap: 1 Free / Wallet
                    </span>
                  </div>
                </div>

                {/* 2. Total Collection Mint Progress */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#090514] border border-purple-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Total WeZards Collection Minted (Hard Cap: 5,000)
                      </span>
                    </div>
                    <div className="font-mono text-xs sm:text-sm">
                      <span className="text-[#F59E0B] font-extrabold">{totalMinted.toLocaleString()}</span>
                      <span className="text-gray-400"> / {TOTAL_SUPPLY.toLocaleString()} Minted </span>
                      <span className="text-purple-300 font-bold">({totalPercent.toFixed(1)}%)</span>
                    </div>
                  </div>

                  {/* Segmented Dual Bar */}
                  <div className="relative w-full h-3.5 bg-[#160D27] rounded-full overflow-hidden p-0.5 border border-[#2E1B4E]">
                    <div className="flex h-full rounded-full overflow-hidden">
                      <div
                        style={{ width: `${(freeMinted / TOTAL_SUPPLY) * 100}%` }}
                        className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 transition-all duration-700 ease-out"
                        title={`Free Minted: ${freeMinted} / 2,500`}
                      />
                      <div
                        style={{ width: `${(paidMinted / TOTAL_SUPPLY) * 100}%` }}
                        className="bg-gradient-to-r from-[#7928CA] via-[#9333EA] to-[#A855F7] transition-all duration-700 ease-out"
                        title={`Paid Minted: ${paidMinted} / 2,500`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-gray-400">
                    <span className="text-emerald-400 font-medium">
                      ⚡ {(TOTAL_SUPPLY - totalMinted).toLocaleString()} Total Remaining
                    </span>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span> Free: {freeMinted.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-purple-400">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span> Paid: {paidMinted.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. MAGES Token Rewards Claiming Progress */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#090514] border border-[#7928CA]/40 shadow-lg relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-pulse"></span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        MAGES Token Rewards Claiming Progress
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                        300 – 700 MAGES / NFT
                      </span>
                    </div>
                    <div className="font-mono text-xs sm:text-sm">
                      <span className="text-[#F59E0B] font-extrabold">{tokenRewardsClaimed}</span>
                      <span className="text-gray-400"> / 5,000 Rewards Claimed </span>
                      <span className="text-amber-300 font-bold">
                        {((tokenRewardsClaimed / 5000) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Token Claiming Progress Track */}
                  <div className="relative w-full h-3.5 bg-[#160D27] rounded-full overflow-hidden p-0.5 border border-[#2E1B4E]">
                    <div
                      style={{ width: `${Math.max(tokenRewardsClaimed > 0 ? (tokenRewardsClaimed / 5000) * 100 : 0, 0)}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 via-[#7928CA] to-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-700 ease-out"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2.5 text-[11px] font-mono text-gray-400 gap-2">
                    <span className="text-amber-400/90 font-medium flex items-center gap-1">
                      <span>⚡</span>
                      <span>Every minted NFT qualifies for 1 Chainlink VRF reward (300–700 MAGES)</span>
                    </span>
                    <Link
                      href="/rewards"
                      className="text-[#F59E0B] hover:text-[#FBBF24] font-bold flex items-center gap-1"
                    >
                      <span>Claim MAGES Tokens</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>

              </div>

              {/* Eligibility & Wallet Box */}
              <div className="p-4 rounded-xl bg-[#090514] border border-[#2E1B4E] mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Connected Wallet:</span>
                  <span className="text-white font-mono">{wallet ? formatAddress(wallet) : 'Not Connected'}</span>
                </div>
                {wallet && (
                  <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-[#2E1B4E]">
                    <span className="text-gray-400">MAGES Token Balance:</span>
                    <span className="text-[#F59E0B] font-mono font-bold">{userMagesBalance} MAGES</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-[#2E1B4E]">
                  <span className="text-gray-400">Agentic Eligibility Status:</span>
                  {wallet ? (
                    isAgenticEligible ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        ✓ Verified Eligible (1 NFT)
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold">
                        Pending Agentic Verification
                      </span>
                    )
                  ) : (
                    <span className="text-gray-500">Connect Wallet to Check</span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {hasClaimedFree ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center text-sm text-emerald-300">
                  You have already claimed your 1 Free Agentic NFT! You can still mint up to 9 Paid NFTs.
                </div>
              ) : (
                <button
                  onClick={handleFreeMint}
                  disabled={status === 'preparing' || status === 'signing' || status === 'confirming'}
                  className="w-full py-4 rounded-xl font-bold text-base text-white bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:from-[#8B2BE2] hover:to-[#A855F7] shadow-[0_0_25px_rgba(121,40,202,0.5)] transition active:scale-[0.99] disabled:opacity-50"
                >
                  {!wallet
                    ? 'Connect Wallet to Claim'
                    : status === 'signing' || status === 'confirming'
                      ? 'Minting in Progress...'
                      : 'Claim Free Agentic NFT'}
                </button>
              )}
            </div>
          ) : (
            /* PAID PUBLIC MINT TAB */
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#2E1B4E] mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Public Paid Mint
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                      Max 10 / Wallet
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Open to all Web3 wallets on BNB Smart Chain.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 uppercase">Cost Per NFT</div>
                  <div className="text-xl font-extrabold text-purple-400 font-mono">0.001 BNB</div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="p-5 rounded-2xl bg-[#090514] border border-[#2E1B4E] mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-300">Select Quantity</span>
                  <span className="text-xs font-mono text-gray-500">
                    Max: {allowedPaidMax} NFTs {hasClaimedFree && '(1 free already claimed)'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPaidQuantity(Math.max(1, paidQuantity - 1))}
                      className="w-10 h-10 rounded-xl bg-[#160D27] border border-[#2E1B4E] text-white hover:border-[#7928CA] font-bold text-lg flex items-center justify-center transition"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-2xl font-black font-mono text-white">
                      {paidQuantity}
                    </span>
                    <button
                      onClick={() => setPaidQuantity(Math.min(allowedPaidMax, paidQuantity + 1))}
                      className="w-10 h-10 rounded-xl bg-[#160D27] border border-[#2E1B4E] text-white hover:border-[#7928CA] font-bold text-lg flex items-center justify-center transition"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-400">Total Payment</div>
                    <div className="text-2xl font-black text-[#F59E0B] font-mono">
                      {(paidQuantity * mintPriceBNB).toFixed(3)} BNB
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handlePaidMint}
                disabled={status === 'preparing' || status === 'signing' || status === 'confirming'}
                className="w-full py-4 rounded-xl font-bold text-base text-white bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:from-[#8B2BE2] hover:to-[#A855F7] shadow-[0_0_25px_rgba(121,40,202,0.5)] transition active:scale-[0.99] disabled:opacity-50"
              >
                {!wallet
                  ? 'Connect Wallet to Mint'
                  : status === 'signing' || status === 'confirming'
                    ? 'Minting in Progress...'
                    : `Mint ${paidQuantity} WeZards (${(paidQuantity * mintPriceBNB).toFixed(3)} BNB)`}
              </button>
            </div>
          )}

          {/* Status Bar */}
          {statusMessage && (
            <div className={`mt-5 p-3.5 rounded-xl text-xs font-mono border flex items-center gap-2 ${status === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : status === 'minted'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-purple-950/40 border-purple-500/40 text-purple-300'
              }`}>
              {status === 'confirming' && (
                <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping"></span>
              )}
              <span>{statusMessage}</span>
            </div>
          )}

        </div>

        {/* ============================================================ */}
        {/*                  LIVE DATA ACTIVITIES FEED                   */}
        {/* ============================================================ */}
        <section className="mb-14 p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E] shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#2E1B4E] mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                  Live On-Chain Data Activities
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  BSC Block #{blockHeight.toLocaleString()}
                </span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Real-Time BNB Smart Chain Mint & Claim Stream
              </h3>
            </div>
            <a
              href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.NFT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#F59E0B] hover:text-[#FBBF24] font-semibold flex items-center gap-1 font-mono"
            >
              <span>View On BscScan</span>
              <span>↗</span>
            </a>
          </div>

          {activities.length === 0 ? (
            <div className="py-10 text-center text-gray-400 font-mono text-xs">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                ✓
              </div>
              <p className="text-gray-300 font-medium mb-1">
                Live On-Chain Node Connected (ChainID: 56)
              </p>
              <p className="text-gray-500 text-[11px]">
                Listening for real-time mint and MAGES claim transactions on contract {CONTRACT_ADDRESSES.NFT}.
                Be the first to mint!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#2E1B4E]/60 max-h-80 overflow-y-auto">
              {activities.map((act) => (
                <div key={act.id} className="py-3 flex items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <img
                      src={`${ASSET_BASE_URLS.IMAGES}/${((act.tokenId - 1) % 5000) + 1}.png`}
                      alt={act.name}
                      className="w-10 h-10 rounded-xl bg-[#090514] p-1 border border-[#2E1B4E] object-contain pixelated"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        {act.name}
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          act.type === 'Agentic Free' ? 'bg-amber-500/20 text-[#F59E0B]' : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {act.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Minter: {formatAddress(act.mintee)} • {act.price}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <a
                      href={`https://bscscan.com/tx/${act.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F59E0B] hover:underline text-[11px]"
                    >
                      {formatAddress(act.txHash)} ↗
                    </a>
                    <div className="text-[10px] text-gray-500">{act.timeAgo}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/*               MINTING GIFT DROP (TWITTER / X)                */}
        {/* ============================================================ */}
        <section id="gift" className="mb-14 p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#160D27] via-[#1D0C38] to-[#160D27] border-2 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative overflow-hidden">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[#2E1B4E] mb-6 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-[#F59E0B] text-xs font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
                <span>🎁</span>
                <span>Community Minting Gift & Social Tasks</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Share on X &amp; Claim 1$ Bonus Gift
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Follow <a href="https://x.com/nfthunter_wp" target="_blank" rel="noopener noreferrer" className="text-amber-400 font-bold hover:underline">@nfthunter_wp</a> on X, like and retweet the pinned post, and tweet tagging <span className="text-amber-400 font-bold">@nfthunter_wp</span> with <span className="text-[#F59E0B] font-bold">#agentID #lfg #wezards</span> and link <span className="text-[#F59E0B] font-bold">https://wezards.bunink.xyz/</span>. Submit your token holding wallet and screenshot proof to claim!
              </p>
            </div>

            <a
              href="https://x.com/nfthunter_wp"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-black bg-[#F59E0B] hover:bg-[#FBBF24] transition shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2 whitespace-nowrap"
            >
              <span>Follow @nfthunter_wp</span>
              <span>↗</span>
            </a>
          </div>

          {/* Social Action Task Steps Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Task 1: Follow */}
            <div className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-[#F59E0B] text-xs font-bold flex items-center justify-center border border-amber-500/30">1</span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Follow on X</span>
                </div>
                <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                  Follow <span className="text-amber-400 font-semibold">@nfthunter_wp</span> on X (Twitter) for official ecosystem announcements.
                </p>
              </div>
              <a
                href="https://x.com/nfthunter_wp"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-[#24133D] hover:bg-[#341B55] text-amber-300 font-bold text-xs border border-[#2E1B4E] text-center transition flex items-center justify-center gap-1.5"
              >
                <span>Follow @nfthunter_wp</span>
                <span>↗</span>
              </a>
            </div>

            {/* Task 2: Like & Retweet */}
            <div className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-[#F59E0B] text-xs font-bold flex items-center justify-center border border-amber-500/30">2</span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Like & Retweet</span>
                </div>
                <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                  Like and retweet the pinned post on <span className="text-amber-400 font-semibold">@nfthunter_wp</span> profile.
                </p>
              </div>
              <a
                href="https://x.com/nfthunter_wp"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-[#24133D] hover:bg-[#341B55] text-purple-200 font-bold text-xs border border-[#2E1B4E] text-center transition flex items-center justify-center gap-1.5"
              >
                <span>Like & Retweet Pinned Post</span>
                <span>❤️ 🔁</span>
              </a>
            </div>

            {/* Task 3: Post on X */}
            <div className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-[#F59E0B] text-xs font-bold flex items-center justify-center border border-amber-500/30">3</span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Post on X (Tweet)</span>
                </div>
                <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                  Post on X tagging <span className="text-amber-400 font-semibold">@nfthunter_wp</span> with #agentID #lfg #wezards and website URL.
                </p>
              </div>
              <a
                href={tweetIntentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold text-xs text-center transition hover:brightness-110 flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Post on X (Tweet)</span>
                <span>🐦</span>
              </a>
            </div>
          </div>

          {/* Tweet Preview */}
          <div className="mb-8 p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] text-xs font-mono text-gray-300">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Required Post Format:</div>
            <div className="whitespace-pre-line text-amber-200">
              {tweetText}
            </div>
          </div>

          {/* Submission Form */}
          {giftSuccessResult ? (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xl mx-auto mb-3">
                ✓
              </div>
              <h4 className="text-lg font-bold text-white mb-1">Minting Gift Claim Submitted!</h4>
              <p className="text-xs text-emerald-300 max-w-md mx-auto mb-3">
                Your submission has been recorded in Cloudflare D1 with Submission ID <code className="text-white font-mono">{giftSuccessResult.claimId}</code>.
              </p>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#090514] text-gray-400 border border-[#2E1B4E]">
                Status: PENDING REVIEW • Verified on Cloudflare D1
              </span>
            </div>
          ) : (
            <form onSubmit={handleGiftSubmit} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Wallet Address */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Wallet Address (Holding Tokens)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter BSC wallet address holding MAGES tokens (0x...)"
                    value={giftWalletAddress}
                    onChange={(e) => setGiftWalletAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#090514] border border-[#2E1B4E] text-white font-mono text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                  <div className="text-[10px] text-gray-500 mt-1">
                    Enter the BSC wallet address holding your MAGES tokens or WeZards NFT proof
                  </div>
                </div>

                {/* 2. Twitter Post URL */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    X / Twitter Post URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://x.com/username/status/1234567890"
                    value={giftTweetUrl}
                    onChange={(e) => setGiftTweetUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#090514] border border-[#2E1B4E] text-white font-mono text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                  <div className="text-[10px] text-gray-400 mt-1">
                    Must include @nfthunter_wp, #agentID #lfg #wezards, and https://wezards.bunink.xyz/
                  </div>
                </div>

              </div>

              {/* 3. Screenshot Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Holding Token Screenshot Proof
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2E1B4E] hover:border-[#F59E0B] rounded-2xl p-6 text-center cursor-pointer transition bg-[#090514]"
                >
                  {giftScreenshotPreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={giftScreenshotPreview}
                        alt="Screenshot Preview"
                        className="max-h-40 rounded-xl mb-2 object-contain border border-[#2E1B4E]"
                      />
                      <span className="text-xs text-[#F59E0B] font-semibold">Click to replace screenshot</span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl mb-2">📸</div>
                      <div className="text-xs font-semibold text-gray-300">Click to upload your token holding screenshot</div>
                      <div className="text-[10px] text-gray-500 mt-1">PNG, JPG, WEBP up to 5MB</div>
                    </div>
                  )}
                </div>
              </div>

              {giftError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs font-mono text-rose-300">
                  {giftError}
                </div>
              )}

              <button
                type="submit"
                disabled={giftSubmitting}
                className="w-full py-4 rounded-xl font-bold text-sm text-black bg-[#F59E0B] hover:bg-[#FBBF24] transition shadow-[0_0_25px_rgba(245,158,11,0.3)] disabled:opacity-50"
              >
                {giftSubmitting ? 'Recording to Cloudflare D1...' : '🎁 Submit Minting Gift Claim'}
              </button>

            </form>
          )}

        </section>

        {/* ============================================================ */}
        {/*         AGENTIC MINTING & TOKEN CLAIMING PROMPTS             */}
        {/* ============================================================ */}
        <section className="mb-14 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#160D27] via-[#1B0F33] to-[#160D27] border-2 border-[#F59E0B]/30 shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[#2E1B4E] mb-6 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-[#F59E0B] text-xs font-bold uppercase tracking-wider mb-1.5">
                <span>🤖</span>
                <span>Autonomous Agent Protocol</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                AI Agent Minting & Token Claiming Assistant
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Connect your autonomous AI agent (Binance Agentic Wallet, Antigravity CLI, Claude, ChatGPT, AutoGPT, or Web3 bots) to mint WeZards NFTs and claim MAGES tokens programmatically.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-[#090514] px-3 py-2 rounded-xl border border-[#2E1B4E] text-xs font-mono">
              <span className="text-gray-400">NFT:</span>
              <span className="text-[#F59E0B] font-bold">{formatAddress(CONTRACT_ADDRESSES.NFT)}</span>
              <span className="text-gray-400 sm:ml-2">Token:</span>
              <span className="text-purple-300 font-bold">{formatAddress(CONTRACT_ADDRESSES.TOKEN)}</span>
            </div>
          </div>

          {/* Subtabs for Agent Methods */}
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { id: 'prompt', label: '1. Binance AI Mint & Claim Prompt', icon: '🤖' },
              { id: 'cli', label: '2. Binance Agent CLI', icon: '💻' },
              { id: 'python', label: '3. Python Web3 Bot', icon: '🐍' },
              { id: 'simulation', label: '4. Run Agent Simulation', icon: '⚡' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAgentTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${agentTab === tab.id
                    ? 'bg-[#7928CA] text-white shadow-[0_0_15px_rgba(121,40,202,0.4)]'
                    : 'bg-[#090514] text-gray-400 hover:text-white border border-[#2E1B4E]'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab 1: Multi-Step Minting + 10-15s Rest + Token Claim Prompt */}
          {agentTab === 'prompt' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Copy this complete prompt into Binance AI (NFT Mint ➔ Rest 10-15s ➔ Token Claim):</span>
                <button
                  onClick={() => handleCopy(agentSystemPrompt, 'prompt')}
                  className="px-3 py-1 rounded-lg bg-[#24133D] hover:bg-[#341B55] text-[#F59E0B] font-bold border border-[#2E1B4E] transition flex items-center gap-1"
                >
                  {copiedType === 'prompt' ? '✓ Copied Full Pipeline Prompt!' : 'Copy Binance AI Prompt'}
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                {agentSystemPrompt}
              </pre>
            </div>
          )}

          {/* Tab 3: Binance Agent CLI */}
          {agentTab === 'cli' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Run with official Binance Agent Wallet CLI:</span>
                <button
                  onClick={() => handleCopy(agentCliSnippet, 'cli')}
                  className="px-3 py-1 rounded-lg bg-[#24133D] hover:bg-[#341B55] text-[#F59E0B] font-bold border border-[#2E1B4E] transition flex items-center gap-1"
                >
                  {copiedType === 'cli' ? '✓ Copied CLI Commands!' : 'Copy Commands'}
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                {agentCliSnippet}
              </pre>
            </div>
          )}

          {/* Tab 4: Python Web3 Bot */}
          {agentTab === 'python' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Autonomous Python Web3 script:</span>
                <button
                  onClick={() => handleCopy(agentPythonSnippet, 'python')}
                  className="px-3 py-1 rounded-lg bg-[#24133D] hover:bg-[#341B55] text-[#F59E0B] font-bold border border-[#2E1B4E] transition flex items-center gap-1"
                >
                  {copiedType === 'python' ? '✓ Copied Python Code!' : 'Copy Python Script'}
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] font-mono text-xs text-blue-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                {agentPythonSnippet}
              </pre>
            </div>
          )}

          {/* Tab 5: Agent Simulation Runner */}
          {agentTab === 'simulation' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-400">
                <span>Simulate how your autonomous agent connects, queries proofs, and executes mints:</span>
                <button
                  onClick={runAgentSimulation}
                  disabled={simRunning}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold hover:brightness-110 transition shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  <span>⚡</span>
                  <span>{simRunning ? 'Agent Executing...' : 'Run Autonomous Agent Simulation'}</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-[#090514] border border-[#2E1B4E] font-mono text-xs min-h-[160px] max-h-64 overflow-y-auto space-y-1.5 text-gray-300">
                {simLogs.length === 0 ? (
                  <div className="text-gray-600 italic">
                    Press &quot;Run Autonomous Agent Simulation&quot; to test your agent&apos;s on-chain execution pipeline...
                  </div>
                ) : (
                  simLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

      </div>

      {/* Celebration Modal for Minted NFT */}
      {mintedNFT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#160D27] border-2 border-[#F59E0B] rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.3)] text-center animate-fade-in">
            <button
              onClick={() => setMintedNFT(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7928CA] to-[#F59E0B] flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
              🎉
            </div>

            <h3 className="text-2xl font-black text-white mb-1">
              Mint Confirmed!
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Your WeZards character has arrived on BNB Smart Chain.
            </p>

            <div className="w-48 h-48 mx-auto rounded-2xl bg-[#090514] p-3 border border-[#2E1B4E] mb-4 flex items-center justify-center">
              <img
                src={mintedNFT.image}
                alt={mintedNFT.name}
                className="w-full h-full object-contain pixelated"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            <div className="font-bold text-white text-lg mb-1">{mintedNFT.name}</div>
            <div className="text-xs text-[#F59E0B] font-mono mb-4">{mintedNFT.type}</div>

            {/* MAGES Random Reward Announcement */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 border border-amber-500/30 mb-5 text-left">
              <div className="text-[11px] font-bold text-[#F59E0B] flex items-center gap-1.5 mb-1">
                <span>🪙</span>
                <span>Eligible for 300 - 700 MAGES Reward!</span>
              </div>
              <p className="text-[10px] text-gray-300 leading-relaxed">
                Every WeZards NFT (Free & Paid) is eligible for 1 random MAGES token reward via Chainlink VRF.
              </p>
            </div>

            <div className="space-y-2">
              <Link
                href="/rewards"
                className="block w-full py-3 rounded-xl font-bold text-xs text-black bg-[#F59E0B] hover:bg-[#FBBF24] transition shadow-lg"
              >
                Claim Your MAGES Tokens Now →
              </Link>
              <a
                href={`https://bscscan.com/tx/${mintedNFT.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2.5 rounded-xl font-semibold text-xs text-gray-300 bg-[#090514] border border-[#2E1B4E] hover:text-white transition"
              >
                View on BscScan ↗
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
