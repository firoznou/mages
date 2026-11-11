'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  formatAddress,
  isValidEVMAddress,
  CONTRACT_ADDRESSES,
  fetchMagesAirdropStats,
  MagesAirdropStats,
  sendWalletContractTransaction,
  bscPublicClient,
  getWalletProvider
} from '../../../lib/web3';
import {
  getWalletAirdropData,
  verifyProof,
  AirdropTokenClaim
} from '../../../lib/merkleEngine';
import { encodeFunctionData, parseAbi } from 'viem';

export type EligibilityBadgeStatus = 'Eligible' | 'Already Claimed' | 'Not Eligible' | 'Claim Available';

export default function MagesAirdropPage() {
  // Connected Wallet State
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'agent_qr' | 'extension'>('agent_qr');
  const [copiedCli, setCopiedCli] = useState(false);

  // Manual Address Lookup State
  const [manualInput, setManualInput] = useState('');
  const [manualAddress, setManualAddress] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Active target address (either manual search or connected wallet)
  const activeAddress = manualAddress || address;

  // Protocol Stats
  const [stats, setStats] = useState<MagesAirdropStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Claims & On-Chain Verification State
  const [eligibleClaims, setEligibleClaims] = useState<AirdropTokenClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [userMagesBalance, setUserMagesBalance] = useState<string>('0');

  // Transaction States
  const [txState, setTxState] = useState<{
    status: 'idle' | 'waiting_approval' | 'submitted' | 'pending' | 'confirmed' | 'failed';
    txHash: string | null;
    error: string | null;
    claimedCount?: number;
  }>({
    status: 'idle',
    txHash: null,
    error: null
  });

  // Load Airdrop Global On-Chain Stats
  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await fetchMagesAirdropStats();
      setStats(res);
    } catch (e) {
      console.error('Failed to load airdrop stats', e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Check connected wallet & chain
  const checkConnectedWallet = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const provider = getWalletProvider();
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

  useEffect(() => {
    loadStats();
    checkConnectedWallet();

    if (typeof window !== 'undefined') {
      const provider = getWalletProvider();
      if (provider) {
        const handleAccounts = (accs: string[]) => {
          setAddress(accs[0] || null);
          // If disconnected, reset manual address if it was synced
          if (!accs[0] && !manualAddress) {
            setEligibleClaims([]);
          }
        };
        const handleChain = (c: string) => {
          setChainId(Number(BigInt(c)));
        };
        provider.on?.('accountsChanged', handleAccounts);
        provider.on?.('chainChanged', handleChain);

        return () => {
          provider.removeListener?.('accountsChanged', handleAccounts);
          provider.removeListener?.('chainChanged', handleChain);
        };
      }
    }
  }, [loadStats, checkConnectedWallet, manualAddress]);

  // Read on-chain verification for the active address
  const loadAddressEligibility = useCallback(async (targetWallet: string) => {
    if (!isValidEVMAddress(targetWallet)) return;

    try {
      setLoadingClaims(true);
      const profile = getWalletAirdropData(targetWallet);
      const isClaimedAbi = parseAbi(['function isTokenClaimed(uint256) view returns (bool)']);
      const erc20BalAbi = parseAbi(['function balanceOf(address) view returns (uint256)']);

      // 1. Check each token claim status directly on-chain
      const updatedClaims = await Promise.all(
        profile.tokens.map(async (token) => {
          try {
            const isClaimed = await bscPublicClient.readContract({
              address: CONTRACT_ADDRESSES.AIRDROP as `0x${string}`,
              abi: isClaimedAbi,
              functionName: 'isTokenClaimed',
              args: [BigInt(token.tokenId)]
            });
            return { ...token, isClaimed: Boolean(isClaimed) };
          } catch {
            return { ...token, isClaimed: false };
          }
        })
      );

      // 2. Read on-chain MAGES token balance
      try {
        const balWei = await bscPublicClient.readContract({
          address: CONTRACT_ADDRESSES.TOKEN as `0x${string}`,
          abi: erc20BalAbi,
          functionName: 'balanceOf',
          args: [targetWallet as `0x${string}`]
        });
        const balNum = Number(balWei / 10n ** 18n);
        setUserMagesBalance(balNum.toLocaleString());
      } catch {
        setUserMagesBalance('0');
      }

      setEligibleClaims(updatedClaims);
      if (updatedClaims.length > 0) {
        const firstUnclaimed = updatedClaims.find(t => !t.isClaimed);
        setSelectedTokenId(firstUnclaimed ? firstUnclaimed.tokenId : updatedClaims[0].tokenId);
      } else {
        setSelectedTokenId(null);
      }
    } catch (e) {
      console.error('Failed to load wallet eligibility', e);
    } finally {
      setLoadingClaims(false);
    }
  }, []);

  // When activeAddress changes, load its verification
  useEffect(() => {
    if (activeAddress && isValidEVMAddress(activeAddress)) {
      loadAddressEligibility(activeAddress);
    } else {
      setEligibleClaims([]);
      setSelectedTokenId(null);
      setUserMagesBalance('0');
    }
  }, [activeAddress, loadAddressEligibility]);

  // Connect Agentic Wallet
  const connectAgenticWallet = async () => {
    const provider = getWalletProvider();
    if (!provider) {
      setWalletModalOpen(true);
      return;
    }
    try {
      setIsConnecting(true);
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
        setManualAddress(null); // clear manual search to show connected wallet
        setManualInput('');
        setInputError(null);
      }
      const c = await provider.request({ method: 'eth_chainId' });
      setChainId(Number(BigInt(c)));
      setWalletModalOpen(false);
    } catch (err: any) {
      if (err.code === 4001) {
        console.warn('User rejected connection');
      } else {
        alert(err.message || 'Failed to connect Agentic Wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Wallet
  const disconnectWallet = () => {
    setAddress(null);
    setChainId(null);
    if (!manualAddress) {
      setEligibleClaims([]);
      setSelectedTokenId(null);
    }
  };

  // Switch to BNB Smart Chain (Chain ID: 56)
  const switchNetwork = async () => {
    const provider = getWalletProvider();
    if (!provider) return;
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }]
      });
      setChainId(56);
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
        setChainId(56);
      } else {
        alert(switchError.message || 'Network switch failed');
      }
    }
  };

  // Handle Manual Address Search
  const handleManualCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const trimmed = manualInput.trim();
    if (!trimmed) {
      setInputError('Please enter a wallet address.');
      return;
    }

    if (!isValidEVMAddress(trimmed)) {
      setInputError('Invalid BSC address. Must start with 0x and be 42 characters.');
      return;
    }

    setIsSearching(true);
    setManualAddress(trimmed);
    setTimeout(() => setIsSearching(false), 300);
  };

  const handleClearSearch = () => {
    setManualAddress(null);
    setManualInput('');
    setInputError(null);
    if (address) {
      loadAddressEligibility(address);
    } else {
      setEligibleClaims([]);
      setSelectedTokenId(null);
    }
  };

  // Claim MAGES (Single or Batch)
  const handleClaimTokens = async (tokenIdsToClaim: number[]) => {
    if (!address) {
      setWalletModalOpen(true);
      return;
    }

    // Verify user is connected with the active eligible address
    if (activeAddress && address.toLowerCase() !== activeAddress.toLowerCase()) {
      alert(`Connected wallet (${formatAddress(address)}) does not match the checked address (${formatAddress(activeAddress)}). Please switch to ${formatAddress(activeAddress)} in your wallet to claim.`);
      return;
    }

    if (chainId !== 56) {
      await switchNetwork();
      return;
    }

    const rootIsZero = !stats?.existingRoot || stats.existingRoot === '0x0000000000000000000000000000000000000000000000000000000000000000';
    if (rootIsZero) {
      alert('The Merkle root is currently pending on-chain activation by the contract owner. Transactions cannot execute until initialized in the admin console. Your eligibility is verified below!');
      return;
    }

    const unclaimedTargets = eligibleClaims.filter(c => tokenIdsToClaim.includes(c.tokenId) && !c.isClaimed);
    if (unclaimedTargets.length === 0) {
      alert('No unclaimed tokens selected.');
      return;
    }

    try {
      setTxState({ status: 'waiting_approval', txHash: null, error: null });

      const abi = parseAbi(['function claimExisting(uint256 tokenId, bytes32[] calldata proof) external']);

      // Process claim for the selected tokens
      for (const target of unclaimedTargets) {
        // Verify proof client-side
        const isValid = verifyProof(target.leaf, target.proof, stats.existingRoot as `0x${string}`);
        if (!isValid) {
          throw new Error(`Invalid Merkle proof for WeZards #${target.tokenId} against the on-chain root.`);
        }

        const calldata = encodeFunctionData({
          abi,
          functionName: 'claimExisting',
          args: [BigInt(target.tokenId), target.proof]
        });

        setTxState({ status: 'submitted', txHash: null, error: null });

        const hash = await sendWalletContractTransaction({
          to: CONTRACT_ADDRESSES.AIRDROP,
          data: calldata
        });

        setTxState({ status: 'pending', txHash: hash, error: null });

        const receipt = await bscPublicClient.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
          confirmations: 1
        });

        if (receipt.status !== 'success') {
          throw new Error('Transaction execution reverted on-chain.');
        }

        setTxState({
          status: 'confirmed',
          txHash: hash,
          error: null,
          claimedCount: unclaimedTargets.length
        });
      }

      // Refresh data on confirmation
      if (activeAddress) await loadAddressEligibility(activeAddress);
      await loadStats();
    } catch (err: any) {
      console.error('Claim error:', err);
      let errMsg = err?.shortMessage || err?.message || 'Transaction was rejected or failed.';
      if (err?.code === 4001 || errMsg.includes('rejected') || errMsg.includes('denied')) {
        errMsg = 'Transaction was cancelled in wallet.';
      }
      setTxState({
        status: 'failed',
        txHash: null,
        error: errMsg
      });
    }
  };

  // Eligibility Status Calculations
  const isWrongChain = Boolean(address && chainId !== 56);
  const isTargetConnected = Boolean(address && activeAddress && address.toLowerCase() === activeAddress.toLowerCase());

  const totalEligibleTokens = eligibleClaims.length;
  const unclaimedTokens = eligibleClaims.filter(c => !c.isClaimed);
  const claimedTokens = eligibleClaims.filter(c => c.isClaimed);

  const totalAllocatedMAGES = totalEligibleTokens * 1000;
  const alreadyClaimedMAGES = claimedTokens.length * 1000;
  const availableToClaimMAGES = unclaimedTokens.length * 1000;

  let badgeStatus: EligibilityBadgeStatus = 'Not Eligible';
  if (totalEligibleTokens > 0) {
    if (unclaimedTokens.length === 0) {
      badgeStatus = 'Already Claimed';
    } else if (isTargetConnected) {
      badgeStatus = 'Claim Available';
    } else {
      badgeStatus = 'Eligible';
    }
  }

  const agentCliCommand = `binance-agent wallet connect --uri "binance-agent://wezards?session=ag_bsc_98214&chain=56"`;

  const copyCliCommand = () => {
    navigator.clipboard.writeText(agentCliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090514] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Background Animated Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-10">

        {/* NETWORK WARNING BANNER */}
        {isWrongChain && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-amber-300">Wrong Network Detected</p>
                <p className="text-xs text-amber-200/80">
                  Please connect to BNB Smart Chain Mainnet (Chain ID: 56) to claim MAGES rewards.
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

        {/* HERO SECTION */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            BNB Smart Chain Mainnet • Verified Airdrop
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
            MAGES <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-lime-400 bg-clip-text text-transparent">AIRDROP</span>
          </h1>

          <p className="text-lg sm:text-xl font-medium text-purple-300 italic">
            &ldquo;Your journey deserves rewards.&rdquo;
          </p>

          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Eligible WeZards NFT holders receive <strong className="text-white">1,000 MAGES</strong> per verified token. Connect your Agentic Wallet or enter an address to verify on-chain eligibility.
          </p>
        </div>

        {/* WALLET CONNECTION & MANUAL SEARCH BAR */}
        <div className="bg-[#160D27]/80 border border-[#2E1B4E] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#2E1B4E] pb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>⚡</span> Agentic Wallet Gateway
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Connect via Binance Agentic Wallet or inspect eligibility for any BSC address
              </p>
            </div>

            {/* Wallet Connect / Status Button */}
            <div>
              {!address ? (
                <button
                  onClick={() => setWalletModalOpen(true)}
                  disabled={isConnecting}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {isConnecting ? 'Connecting...' : 'CONNECT AGENTIC WALLET'}
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-black/40 border border-emerald-500/30 px-4 py-2.5 rounded-2xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="text-left font-mono">
                    <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Agentic Wallet</p>
                    <p className="text-sm font-bold text-white">{formatAddress(address)}</p>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="ml-2 px-2.5 py-1 text-xs text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition"
                    title="Disconnect Wallet"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Manual Address Checker Form */}
          <form onSubmit={handleManualCheck} className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
              Or Enter Address Manually to Check Eligibility:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="0x... (BNB Smart Chain wallet address)"
                  value={manualInput}
                  onChange={(e) => {
                    setManualInput(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  className="w-full bg-[#090514] border border-[#2E1B4E] rounded-2xl px-4 py-3 text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
                />
                {manualAddress && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-md bg-white/5"
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-3 bg-[#2E1B4E] hover:bg-[#3D2569] text-white font-bold rounded-2xl text-sm transition flex items-center justify-center gap-2 border border-purple-500/30 shadow-md"
              >
                {isSearching ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    CHECK ELIGIBILITY
                  </>
                )}
              </button>
            </div>
            {inputError && (
              <p className="text-xs text-rose-400 font-mono mt-1 pl-1">{inputError}</p>
            )}
          </form>
        </div>

        {/* ELIGIBILITY & ALLOCATION DASHBOARD */}
        {activeAddress ? (
          <div className="bg-[#160D27]/90 border border-[#2E1B4E] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-8 animate-fadeIn">
            {/* User Target Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2E1B4E] pb-6">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                  {manualAddress ? 'Manual Address Check' : 'Connected Wallet Allocation'}
                </span>
                <p className="text-xl sm:text-2xl font-black text-white font-mono break-all">
                  {activeAddress}
                </p>
                {manualAddress && address && address.toLowerCase() !== manualAddress.toLowerCase() && (
                  <p className="text-xs text-amber-300 font-medium">
                    ⚠️ Viewing external wallet. Connect this wallet to claim rewards.
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div className="self-start sm:self-auto">
                {badgeStatus === 'Claim Available' && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-500/20">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    CLAIM AVAILABLE
                  </span>
                )}
                {badgeStatus === 'Eligible' && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 font-extrabold text-sm tracking-wide shadow-lg shadow-teal-500/20">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    ELIGIBLE (UNCONNECTED)
                  </span>
                )}
                {badgeStatus === 'Already Claimed' && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold text-sm tracking-wide">
                    <span>✓</span> ALREADY CLAIMED
                  </span>
                )}
                {badgeStatus === 'Not Eligible' && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-800 text-gray-400 border border-gray-700 font-bold text-sm tracking-wide">
                    <span>✕</span> NOT ELIGIBLE
                  </span>
                )}
              </div>
            </div>

            {/* Allocation Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Allocation */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-semibold mb-2">
                  <span>Total Allocation</span>
                  <span className="text-purple-400 text-base">✦</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {loadingClaims ? '...' : `${totalAllocatedMAGES.toLocaleString()} MAGES`}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {totalEligibleTokens} eligible WeZards NFT{totalEligibleTokens !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Already Claimed */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-semibold mb-2">
                  <span>Already Claimed</span>
                  <span className="text-amber-400 text-base">✓</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {loadingClaims ? '...' : `${alreadyClaimedMAGES.toLocaleString()} MAGES`}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {claimedTokens.length} token{claimedTokens.length !== 1 ? 's' : ''} claimed
                </p>
              </div>

              {/* Available to Claim */}
              <div className="bg-gradient-to-br from-emerald-950/40 to-black/30 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs text-emerald-400 uppercase font-semibold mb-2">
                  <span>Available to Claim</span>
                  <span className="text-emerald-400 text-base">🎁</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-300">
                  {loadingClaims ? '...' : `${availableToClaimMAGES.toLocaleString()} MAGES`}
                </div>
                <p className="text-xs text-emerald-400/80 mt-1">
                  {unclaimedTokens.length} token{unclaimedTokens.length !== 1 ? 's' : ''} unclaimed
                </p>
              </div>

              {/* Current Wallet Balance */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-semibold mb-2">
                  <span>Current MAGES</span>
                  <span className="text-cyan-400 text-base">💰</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {loadingClaims ? '...' : `${userMagesBalance} MAGES`}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  In wallet on BNB Chain
                </p>
              </div>
            </div>

            {/* CLAIM ACTION SECTION */}
            <div className="p-6 bg-gradient-to-r from-emerald-950/30 via-[#1F1138]/50 to-purple-950/30 border border-emerald-500/30 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    Claim MAGES Rewards
                  </h3>
                  <p className="text-xs text-gray-300 mt-1">
                    Direct on-chain claim via official MAGES Airdrop contract on BNB Smart Chain.
                  </p>
                </div>

                {/* Primary Claim Button */}
                <div>
                  {!address ? (
                    <button
                      onClick={() => setWalletModalOpen(true)}
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Connect Agentic Wallet to Claim
                    </button>
                  ) : !isTargetConnected ? (
                    <button
                      onClick={connectAgenticWallet}
                      className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-sm transition-all shadow-lg shadow-amber-500/20"
                    >
                      Switch to This Wallet to Claim
                    </button>
                  ) : availableToClaimMAGES === 0 ? (
                    <button
                      disabled
                      className="w-full sm:w-auto px-8 py-3.5 bg-gray-800 text-gray-500 font-bold rounded-2xl text-sm cursor-not-allowed border border-white/5"
                    >
                      {totalEligibleTokens === 0 ? 'No Allocation' : 'All Rewards Claimed'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClaimTokens(unclaimedTokens.map(t => t.tokenId))}
                      disabled={txState.status === 'waiting_approval' || txState.status === 'pending' || txState.status === 'submitted'}
                      className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-emerald-400 via-teal-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 text-black font-black text-base rounded-2xl transition-all shadow-xl shadow-emerald-500/25 active:scale-95 disabled:opacity-50"
                    >
                      {txState.status === 'waiting_approval'
                        ? 'Confirming in Wallet...'
                        : txState.status === 'pending' || txState.status === 'submitted'
                        ? 'Executing on Chain...'
                        : `CLAIM ${availableToClaimMAGES.toLocaleString()} MAGES`}
                    </button>
                  )}
                </div>
              </div>

              {/* Transaction Progress Indicator */}
              {txState.status !== 'idle' && (
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    {txState.status === 'waiting_approval' && (
                      <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    )}
                    {(txState.status === 'pending' || txState.status === 'submitted') && (
                      <span className="w-3 h-3 rounded-full bg-cyan-400 animate-spin" />
                    )}
                    {txState.status === 'confirmed' && (
                      <span className="text-emerald-400 text-xl font-bold">✓</span>
                    )}
                    {txState.status === 'failed' && (
                      <span className="text-rose-400 text-xl font-bold">✕</span>
                    )}
                    <p className="text-sm font-bold text-white">
                      {txState.status === 'waiting_approval' && 'Step 1/3: Waiting for Agentic Wallet Approval...'}
                      {txState.status === 'submitted' && 'Step 2/3: Broadcasting Transaction to BNB Chain...'}
                      {txState.status === 'pending' && 'Step 3/3: Waiting for Block Confirmation...'}
                      {txState.status === 'confirmed' && 'Claim Confirmed on BNB Smart Chain!'}
                      {txState.status === 'failed' && 'Transaction Failed'}
                    </p>
                  </div>

                  {txState.txHash && (
                    <p className="text-xs font-mono text-gray-300">
                      Transaction Hash:{' '}
                      <a
                        href={`https://bscscan.com/tx/${txState.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        {txState.txHash} ↗
                      </a>
                    </p>
                  )}

                  {txState.error && (
                    <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl font-mono">
                      {txState.error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ELIGIBLE NFTS TOKEN GRID */}
            {eligibleClaims.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-white">
                    Verified WeZards NFTs ({eligibleClaims.length})
                  </h4>
                  <span className="text-xs text-gray-400 font-mono">1,000 MAGES / NFT</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {eligibleClaims.map((token) => (
                    <div
                      key={token.tokenId}
                      className={`p-4 rounded-2xl border transition-all ${
                        token.isClaimed
                          ? 'bg-black/20 border-white/5 opacity-70'
                          : 'bg-black/40 border-emerald-500/30 hover:border-emerald-500/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono font-bold text-purple-300">
                          WeZards #{String(token.tokenId).padStart(4, '0')}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            token.isClaimed
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {token.isClaimed ? 'CLAIMED' : 'UNCLAIMED'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                        <span>Reward:</span>
                        <span className="font-bold text-white">1,000 MAGES</span>
                      </div>

                      {!token.isClaimed && isTargetConnected ? (
                        <button
                          onClick={() => handleClaimTokens([token.tokenId])}
                          disabled={txState.status === 'waiting_approval' || txState.status === 'pending'}
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition"
                        >
                          Claim 1,000 MAGES
                        </button>
                      ) : (
                        <div className="text-center py-1.5 text-xs text-gray-500 font-mono">
                          {token.isClaimed ? 'Already Claimed' : 'Connect Wallet to Claim'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#160D27]/60 border border-[#2E1B4E] rounded-3xl p-10 text-center backdrop-blur-md space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-3xl text-emerald-400">
              🧙‍♂️
            </div>
            <h3 className="text-xl font-bold text-white">Check Your WeZards NFT Airdrop Eligibility</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Connect your Agentic Wallet or enter your BNB Smart Chain address above to check your exact MAGES allocation.
            </p>
          </div>
        )}

        {/* PROTOCOL OVERVIEW STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#160D27]/60 border border-[#2E1B4E] rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 uppercase">Reward Per NFT</p>
            <p className="text-xl font-bold text-white mt-1">1,000 MAGES</p>
          </div>
          <div className="bg-[#160D27]/60 border border-[#2E1B4E] rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 uppercase">Total Airdrop Pool</p>
            <p className="text-xl font-bold text-white mt-1">4,000,000 MAGES</p>
          </div>
          <div className="bg-[#160D27]/60 border border-[#2E1B4E] rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 uppercase">Max Eligible NFTs</p>
            <p className="text-xl font-bold text-white mt-1">4,000 NFTs</p>
          </div>
          <div className="bg-[#160D27]/60 border border-[#2E1B4E] rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 uppercase">Network</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">BSC Chain 56</p>
          </div>
        </div>

        {/* VERIFIED SMART CONTRACT DIRECTORY */}
        <div className="bg-[#160D27]/40 border border-[#2E1B4E] rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Verified Smart Contracts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-black/30 rounded-xl border border-white/5">
              <span className="text-gray-500 block mb-1">MAGES Airdrop Contract:</span>
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
              <span className="text-gray-500 block mb-1">MAGES Token Contract (ERC-20):</span>
              <a
                href={`https://bscscan.com/token/${CONTRACT_ADDRESSES.TOKEN}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline break-all"
              >
                {CONTRACT_ADDRESSES.TOKEN}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* AGENTIC WALLET CONNECTION MODAL */}
      {walletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#160D27] border border-[#2E1B4E] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-[#2E1B4E] pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-lg font-bold text-white">Connect Agentic Wallet</h3>
              </div>
              <button
                onClick={() => setWalletModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
              <button
                onClick={() => setModalTab('agent_qr')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  modalTab === 'agent_qr'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                ⚡ Agentic QR & CLI
              </button>
              <button
                onClick={() => setModalTab('extension')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  modalTab === 'extension'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📱 Browser Extension
              </button>
            </div>

            {/* Tab 1: Agentic Wallet QR / CLI */}
            {modalTab === 'agent_qr' && (
              <div className="space-y-4 text-center">
                <p className="text-xs text-gray-300">
                  Scan with Binance Agent Wallet App or copy terminal command
                </p>

                {/* QR Code Graphic */}
                <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
                  <svg viewBox="0 0 160 160" className="w-full h-full">
                    <rect width="160" height="160" fill="#FFFFFF" />
                    <rect x="10" y="10" width="35" height="35" fill="#090514" rx="4" />
                    <rect x="15" y="15" width="25" height="25" fill="#FFFFFF" rx="2" />
                    <rect x="20" y="20" width="15" height="15" fill="#10B981" rx="2" />
                    <rect x="115" y="10" width="35" height="35" fill="#090514" rx="4" />
                    <rect x="120" y="15" width="25" height="25" fill="#FFFFFF" rx="2" />
                    <rect x="125" y="20" width="15" height="15" fill="#10B981" rx="2" />
                    <rect x="10" y="115" width="35" height="35" fill="#090514" rx="4" />
                    <rect x="15" y="120" width="25" height="25" fill="#FFFFFF" rx="2" />
                    <rect x="20" y="125" width="15" height="15" fill="#10B981" rx="2" />
                    <g fill="#160D27">
                      <rect x="52" y="12" width="6" height="6" />
                      <rect x="64" y="12" width="6" height="6" />
                      <rect x="76" y="12" width="6" height="6" />
                      <rect x="94" y="12" width="6" height="6" />
                      <rect x="58" y="24" width="6" height="6" />
                      <rect x="70" y="24" width="6" height="6" />
                      <rect x="88" y="24" width="6" height="6" />
                      <rect x="52" y="36" width="6" height="6" />
                      <rect x="82" y="36" width="6" height="6" />
                      <rect x="12" y="52" width="6" height="6" />
                      <rect x="24" y="52" width="6" height="6" />
                      <rect x="42" y="52" width="6" height="6" />
                      <rect x="54" y="52" width="6" height="6" />
                      <rect x="72" y="52" width="6" height="6" />
                      <rect x="90" y="52" width="6" height="6" />
                      <rect x="108" y="52" width="6" height="6" />
                      <rect x="126" y="52" width="6" height="6" />
                      <rect x="144" y="52" width="6" height="6" />
                      <rect x="52" y="114" width="6" height="6" />
                      <rect x="70" y="114" width="6" height="6" />
                      <rect x="88" y="114" width="6" height="6" />
                    </g>
                  </svg>
                </div>

                {/* CLI Command */}
                <div className="bg-black/50 border border-white/5 rounded-xl p-3 text-left">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Agentic CLI Command:</span>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[11px] font-mono text-emerald-300 truncate">
                      {agentCliCommand}
                    </code>
                    <button
                      onClick={copyCliCommand}
                      className="px-2.5 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition"
                    >
                      {copiedCli ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={connectAgenticWallet}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold rounded-xl text-sm transition"
                >
                  Authorize Agentic Session
                </button>
              </div>
            )}

            {/* Tab 2: Browser Extension */}
            {modalTab === 'extension' && (
              <div className="space-y-3">
                <button
                  onClick={connectAgenticWallet}
                  className="w-full p-4 bg-black/40 hover:bg-black/60 border border-[#2E1B4E] hover:border-emerald-500/40 rounded-2xl flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg">
                      🔶
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">Binance Web3 / Agentic Wallet</p>
                      <p className="text-xs text-gray-400">Official BNB Chain Provider</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">Connect →</span>
                </button>

                <button
                  onClick={connectAgenticWallet}
                  className="w-full p-4 bg-black/40 hover:bg-black/60 border border-[#2E1B4E] hover:border-emerald-500/40 rounded-2xl flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-lg">
                      🦊
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">MetaMask</p>
                      <p className="text-xs text-gray-400">EVM Browser Extension</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">Connect →</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CLAIM SUCCESS CELEBRATION MODAL */}
      {txState.status === 'confirmed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#160D27] border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto text-emerald-400 animate-bounce">
              ✓
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">Airdrop Claim Confirmed!</h3>
              <p className="text-sm text-gray-300">
                You have successfully claimed your MAGES token rewards directly to your Agentic Wallet.
              </p>
            </div>

            {txState.txHash && (
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xs">
                <span className="text-gray-500 block mb-1">Transaction Hash:</span>
                <a
                  href={`https://bscscan.com/tx/${txState.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline break-all"
                >
                  {txState.txHash} ↗
                </a>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setTxState({ status: 'idle', txHash: null, error: null })}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-sm transition"
              >
                Done
              </button>
              <Link
                href="/mages"
                className="px-6 py-2.5 bg-[#2E1B4E] hover:bg-[#3D2569] text-white font-bold rounded-xl text-sm transition"
              >
                View in Hub
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
