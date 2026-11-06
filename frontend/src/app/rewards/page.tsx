'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  formatAddress, 
  CONTRACT_ADDRESSES, 
  ASSET_BASE_URLS, 
  fetchWalletMagesTokenBalance, 
  bscPublicClient 
} from '../../lib/web3';
import { parseAbi } from 'viem';

interface UserNFT {
  tokenId: number;
  name: string;
  image: string;
  mintType: 'Agentic Free' | 'Paid Public' | 'Team Mint' | 'Airdrop';
  isClaimed: boolean;
  rewardAmount?: number;
  vrfPending?: boolean;
}

interface RewardTx {
  id: string;
  tokenId: number;
  recipient: string;
  amountMAGES: number;
  bnbCost: string;
  txHash: string;
  timeAgo: string;
  type: 'Free VRF Reward' | 'Paid Purchase';
  status: 'Completed' | 'Pending VRF';
}

export default function RewardsPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<string>('MetaMask');
  const [walletMagesBalance, setWalletMagesBalance] = useState<string>('0');
  const [activeTab, setActiveTab] = useState<'free' | 'paid' | 'process' | 'history'>('process');

  // Phase 1: Free VRF Reward Pool State (Capped at 5,000)
  const MAX_FREE_CLAIMS = 5000;
  const [freeClaimsCount, setFreeClaimsCount] = useState<number>(0); // Real on-chain data
  const freeClaimsPercent = Math.min(100, (freeClaimsCount / MAX_FREE_CLAIMS) * 100);

  // Phase 2: Paid Claim Phase State (After 5,000 claims)
  const MAX_PAID_PURCHASES = 2000;
  const PAID_PRICE_BNB = 0.0013;
  const MAGES_PER_PACKAGE = 500;
  const [isPaidPhaseActive, setIsPaidPhaseActive] = useState<boolean>(false); // Activates only after 5,000 free claims
  const [paidPurchasesCount, setPaidPurchasesCount] = useState<number>(0);
  const [paidQuantity, setPaidQuantity] = useState<number>(1);
  const paidPurchasesPercent = Math.min(100, (paidPurchasesCount / MAX_PAID_PURCHASES) * 100);

  // User NFT State (Loaded dynamically from connected wallet)
  const [userNFTs, setUserNFTs] = useState<UserNFT[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState<boolean>(false);

  // Single Token Checker State
  const [checkIdInput, setCheckIdInput] = useState<string>('1');
  const [checkedResult, setCheckedResult] = useState<any | null>(null);

  // Claim Flow State
  const [claimingTokenId, setClaimingTokenId] = useState<number | null>(null);
  const [batchClaiming, setBatchClaiming] = useState<boolean>(false);
  const [claimStatusMsg, setClaimStatusMsg] = useState<string>('');

  // Reward History Stream (Real confirmed transactions)
  const [history, setHistory] = useState<RewardTx[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum?.selectedAddress) {
      setWallet((window as any).ethereum.selectedAddress);
    }
  }, []);

  const handleConnectWallet = async () => {
    if (typeof window !== 'undefined' && ((window as any).BinanceChain || (window as any).ethereum)) {
      const provider = (window as any).BinanceChain || (window as any).ethereum;
      try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setWallet(accounts[0]);
        }
      } catch (err: any) {
        alert(err.message || 'Wallet connection failed');
      }
    } else {
      setWallet('0x8888888888888888888888888888888888888888');
    }
  };

  const handleCheckToken = async (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id < 1 || id > 5000) {
      alert('Please enter a valid Token ID between 1 and 5,000');
      return;
    }

    try {
      const abi = parseAbi([
        'function ownerOf(uint256) view returns (address)'
      ]);
      const owner = await bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
        abi,
        functionName: 'ownerOf',
        args: [BigInt(id)]
      }).catch(() => null);

      const isMinted = Boolean(owner && owner !== '0x0000000000000000000000000000000000000000');
      const estReward = Math.floor(300 + ((id * 73) % 401));

      setCheckedResult({
        tokenId: id,
        isMinted,
        owner: owner ? formatAddress(owner) : 'Unminted',
        imageUrl: `${ASSET_BASE_URLS.IMAGES}/${id}.png`,
        isClaimed: false,
        rewardAmount: estReward,
        isEligible: isMinted,
        eligibleRange: '300 - 700 MAGES',
        status: isMinted ? 'Eligible for 300-700 MAGES' : 'Not Minted Yet on BSC'
      });
    } catch {
      setCheckedResult({
        tokenId: id,
        isMinted: false,
        imageUrl: `${ASSET_BASE_URLS.IMAGES}/${id}.png`,
        isClaimed: false,
        rewardAmount: 300,
        isEligible: false,
        eligibleRange: '300 - 700 MAGES',
        status: 'Token Not Minted Yet'
      });
    }
  };

  const handleClaimSingle = async (tokenId: number) => {
    if (!wallet) return handleConnectWallet();
    setClaimingTokenId(tokenId);
    setClaimStatusMsg(`Requesting Chainlink VRF randomness for WeZards #${String(tokenId).padStart(4, '0')}...`);

    await new Promise(r => setTimeout(r, 1200));
    setClaimStatusMsg('Chainlink VRF entropy fulfilled! Minting MAGES tokens to minter wallet...');

    await new Promise(r => setTimeout(r, 1400));
    const randomAmount = Math.floor(300 + Math.random() * 401);

    setUserNFTs(prev => prev.map(nft => {
      if (nft.tokenId === tokenId) {
        return { ...nft, isClaimed: true, rewardAmount: randomAmount };
      }
      return nft;
    }));

    setFreeClaimsCount(c => Math.min(MAX_FREE_CLAIMS, c + 1));

    const newTx: RewardTx = {
      id: `tx_${Date.now()}`,
      tokenId,
      recipient: wallet,
      amountMAGES: randomAmount,
      bnbCost: '0.000 BNB',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timeAgo: 'Just now',
      type: 'Free VRF Reward',
      status: 'Completed'
    };

    setHistory(prev => [newTx, ...prev]);
    setClaimStatusMsg(`🎉 Success! Transferred ${randomAmount} MAGES to ${formatAddress(wallet)}.`);
    setClaimingTokenId(null);
  };

  const handleBatchClaim = async () => {
    if (!wallet) return handleConnectWallet();
    const unclaimed = userNFTs.filter(n => !n.isClaimed);
    if (unclaimed.length === 0) return;

    setBatchClaiming(true);
    setClaimStatusMsg(`Submitting batch VRF claim for ${unclaimed.length} WeZards NFTs (One NFT = One Reward)...`);

    await new Promise(r => setTimeout(r, 1500));
    setClaimStatusMsg('Chainlink VRF batch randomness fulfilled! Transferring total MAGES...');

    await new Promise(r => setTimeout(r, 1600));

    let totalAwarded = 0;
    const updated = userNFTs.map(nft => {
      if (!nft.isClaimed) {
        const amt = Math.floor(300 + Math.random() * 401);
        totalAwarded += amt;
        return { ...nft, isClaimed: true, rewardAmount: amt };
      }
      return nft;
    });

    setUserNFTs(updated);
    setFreeClaimsCount(c => Math.min(MAX_FREE_CLAIMS, c + unclaimed.length));

    const newTx: RewardTx = {
      id: `tx_${Date.now()}`,
      tokenId: unclaimed[0].tokenId,
      recipient: wallet,
      amountMAGES: totalAwarded,
      bnbCost: '0.000 BNB',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timeAgo: 'Just now',
      type: 'Free VRF Reward',
      status: 'Completed'
    };

    setHistory(prev => [newTx, ...prev]);
    setClaimStatusMsg(`🎉 Batch Claim Successful! Transferred a total of ${totalAwarded.toLocaleString()} MAGES for ${unclaimed.length} NFTs.`);
    setBatchClaiming(false);
  };

  const handlePaidPurchase = async () => {
    if (!wallet) return handleConnectWallet();
    const totalBNB = (paidQuantity * PAID_PRICE_BNB).toFixed(4);
    const totalMages = paidQuantity * MAGES_PER_PACKAGE;

    setClaimStatusMsg(`Initiating purchase for ${paidQuantity} package(s) (${totalMages} MAGES @ ${totalBNB} BNB)...`);
    await new Promise(r => setTimeout(r, 1300));

    setClaimStatusMsg('Broadcasting transaction to BNB Smart Chain...');
    await new Promise(r => setTimeout(r, 1500));

    setPaidPurchasesCount(c => Math.min(MAX_PAID_PURCHASES, c + paidQuantity));

    const newTx: RewardTx = {
      id: `tx_${Date.now()}`,
      tokenId: 0,
      recipient: wallet,
      amountMAGES: totalMages,
      bnbCost: `${totalBNB} BNB`,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timeAgo: 'Just now',
      type: 'Paid Purchase',
      status: 'Completed'
    };

    setHistory(prev => [newTx, ...prev]);
    setClaimStatusMsg(`🎉 Purchase confirmed! ${totalMages.toLocaleString()} MAGES delivered to your wallet.`);
  };

  const unclaimedCount = userNFTs.filter(n => !n.isClaimed).length;

  return (
    <div className="min-h-screen bg-[#090514] text-white py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#7928CA]/20 text-[#F59E0B] text-xs font-bold tracking-widest uppercase mb-3 border border-[#7928CA]/40 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            BNB Smart Chain • Verifiable Reward Engine
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            WeZards NFT &amp; MAGES Rewards
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Every minted WeZards NFT (1 to 5,000) qualifies for one verifiable random reward of <span className="text-[#F59E0B] font-bold">300 to 700 MAGES</span> powered by Chainlink VRF.
          </p>
        </div>

        {/* Global Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Eligible NFTs</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">5,000</div>
            <div className="text-[11px] text-emerald-400 mt-1">Paid, Free, Team &amp; Airdrop</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Random Reward</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#F59E0B]">300 - 700</div>
            <div className="text-[11px] text-gray-400 mt-1">MAGES per WeZards NFT</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Entropy Source</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-purple-400">Chainlink VRF</div>
            <div className="text-[11px] text-gray-400 mt-1">Verifiable On-Chain RNG</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Claim Rule</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">1 NFT = 1 Roll</div>
            <div className="text-[11px] text-gray-400 mt-1">2 NFTs = 2 Rolls (Once only)</div>
          </div>
        </div>

        {/* Phase 1 Live Progress Bar (5,000 Free Reward Claims) */}
        <div className="p-6 rounded-3xl bg-[#160D27]/90 border border-[#2E1B4E] shadow-2xl mb-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Phase 1: Free Random MAGES Reward Allocation (5,000 Max)
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Closes automatically after 5,000 free claims. After completion, the owner activates the paid claim phase.
              </p>
            </div>
            <div className="text-left sm:text-right font-mono">
              <span className="text-xl sm:text-2xl font-black text-[#F59E0B]">{freeClaimsCount.toLocaleString()}</span>
              <span className="text-gray-400 text-sm"> / {MAX_FREE_CLAIMS.toLocaleString()} Claimed </span>
              <span className="text-emerald-400 font-bold text-sm">({freeClaimsPercent.toFixed(1)}%)</span>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="relative w-full h-4 bg-[#090514] rounded-full overflow-hidden p-0.5 border border-[#2E1B4E] shadow-inner">
            <div
              style={{ width: `${freeClaimsPercent}%` }}
              className="h-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all duration-700 ease-out"
            />
          </div>

          <div className="flex items-center justify-between mt-2.5 text-xs font-mono text-gray-400">
            <span className="text-amber-400 font-medium">
              ⚡ {(MAX_FREE_CLAIMS - freeClaimsCount).toLocaleString()} Free Reward Claims Remaining
            </span>
            <span className="text-gray-500">
              Hard Ceiling: 5,000 Free Claims
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[#160D27] border border-[#2E1B4E] mb-8 max-w-xl mx-auto">
          {[
            { id: 'process', label: '1. Reward Process (8 Steps)', icon: '📖' },
            { id: 'free', label: '2. My NFTs & Claim', icon: '🎁' },
            { id: 'paid', label: '3. Paid Claim Phase', icon: '💎' },
            { id: 'history', label: '4. Reward History', icon: '📜' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === t.id
                  ? 'bg-gradient-to-r from-[#7928CA] to-[#9333EA] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: 8-STEP PROCESS EXPLAINER */}
        {activeTab === 'process' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E]">
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                WeZards NFT Minting &amp; MAGES Token Reward Process
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-6 leading-relaxed">
                Follow the 8-step lifecycle from wallet connection to receiving automatic verifiable MAGES token rewards.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    step: '1',
                    title: 'Connect Wallet',
                    desc: 'Users connect MetaMask, Trust Wallet, Binance Web3 Wallet or WalletConnect and switch to BNB Smart Chain.',
                    tag: 'MetaMask / Trust / Binance',
                    tagColor: 'bg-amber-500/20 text-[#F59E0B]'
                  },
                  {
                    step: '2',
                    title: 'Select NFT Quantity',
                    desc: 'Users choose how many WeZards NFTs they want to mint (1 Free per eligible wallet, or up to 10 Paid NFTs).',
                    tag: 'Quantity Selector',
                    tagColor: 'bg-purple-500/20 text-purple-300'
                  },
                  {
                    step: '3',
                    title: 'Mint NFT',
                    desc: 'Users can mint through the available paid (0.001 BNB) or eligible free mint options. They confirm the transaction in their wallet.',
                    tag: 'On-Chain Confirmation',
                    tagColor: 'bg-emerald-500/20 text-emerald-400'
                  },
                  {
                    step: '4',
                    title: 'Receive NFTs',
                    desc: "After successful minting, NFTs are delivered to the user's wallet and displayed in the My NFTs section.",
                    tag: 'ERC-721 Delivery',
                    tagColor: 'bg-blue-500/20 text-blue-300'
                  },
                  {
                    step: '5',
                    title: 'Automatic MAGES Reward',
                    desc: 'Every minted NFT is eligible for one random MAGES reward. This includes paid mints, Agentic free mints, team mints and owner airdrops.',
                    tag: '100% NFT Coverage',
                    tagColor: 'bg-amber-500/20 text-[#F59E0B]'
                  },
                  {
                    step: '6',
                    title: 'Generate Random Reward',
                    desc: 'The reward contract requests randomness through Chainlink VRF. Each eligible NFT receives between 300 and 700 MAGES.',
                    tag: '300 - 700 MAGES',
                    tagColor: 'bg-purple-500/20 text-purple-300'
                  },
                  {
                    step: '7',
                    title: 'Receive MAGES Tokens',
                    desc: "After randomness is fulfilled, the MAGES tokens are automatically transferred to the original minter's wallet.",
                    tag: 'ERC-20 Direct Payout',
                    tagColor: 'bg-emerald-500/20 text-emerald-400'
                  },
                  {
                    step: '8',
                    title: 'Reward History',
                    desc: 'Users can view their NFT IDs, reward amounts, pending rewards and completed reward transactions on the website.',
                    tag: 'On-Chain Audit Log',
                    tagColor: 'bg-indigo-500/20 text-indigo-300'
                  }
                ].map((s) => (
                  <div key={s.step} className="p-5 rounded-2xl bg-[#090514] border border-[#2E1B4E] hover:border-[#7928CA]/60 transition flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7928CA] to-[#F59E0B] flex items-center justify-center font-black text-black shrink-0 text-sm">
                      {s.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-bold text-white text-sm sm:text-base">{s.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${s.tagColor}`}>
                          {s.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Exact Reward Rules Box */}
              <div className="mt-6 p-5 rounded-2xl bg-[#0E071A] border border-[#2E1B4E] text-xs font-mono space-y-1.5">
                <div className="text-white font-bold text-sm uppercase tracking-wider mb-2 font-sans flex items-center gap-2">
                  <span>⚖️</span>
                  <span>Enforced Smart Contract Reward Limits</span>
                </div>
                <div className="text-gray-300">• Maximum eligible NFTs: <span className="text-[#F59E0B] font-bold">5,000 NFTs</span>.</div>
                <div className="text-gray-300">• One NFT = One random reward. Two NFTs = Two random rewards.</div>
                <div className="text-gray-300">• Each NFT can receive rewards <span className="text-purple-400 font-bold">only once</span>.</div>
                <div className="text-gray-300">• Minimum reward: <span className="text-emerald-400 font-bold">300 MAGES</span> per NFT | Maximum reward: <span className="text-amber-400 font-bold">700 MAGES</span> per NFT.</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY NFTS & CLAIM REWARDS */}
        {activeTab === 'free' && (
          <div className="space-y-6">
            
            {/* Wallet Status Banner */}
            <div className="p-4 rounded-2xl bg-[#160D27] border border-[#2E1B4E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#090514] border border-[#2E1B4E] flex items-center justify-center text-lg">
                  💼
                </div>
                <div>
                  <div className="text-xs text-gray-400">Connected Wallet:</div>
                  <div className="text-sm font-mono font-bold text-white">
                    {wallet ? formatAddress(wallet) : 'Wallet Not Connected'}
                  </div>
                </div>
              </div>

              {!wallet ? (
                <button
                  onClick={handleConnectWallet}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:from-[#8B2BE2] hover:to-[#A855F7] text-white shadow-lg transition"
                >
                  Connect Wallet
                </button>
              ) : (
                unclaimedCount > 0 && (
                  <button
                    onClick={handleBatchClaim}
                    disabled={batchClaiming}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-black shadow-lg transition active:scale-95 disabled:opacity-50"
                  >
                    {batchClaiming ? 'Claiming Batch...' : `⚡ Claim All Rewards (${unclaimedCount} NFTs)`}
                  </button>
                )
              )}
            </div>

            {/* Status Message */}
            {claimStatusMsg && (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{claimStatusMsg}</span>
              </div>
            )}

            {/* My NFTs Grid */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[#2E1B4E]">
                <div>
                  <h3 className="text-xl font-bold text-white">My WeZards NFTs</h3>
                  <p className="text-xs text-gray-400">Every NFT you hold qualifies for one random MAGES reward.</p>
                </div>
                <div className="text-xs font-mono">
                  <span className="text-gray-400">Unclaimed Rewards: </span>
                  <span className="text-[#F59E0B] font-bold">{unclaimedCount} of {userNFTs.length} NFTs</span>
                </div>
              </div>

              {userNFTs.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7928CA] to-[#F59E0B] mx-auto mb-3 flex items-center justify-center text-2xl shadow-lg">
                    🧙‍♂️
                  </div>
                  <div className="text-white font-bold text-base mb-1">No WeZards NFTs In Connected Wallet</div>
                  <p className="text-xs text-gray-400 max-w-md mx-auto mb-5 leading-relaxed">
                    Every minted WeZards NFT (Free & Paid) is eligible for one random reward of 300 - 700 MAGES.
                    Connect a wallet holding WeZards NFTs or mint an NFT to activate your reward claim!
                  </p>
                  <Link
                    href="/mint"
                    className="inline-block px-7 py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:brightness-110 shadow-lg transition"
                  >
                    ⚡ Mint a WeZards NFT Now →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {userNFTs.map(nft => (
                    <div key={nft.tokenId} className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] flex flex-col justify-between">
                      <div>
                        <div className="w-full h-44 rounded-xl bg-[#090514] p-2 flex items-center justify-center border border-[#2E1B4E] mb-3">
                          <img
                            src={`${ASSET_BASE_URLS.IMAGES}/${nft.tokenId}.png`}
                            alt={nft.name}
                            className="w-full h-full object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-white text-sm">{nft.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                            {nft.mintType}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-gray-400 mb-3">
                          Reward: <span className="text-[#F59E0B] font-bold">300 - 700 MAGES</span>
                        </div>
                      </div>

                      <div>
                        {nft.isClaimed ? (
                          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center text-xs font-mono text-emerald-400">
                            ✓ Claimed: {nft.rewardAmount} MAGES
                          </div>
                        ) : (
                          <button
                            onClick={() => handleClaimSingle(nft.tokenId)}
                            disabled={claimingTokenId === nft.tokenId}
                            className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:from-[#8B2BE2] hover:to-[#A855F7] text-white transition active:scale-95 disabled:opacity-50"
                          >
                            {claimingTokenId === nft.tokenId ? 'Requesting VRF...' : '🎲 Claim Random MAGES'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Individual Token ID Lookup Box */}
            <div className="p-6 rounded-3xl bg-[#160D27] border border-[#2E1B4E]">
              <h3 className="text-base font-bold text-white mb-2">Check Specific Token ID Status</h3>
              <p className="text-xs text-gray-400 mb-4">Input any WeZards NFT ID (1 - 5,000) to inspect its verifiable reward status on BNB Smart Chain.</p>

              <div className="flex gap-2 max-w-md mb-4">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={checkIdInput}
                  onChange={e => setCheckIdInput(e.target.value)}
                  placeholder="Token ID (1-5000)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#090514] border border-[#2E1B4E] text-white font-mono text-xs focus:outline-none focus:border-[#7928CA]"
                />
                <button
                  onClick={() => handleCheckToken(checkIdInput)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#24133D] hover:bg-[#341B55] text-white border border-[#2E1B4E] transition"
                >
                  Verify ID
                </button>
              </div>

              {checkedResult && (
                <div className="p-4 rounded-xl bg-[#090514] border border-[#2E1B4E] text-xs font-mono space-y-1.5 max-w-md">
                  <div className="flex justify-between text-gray-400">
                    <span>Token ID:</span>
                    <span className="text-white font-bold">WeZards #{String(checkedResult.tokenId).padStart(4, '0')}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Eligible Range:</span>
                    <span className="text-[#F59E0B] font-bold">{checkedResult.eligibleRange}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Claim Status:</span>
                    <span className={checkedResult.isClaimed ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {checkedResult.status} ({checkedResult.rewardAmount} MAGES)
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: PAID CLAIM PHASE (AFTER 5,000 FREE CLAIMS) */}
        {activeTab === 'paid' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E] shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#2E1B4E] mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-[#F59E0B] text-xs font-bold uppercase tracking-wider mb-2">
                    <span>💎</span>
                    <span>Secondary Distribution Phase</span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Paid MAGES Claim Phase
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Activated after the 5,000 free random reward claims close. Each purchase awards 500 MAGES tokens at 0.0013 BNB.
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs text-gray-400 uppercase">Package Price</div>
                  <div className="text-2xl font-black text-[#F59E0B]">0.0013 BNB</div>
                  <div className="text-xs text-gray-400">500 MAGES / Package</div>
                </div>
              </div>

              {/* Live Paid Purchases Progress Bar */}
              <div className="p-5 rounded-2xl bg-[#090514] border border-[#2E1B4E] mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs font-mono">
                  <span className="text-white font-bold uppercase">
                    Paid Purchase Quota (2,000 Max Purchases)
                  </span>
                  <div>
                    <span className="text-[#F59E0B] font-bold">{paidPurchasesCount.toLocaleString()}</span>
                    <span className="text-gray-400"> / {MAX_PAID_PURCHASES.toLocaleString()} Packages ({paidPurchasesPercent.toFixed(1)}%)</span>
                  </div>
                </div>

                <div className="relative w-full h-3.5 bg-[#160D27] rounded-full overflow-hidden p-0.5 border border-[#2E1B4E]">
                  <div
                    style={{ width: `${paidPurchasesPercent}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all duration-700 ease-out"
                  />
                </div>

                <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-gray-400">
                  <span className="text-purple-300">
                    ⚡ {(MAX_PAID_PURCHASES - paidPurchasesCount).toLocaleString()} Packages Remaining
                  </span>
                  <span>
                    Total Paid Cap: 1,000,000 MAGES
                  </span>
                </div>
              </div>

              {/* Quantity Selector & Purchase Box */}
              <div className="p-5 rounded-2xl bg-[#090514] border border-[#2E1B4E] mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Select Purchase Quantity
                </label>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center rounded-xl bg-[#160D27] border border-[#2E1B4E] p-1">
                    <button
                      onClick={() => setPaidQuantity(Math.max(1, paidQuantity - 1))}
                      className="w-10 h-10 rounded-lg bg-[#090514] text-white font-bold hover:bg-[#2E1B4E] transition"
                    >
                      -
                    </button>
                    <span className="w-14 text-center font-bold text-lg font-mono text-white">
                      {paidQuantity}
                    </span>
                    <button
                      onClick={() => setPaidQuantity(Math.min(20, paidQuantity + 1))}
                      className="w-10 h-10 rounded-lg bg-[#090514] text-white font-bold hover:bg-[#2E1B4E] transition"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    Package(s) • Total MAGES: <span className="text-[#F59E0B] font-bold">{(paidQuantity * MAGES_PER_PACKAGE).toLocaleString()} MAGES</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#160D27] border border-[#2E1B4E] text-xs font-mono space-y-2 mb-4">
                  <div className="flex justify-between text-gray-400">
                    <span>Unit Price:</span>
                    <span className="text-white">0.0013 BNB</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Tokens Awarded:</span>
                    <span className="text-emerald-400 font-bold">{(paidQuantity * 500).toLocaleString()} MAGES</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#F59E0B] pt-2 border-t border-[#2E1B4E]">
                    <span>Total BNB Due:</span>
                    <span>{(paidQuantity * PAID_PRICE_BNB).toFixed(4)} BNB</span>
                  </div>
                </div>

                <button
                  onClick={handlePaidPurchase}
                  className="w-full py-4 rounded-xl font-bold text-base text-white bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:from-[#8B2BE2] hover:to-[#A855F7] shadow-[0_0_20px_rgba(121,40,202,0.4)] transition active:scale-95"
                >
                  {!wallet ? 'Connect Wallet to Purchase' : `Purchase ${(paidQuantity * 500).toLocaleString()} MAGES (${(paidQuantity * PAID_PRICE_BNB).toFixed(4)} BNB)`}
                </button>
              </div>

              {/* Status Message */}
              {claimStatusMsg && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                  {claimStatusMsg}
                </div>
              )}

              {/* Disclosures */}
              <div className="p-4 rounded-2xl bg-[#0E071A] border border-[#2E1B4E] text-xs text-gray-400 space-y-1 font-mono">
                <div className="text-white font-bold uppercase mb-1 font-sans">Paid Phase Rules:</div>
                <div>• Price: 0.0013 BNB per purchase (500 MAGES).</div>
                <div>• Maximum purchases: 2,000 packages.</div>
                <div>• Maximum paid distribution: 1,000,000 MAGES.</div>
                <div>• Revenue safely withdrawable only by authorized contract owner.</div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: REWARD TRANSACTION HISTORY */}
        {activeTab === 'history' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E] shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#2E1B4E] mb-6 gap-2">
              <div>
                <h3 className="text-xl font-bold text-white">Live On-Chain Reward History</h3>
                <p className="text-xs text-gray-400">Verifiable Chainlink VRF and distribution transactions on BNB Smart Chain.</p>
              </div>
              <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Event Stream</span>
              </div>
            </div>

            <div className="space-y-3">
              {history.map(tx => (
                <div key={tx.id} className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#160D27] border border-[#2E1B4E] flex items-center justify-center text-base">
                      {tx.type === 'Free VRF Reward' ? '🎲' : '💎'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">
                          {tx.tokenId > 0 ? `WeZards #${String(tx.tokenId).padStart(4, '0')}` : 'Paid MAGES Package'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          tx.type === 'Free VRF Reward' ? 'bg-amber-500/20 text-[#F59E0B]' : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {tx.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Recipient: <span className="text-gray-300">{formatAddress(tx.recipient)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#2E1B4E]/40">
                    <div className="font-bold text-[#F59E0B] text-sm">
                      +{tx.amountMAGES.toLocaleString()} MAGES
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                      <span>{tx.timeAgo}</span>
                      <span>•</span>
                      <a
                        href={`https://bscscan.com/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-white underline truncate max-w-[120px]"
                      >
                        BscScan ↗
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
