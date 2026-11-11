'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  formatAddress,
  CONTRACT_ADDRESSES,
  fetchMagesAirdropStats,
  fetchMagesPresaleStats,
  fetchWalletMagesUnifiedState,
  MagesAirdropStats,
  MagesPresaleStats,
  bscPublicClient,
  bscLogClient
} from '@/lib/web3';
import { getWalletAirdropData } from '@/lib/merkleEngine';
import { parseAbiItem, formatUnits, parseAbi } from 'viem';

interface WalletMagesData {
  address: string | null;
  magesBalance: string;
  nftBalance: number;
  bnbBalance: string;
  usdtBalance: string;
}

interface RecentActivity {
  type: 'airdrop' | 'presale' | 'transfer';
  title: string;
  amount: string;
  txHash: string;
  blockNumber: number;
  timeAgo: string;
}

export default function MagesHubPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Global Protocol Stats
  const [airdropStats, setAirdropStats] = useState<MagesAirdropStats | null>(null);
  const [presaleStats, setPresaleStats] = useState<MagesPresaleStats | null>(null);
  const [loadingProtocol, setLoadingProtocol] = useState(true);

  // User Profile
  const [walletState, setWalletState] = useState<WalletMagesData | null>(null);
  const [airdropEligibleCount, setAirdropEligibleCount] = useState<number>(0);
  const [airdropClaimedCount, setAirdropClaimedCount] = useState<number>(0);
  const [presalePurchasedMages, setPresalePurchasedMages] = useState<string>('0');
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);

  // Check connected wallet
  const checkWallet = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const provider = (window as any).ethereum;
    if (!provider) return;

    try {
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
      }
      const cId = await provider.request({ method: 'eth_chainId' });
      setChainId(Number(BigInt(cId)));
    } catch (e) {
      console.warn('Wallet check failed', e);
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window === 'undefined') return;
    const provider = (window as any).ethereum;
    if (!provider) {
      alert('Please install MetaMask or a compatible EVM Web3 wallet.');
      return;
    }
    try {
      setIsConnecting(true);
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
      }
      const cId = await provider.request({ method: 'eth_chainId' });
      setChainId(Number(BigInt(cId)));
    } catch (err: any) {
      console.error('Connect failed:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const switchNetwork = async () => {
    if (typeof window === 'undefined') return;
    const provider = (window as any).ethereum;
    if (!provider) return;
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }]
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x38',
              chainName: 'BNB Smart Chain Mainnet',
              nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
              rpcUrls: ['https://bsc-dataseed.binance.org/'],
              blockExplorerUrls: ['https://bscscan.com']
            }
          ]
        });
      }
    }
  };

  // Load Protocol Stats
  const loadProtocolData = useCallback(async () => {
    try {
      setLoadingProtocol(true);
      const [airdrop, presale] = await Promise.all([
        fetchMagesAirdropStats(),
        fetchMagesPresaleStats()
      ]);
      setAirdropStats(airdrop);
      setPresaleStats(presale);
    } catch (err) {
      console.error('Error loading protocol data:', err);
    } finally {
      setLoadingProtocol(false);
    }
  }, []);

  // Load User Data
  const loadUserData = useCallback(async (account: string) => {
    try {
      setLoadingUserData(true);
      const unified = await fetchWalletMagesUnifiedState(account);
      setWalletState(unified);

      // Airdrop eligibility check
      try {
        const airdropProfile = getWalletAirdropData(account);
        setAirdropEligibleCount(airdropProfile.tokens.length);

        if (airdropProfile.tokens.length > 0) {
          const abi = parseAbi(['function isTokenClaimed(uint256) view returns (bool)']);
          let claimed = 0;
          await Promise.all(
            airdropProfile.tokens.map(async (t) => {
              try {
                const isClaimed = await bscPublicClient.readContract({
                  address: CONTRACT_ADDRESSES.AIRDROP as `0x${string}`,
                  abi,
                  functionName: 'isTokenClaimed',
                  args: [BigInt(t.tokenId)]
                });
                if (isClaimed) claimed++;
              } catch {}
            })
          );
          setAirdropClaimedCount(claimed);
        }
      } catch (err) {
        console.warn('Airdrop eligibility scan error:', err);
      }

      // Fetch on-chain recent transactions for this wallet
      try {
        const currentBlock = await bscPublicClient.getBlockNumber().catch(() => BigInt(0));
        const fromBlock = currentBlock > 30000n ? currentBlock - 30000n : 0n;

        const targetAddr = account as `0x${string}`;

        // 1. MAGES transfers involving user
        const transferLogsIn = await bscLogClient.getLogs({
          address: CONTRACT_ADDRESSES.TOKEN as `0x${string}`,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
          args: { to: targetAddr },
          fromBlock
        }).catch(() => []);

        const recentActs: RecentActivity[] = [];

        for (const log of transferLogsIn.slice(-5)) {
          const val = Number(formatUnits(log.args.value || 0n, 18));
          const isAirdropSender = (log.args.from || '').toLowerCase() === CONTRACT_ADDRESSES.AIRDROP.toLowerCase();
          const isPresaleSender = (log.args.from || '').toLowerCase() === CONTRACT_ADDRESSES.PRESALE.toLowerCase();

          let type: 'airdrop' | 'presale' | 'transfer' = 'transfer';
          let title = 'MAGES Received';

          if (isAirdropSender) {
            type = 'airdrop';
            title = 'Airdrop Reward Claimed';
          } else if (isPresaleSender) {
            type = 'presale';
            title = 'Presale Purchase Delivery';
          }

          recentActs.push({
            type,
            title,
            amount: `${val.toLocaleString()} MAGES`,
            txHash: log.transactionHash as string,
            blockNumber: Number(log.blockNumber),
            timeAgo: 'Recent'
          });
        }

        setActivities(recentActs.reverse());
      } catch (err) {
        console.warn('Activity scan error:', err);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoadingUserData(false);
    }
  }, []);

  useEffect(() => {
    loadProtocolData();
    checkWallet();

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const handleAccounts = (accs: string[]) => {
        setAddress(accs[0] || null);
      };
      const handleChain = (c: string) => {
        setChainId(Number(BigInt(c)));
      };
      (window as any).ethereum.on?.('accountsChanged', handleAccounts);
      (window as any).ethereum.on?.('chainChanged', handleChain);

      return () => {
        (window as any).ethereum.removeListener?.('accountsChanged', handleAccounts);
        (window as any).ethereum.removeListener?.('chainChanged', handleChain);
      };
    }
  }, [loadProtocolData, checkWallet]);

  useEffect(() => {
    if (address) {
      loadUserData(address);
    } else {
      setWalletState(null);
      setAirdropEligibleCount(0);
      setAirdropClaimedCount(0);
      setActivities([]);
    }
  }, [address, loadUserData]);

  const isWrongChain = Boolean(address && chainId !== 56);

  return (
    <div className="min-h-screen bg-[#090514] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-10">
        {/* Network Warning Banner */}
        {isWrongChain && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-amber-300">Wrong Network Detected</p>
                <p className="text-xs text-amber-200/80">
                  Please connect to BNB Smart Chain Mainnet (Chain ID 56) to view and manage your MAGES.
                </p>
              </div>
            </div>
            <button
              onClick={switchNetwork}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              Switch to BNB Chain
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#2E1B4E] pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              Official MAGES Ecosystem Hub
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              MAGES <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">DASHBOARD</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-400 max-w-2xl">
              Track your WeZards NFT holdings, claim eligible MAGES airdrop tokens, and participate in the public presale on BNB Smart Chain.
            </p>
          </div>

          {/* Wallet Action Button */}
          <div>
            {!address ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-[#160D27]/80 border border-[#2E1B4E] px-4 py-2.5 rounded-2xl backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-mono">Connected Wallet</p>
                  <p className="text-sm font-bold text-white font-mono">{formatAddress(address)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Balance Overview Cards */}
        {address ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* MAGES Balance */}
            <div className="bg-[#160D27]/70 border border-[#2E1B4E] rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>MAGES Balance</span>
                <span className="text-emerald-400 text-lg">✦</span>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {loadingUserData ? '...' : walletState?.magesBalance || '0'}
              </div>
              <p className="text-xs text-gray-400 mt-1">Total MAGES in wallet</p>
            </div>

            {/* WeZards NFTs */}
            <div className="bg-[#160D27]/70 border border-[#2E1B4E] rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-all" />
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>WeZards NFTs</span>
                <span className="text-purple-400 text-lg">🧙‍♂️</span>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {loadingUserData ? '...' : walletState?.nftBalance || 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">Holding on BNB Chain</p>
            </div>

            {/* Airdrop Claimable */}
            <div className="bg-[#160D27]/70 border border-[#2E1B4E] rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-all" />
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Airdrop Rewards</span>
                <span className="text-cyan-400 text-lg">🎁</span>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {loadingUserData
                  ? '...'
                  : `${Math.max(0, (airdropEligibleCount - airdropClaimedCount) * 1000).toLocaleString()} MAGES`}
              </div>
              <p className="text-xs text-cyan-400/80 mt-1">
                {airdropEligibleCount > 0
                  ? `${airdropEligibleCount - airdropClaimedCount} of ${airdropEligibleCount} NFTs unclaimed`
                  : 'No snapshot allocation'}
              </p>
            </div>

            {/* BNB Balance */}
            <div className="bg-[#160D27]/70 border border-[#2E1B4E] rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all" />
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>BNB / USDT</span>
                <span className="text-amber-400 text-lg">💰</span>
              </div>
              <div className="text-2xl font-extrabold text-white tracking-tight truncate">
                {loadingUserData ? '...' : `${walletState?.bnbBalance || '0'} BNB`}
              </div>
              <p className="text-xs text-gray-400 mt-1 truncate">
                {loadingUserData ? '...' : `${walletState?.usdtBalance || '0'} USDT`}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#160D27]/40 border border-[#2E1B4E]/60 rounded-3xl p-8 text-center backdrop-blur-sm">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-2xl text-emerald-400">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-white">Connect Your Wallet to View Holdings</h3>
              <p className="text-sm text-gray-400">
                Link your Web3 wallet to check your MAGES balance, verify WeZards NFT airdrop claims, and track live presale allocations.
              </p>
              <button
                onClick={connectWallet}
                className="mt-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-sm transition-all"
              >
                Connect Wallet Now
              </button>
            </div>
          </div>
        )}

        {/* Feature Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Airdrop Portal Card */}
          <div className="bg-gradient-to-br from-[#160D27] to-[#1F1138] border border-emerald-500/30 hover:border-emerald-500/60 rounded-3xl p-8 transition-all relative overflow-hidden group shadow-xl shadow-emerald-950/20">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                  Holder Airdrop
                </span>
                <span className="text-xs text-gray-400">1,000 MAGES / NFT</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                MAGES NFT Holder <span className="text-emerald-400">Airdrop</span>
              </h2>
              <p className="text-sm text-gray-300">
                WeZards NFT holders qualify for 1,000 MAGES per eligible token. Check your Merkle proofs and claim your rewards on-chain.
              </p>

              <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <p className="text-gray-400">Max Distribution</p>
                  <p className="text-sm font-bold text-white mt-0.5">4,000,000 MAGES</p>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <p className="text-gray-400">Eligible NFTs</p>
                  <p className="text-sm font-bold text-white mt-0.5">4,000 Cap</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Link
                  href="/mages/airdrop"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
                >
                  Go to Airdrop Portal
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <span className="text-xs text-gray-500 font-mono">Proof Verified</span>
              </div>
            </div>
          </div>

          {/* Presale Portal Card */}
          <div className="bg-gradient-to-br from-[#160D27] to-[#1F1138] border border-amber-500/30 hover:border-amber-500/60 rounded-3xl p-8 transition-all relative overflow-hidden group shadow-xl shadow-amber-950/20">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                  Public Presale
                </span>
                <span className="text-xs text-amber-300 font-bold">$0.0034 / MAGES</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                MAGES Public Token <span className="text-amber-400">Presale</span>
              </h2>
              <p className="text-sm text-gray-300">
                Acquire MAGES with BNB or USDT directly at early-stage pricing. Real-time Chainlink oracle conversions with instant token delivery.
              </p>

              <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <p className="text-gray-400">Presale Allocation</p>
                  <p className="text-sm font-bold text-white mt-0.5">5,250,000 MAGES</p>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <p className="text-gray-400">Min Purchase</p>
                  <p className="text-sm font-bold text-white mt-0.5">$10.00 USD</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Link
                  href="/mages/presale"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
                >
                  Join Public Presale
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <span className="text-xs text-gray-500 font-mono">Immediate Delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Protocol Statistics Bar */}
        <div className="bg-[#160D27]/80 border border-[#2E1B4E] rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2E1B4E] pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Live On-Chain Protocol Metrics</h3>
              <p className="text-xs text-gray-400">
                Directly synchronized with BNB Smart Chain Mainnet smart contracts
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-mono">BSC Mainnet 56</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-400">Presale Price</p>
              <p className="text-xl font-bold text-white mt-1">$0.0034</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Fixed USD rate</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">BNB / USD (Chainlink)</p>
              <p className="text-xl font-bold text-white mt-1">
                ${presaleStats?.bnbPriceUSD?.toFixed(2) || '687.00'}
              </p>
              <p className="text-[11px] text-emerald-400 mt-0.5">Live oracle feed</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Airdrop Pool Claimed</p>
              <p className="text-xl font-bold text-white mt-1">
                {airdropStats?.totalClaimedMAGES?.toLocaleString() || '0'} MAGES
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                of {airdropStats?.maxDistribution || '4,000,000'} MAGES
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Presale Status</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {presaleStats?.statusLabel || 'Active'}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {presaleStats?.remainingAllocation?.toLocaleString() || '5,250,000'} remaining
              </p>
            </div>
          </div>
        </div>

        {/* Recent Wallet Activity Section */}
        {address && (
          <div className="bg-[#160D27]/80 border border-[#2E1B4E] rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Recent MAGES Transactions</h3>
              <span className="text-xs text-gray-400">BNB Chain logs</span>
            </div>

            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((act, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg">
                        {act.type === 'airdrop' ? '🎁' : act.type === 'presale' ? '💰' : '✦'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{act.title}</p>
                        <p className="text-xs text-gray-400 font-mono">Block #{act.blockNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400 font-mono">+{act.amount}</p>
                      <a
                        href={`https://bscscan.com/tx/${act.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-gray-500 hover:text-gray-300 font-mono flex items-center justify-end gap-1"
                      >
                        BscScan ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No recent MAGES transactions found for this wallet.
              </div>
            )}
          </div>
        )}

        {/* Official Contract Reference Directory */}
        <div className="bg-[#160D27]/40 border border-[#2E1B4E] rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-4">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Verified Smart Contracts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 bg-black/30 rounded-xl border border-white/5">
              <span className="text-gray-500 block mb-1">MAGES ERC-20</span>
              <a
                href={`https://bscscan.com/token/${CONTRACT_ADDRESSES.TOKEN}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline break-all"
              >
                {CONTRACT_ADDRESSES.TOKEN}
              </a>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-white/5">
              <span className="text-gray-500 block mb-1">WeZards ERC-721</span>
              <a
                href={`https://bscscan.com/token/${CONTRACT_ADDRESSES.NFT}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline break-all"
              >
                {CONTRACT_ADDRESSES.NFT}
              </a>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-white/5">
              <span className="text-gray-500 block mb-1">MAGES Airdrop</span>
              <a
                href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.AIRDROP}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline break-all"
              >
                {CONTRACT_ADDRESSES.AIRDROP}
              </a>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-white/5">
              <span className="text-gray-500 block mb-1">MAGES Presale</span>
              <a
                href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.PRESALE}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline break-all"
              >
                {CONTRACT_ADDRESSES.PRESALE}
              </a>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-white/5">
              <span className="text-gray-500 block mb-1">Chainlink BNB/USD</span>
              <a
                href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.CHAINLINK_BNB_USD}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline break-all"
              >
                {CONTRACT_ADDRESSES.CHAINLINK_BNB_USD}
              </a>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-white/5">
              <span className="text-gray-500 block mb-1">Treasury</span>
              <a
                href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.TREASURY}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline break-all"
              >
                {CONTRACT_ADDRESSES.TREASURY}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
