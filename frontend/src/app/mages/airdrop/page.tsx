'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  formatAddress,
  CONTRACT_ADDRESSES,
  fetchMagesAirdropStats,
  MagesAirdropStats,
  sendWalletContractTransaction,
  bscPublicClient
} from '../../../lib/web3';
import {
  getWalletAirdropData,
  verifyProof,
  AirdropTokenClaim
} from '../../../lib/merkleEngine';
import { encodeFunctionData, parseAbi } from 'viem';

export default function MagesAirdropPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [stats, setStats] = useState<MagesAirdropStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // User Airdrop Claims State
  const [eligibleClaims, setEligibleClaims] = useState<AirdropTokenClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);

  // Transaction States
  const [txState, setTxState] = useState<{
    status: 'idle' | 'waiting_approval' | 'submitted' | 'pending' | 'confirmed' | 'failed';
    txHash: string | null;
    error: string | null;
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

  useEffect(() => {
    loadStats();
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
  }, [loadStats, checkWallet]);

  // Load wallet claims & check on-chain claimed status
  const loadWalletEligibility = useCallback(async (wallet: string) => {
    try {
      setLoadingClaims(true);
      const profile = getWalletAirdropData(wallet);
      const abi = parseAbi(['function isTokenClaimed(uint256) view returns (bool)']);

      const updated = await Promise.all(
        profile.tokens.map(async (token) => {
          try {
            const isClaimed = await bscPublicClient.readContract({
              address: CONTRACT_ADDRESSES.AIRDROP as `0x${string}`,
              abi,
              functionName: 'isTokenClaimed',
              args: [BigInt(token.tokenId)]
            });
            return { ...token, isClaimed: Boolean(isClaimed) };
          } catch {
            return { ...token, isClaimed: false };
          }
        })
      );

      setEligibleClaims(updated);
      if (updated.length > 0 && !selectedTokenId) {
        const firstUnclaimed = updated.find(t => !t.isClaimed);
        setSelectedTokenId(firstUnclaimed ? firstUnclaimed.tokenId : updated[0].tokenId);
      }
    } catch (e) {
      console.error('Failed to load wallet eligibility', e);
    } finally {
      setLoadingClaims(false);
    }
  }, [selectedTokenId]);

  useEffect(() => {
    if (address) {
      loadWalletEligibility(address);
    } else {
      setEligibleClaims([]);
      setSelectedTokenId(null);
    }
  }, [address, loadWalletEligibility]);

  // Connect Wallet Action
  const connectWallet = async () => {
    const provider = (window as any).ethereum || (window as any).BinanceChain;
    if (!provider) {
      alert('Please install MetaMask or Binance Web3 Wallet to continue.');
      return;
    }
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
      }
      const c = await provider.request({ method: 'eth_chainId' });
      setChainId(Number(BigInt(c)));
    } catch (err: any) {
      alert(err.message || 'Failed to connect wallet');
    }
  };

  // Switch to BNB Chain (Chain ID: 56)
  const switchNetwork = async () => {
    const provider = (window as any).ethereum;
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

  // Claim Existing (Phase A)
  const handleClaimExisting = async (tokenId: number) => {
    const target = eligibleClaims.find(c => c.tokenId === tokenId && c.phase === 0);
    if (!target) {
      alert(`Token #${tokenId} is not in the Phase A snapshot allocation.`);
      return;
    }
    if (target.isClaimed) {
      alert(`Token #${tokenId} has already been claimed on-chain.`);
      return;
    }

    if (chainId !== 56) {
      await switchNetwork();
      return;
    }

    // Verify proof against on-chain root
    if (stats?.existingRoot && stats.existingRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      const isValid = verifyProof(target.leaf, target.proof, stats.existingRoot as `0x${string}`);
      if (!isValid) {
        alert('Invalid Merkle proof for this token against on-chain root.');
        return;
      }
    }

    try {
      setTxState({ status: 'waiting_approval', txHash: null, error: null });

      const abi = parseAbi(['function claimExisting(uint256 tokenId, bytes32[] calldata proof) external']);
      const calldata = encodeFunctionData({
        abi,
        functionName: 'claimExisting',
        args: [BigInt(tokenId), target.proof]
      });

      setTxState({ status: 'submitted', txHash: null, error: null });

      const hash = await sendWalletContractTransaction({
        to: CONTRACT_ADDRESSES.AIRDROP,
        data: calldata
      });

      setTxState({ status: 'pending', txHash: hash, error: null });

      // Wait for receipt
      const receipt = await bscPublicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        confirmations: 1
      });

      if (receipt.status === 'success') {
        setTxState({ status: 'confirmed', txHash: hash, error: null });
        if (address) await loadWalletEligibility(address);
        await loadStats();
      } else {
        setTxState({ status: 'failed', txHash: hash, error: 'Transaction reverted on-chain.' });
      }
    } catch (err: any) {
      console.error('Claim error:', err);
      setTxState({
        status: 'failed',
        txHash: null,
        error: err?.shortMessage || err?.message || 'Transaction was rejected or failed.'
      });
    }
  };

  // Claim Future Minter (Phase B)
  const handleClaimFuture = async (epoch: number, tokenId: number) => {
    const target = eligibleClaims.find(c => c.tokenId === tokenId && c.phase === 1);
    if (!target) {
      alert(`Token #${tokenId} is not in the Phase B future minter allocation.`);
      return;
    }
    if (target.isClaimed) {
      alert(`Token #${tokenId} has already been claimed on-chain.`);
      return;
    }

    if (chainId !== 56) {
      await switchNetwork();
      return;
    }

    try {
      setTxState({ status: 'waiting_approval', txHash: null, error: null });

      const abi = parseAbi(['function claimFuture(uint256 epoch, uint256 tokenId, bytes32[] calldata proof) external']);
      const calldata = encodeFunctionData({
        abi,
        functionName: 'claimFuture',
        args: [BigInt(epoch), BigInt(tokenId), target.proof]
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

      if (receipt.status === 'success') {
        setTxState({ status: 'confirmed', txHash: hash, error: null });
        if (address) await loadWalletEligibility(address);
        await loadStats();
      } else {
        setTxState({ status: 'failed', txHash: hash, error: 'Transaction reverted on-chain.' });
      }
    } catch (err: any) {
      setTxState({
        status: 'failed',
        txHash: null,
        error: err?.shortMessage || err?.message || 'Transaction was rejected or failed.'
      });
    }
  };

  // Derived user stats
  const existingEligibleTokens = eligibleClaims.filter(c => c.phase === 0);
  const futureEligibleTokens = eligibleClaims.filter(c => c.phase === 1);
  const unclaimedTokens = eligibleClaims.filter(c => !c.isClaimed);
  const claimedTokens = eligibleClaims.filter(c => c.isClaimed);
  const totalClaimableMAGES = unclaimedTokens.length * 1000;
  const totalClaimedMAGES = claimedTokens.length * 1000;

  const selectedToken = eligibleClaims.find(c => c.tokenId === selectedTokenId);

  return (
    <div className="min-h-screen bg-[#090514] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HERO HEADER */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            BNB Smart Chain Mainnet • Verified Airdrop
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
            MAGES NFT Holder{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-lime-400">
              Airdrop
            </span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Eligible WeZards NFT holders and original minters claim <strong className="text-white">1,000 MAGES</strong> per verified token. Powered by cryptographic Merkle proofs and on-chain verification.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
              href="/mages"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#160D27] border border-[#2E1B4E] text-gray-300 hover:text-white hover:border-[#7928CA] transition"
            >
              ← Back to MAGES Hub
            </Link>
            <Link
              href="/mages/presale"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/40 text-amber-300 hover:text-white transition"
            >
              View Public Presale ($0.0034) →
            </Link>
          </div>
        </div>

        {/* NETWORK WARNING IF WRONG CHAIN */}
        {address && chainId !== 56 && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="text-sm font-bold text-amber-300">Wrong Network Connected</div>
                <div className="text-xs text-gray-300">You must switch to BNB Smart Chain Mainnet (Chain ID: 56) to claim rewards.</div>
              </div>
            </div>
            <button
              onClick={switchNetwork}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition"
            >
              Switch to BNB Chain
            </button>
          </div>
        )}

        {/* 1. PROTOCOL GLOBAL STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Reward Per NFT</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1">1,000 MAGES</div>
            <div className="text-[11px] text-gray-500 mt-1">Max 4,000 NFTs (4,000,000 Cap)</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Eligible NFTs</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
              {loadingStats ? '...' : (stats?.totalEligibleNFTs || 2556).toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Phase A: {stats?.existingEligibleCount || 2556} • Phase B: {stats?.futureEligibleCount || 0}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Claimed</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-purple-300 mt-1">
              {loadingStats ? '...' : (stats?.totalClaimedNFTs || 0).toLocaleString()} NFTs
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              {loadingStats ? '...' : ((stats?.totalClaimedMAGES || 0)).toLocaleString()} MAGES Distributed
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Protocol Status</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 mt-1">
              {loadingStats ? '...' : stats?.statusLabel}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Remaining: {(stats?.remainingMAGESAllocation || 4000000).toLocaleString()} MAGES
            </div>
          </div>
        </div>

        {/* 2. USER DASHBOARD & CLAIM TERMINAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">

          {/* LEFT 2 COLS: ELIGIBILITY & TOKEN SELECTION */}
          <div className="lg:col-span-2 space-y-6">

            {/* Wallet Status Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#2E1B4E]">
                <div>
                  <div className="text-xs uppercase font-bold text-gray-400 tracking-wider">Connected Wallet</div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {address ? formatAddress(address) : 'No wallet connected'}
                  </div>
                </div>

                {!address ? (
                  <button
                    onClick={connectWallet}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-extrabold text-sm hover:from-emerald-400 hover:to-teal-500 transition shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="text-xs text-gray-300">Connected to BSC</span>
                  </div>
                )}
              </div>

              {/* User Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                <div className="p-3.5 rounded-xl bg-[#090514] border border-[#2E1B4E]">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Snapshot NFTs</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">{existingEligibleTokens.length}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#090514] border border-[#2E1B4E]">
                  <div className="text-[11px] text-gray-400 uppercase font-semibold">Future Minters</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">{futureEligibleTokens.length}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#090514] border border-[#2E1B4E]">
                  <div className="text-[11px] text-emerald-400 uppercase font-semibold">Claimable MAGES</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{totalClaimableMAGES.toLocaleString()}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#090514] border border-[#2E1B4E]">
                  <div className="text-[11px] text-purple-400 uppercase font-semibold">Already Claimed</div>
                  <div className="text-xl font-bold font-mono text-purple-300 mt-0.5">{totalClaimedMAGES.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Eligible Tokens List */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Your Eligible WeZards Tokens</h3>
                  <p className="text-xs text-gray-400">Select a token below to verify Merkle proof and trigger claim.</p>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#090514] border border-[#2E1B4E] text-gray-300">
                  {eligibleClaims.length} Total Registered
                </span>
              </div>

              {loadingClaims ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  <div className="w-8 h-8 mx-auto border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                  Checking Merkle dataset and on-chain claim registry...
                </div>
              ) : !address ? (
                <div className="py-12 text-center text-gray-400 text-sm bg-[#090514] rounded-2xl border border-dashed border-[#2E1B4E]">
                  Connect your Web3 wallet to scan snapshot and minter eligibility.
                </div>
              ) : eligibleClaims.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm bg-[#090514] rounded-2xl border border-dashed border-[#2E1B4E]">
                  <p className="font-semibold text-gray-300 mb-1">No Airdrop Allocation Found for this Wallet</p>
                  <p className="text-xs max-w-md mx-auto text-gray-500">
                    This wallet was not holding WeZards NFTs at the snapshot block. If you acquire NFTs now, future minter rewards are granted in upcoming Merkle epochs.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1 pr-2">
                  {eligibleClaims.map((item) => {
                    const isSelected = selectedTokenId === item.tokenId;
                    return (
                      <button
                        key={`${item.phase}_${item.tokenId}`}
                        onClick={() => setSelectedTokenId(item.tokenId)}
                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                          isSelected
                            ? 'bg-[#24133D] border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            : 'bg-[#090514] border-[#2E1B4E] hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-mono font-bold text-white">#{item.tokenId}</span>
                          {item.isClaimed ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Claimed
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                              Eligible
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">{item.phaseName}</div>
                        <div className="text-xs font-bold text-emerald-400 mt-1">+1,000 MAGES</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COL: CLAIM ACTION TERMINAL */}
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border-2 border-[#2E1B4E] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="text-xs uppercase font-bold text-emerald-400 tracking-wider mb-2">
                Execution Terminal
              </div>
              <h3 className="text-xl font-black text-white mb-4">Claim Transaction</h3>

              {selectedToken ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E]">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Target Token ID:</span>
                      <strong className="text-white font-mono">WeZards #{selectedToken.tokenId}</strong>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Airdrop Phase:</span>
                      <strong className="text-emerald-400">{selectedToken.phaseName}</strong>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Reward Amount:</span>
                      <strong className="text-white font-mono">1,000 MAGES</strong>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>On-Chain Status:</span>
                      <strong className={selectedToken.isClaimed ? 'text-purple-400' : 'text-emerald-400'}>
                        {selectedToken.isClaimed ? 'Already Claimed' : 'Unclaimed / Ready'}
                      </strong>
                    </div>
                  </div>

                  {/* Merkle Proof Details */}
                  <div className="p-3 rounded-xl bg-[#090514] border border-[#2E1B4E] text-[11px] font-mono text-gray-400">
                    <div className="flex justify-between mb-1">
                      <span>Proof Branches:</span>
                      <span className="text-white">{selectedToken.proof.length} nodes</span>
                    </div>
                    <div className="truncate text-gray-500">
                      Leaf: {selectedToken.leaf}
                    </div>
                  </div>

                  {/* Claim Buttons (Section 3 Requirement: Two separate buttons) */}
                  <div className="space-y-3 pt-2">
                    {selectedToken.phase === 0 ? (
                      <button
                        onClick={() => handleClaimExisting(selectedToken.tokenId)}
                        disabled={selectedToken.isClaimed || txState.status === 'pending' || txState.status === 'waiting_approval'}
                        className="w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_25px_rgba(16,185,129,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {selectedToken.isClaimed
                          ? 'Token Reward Already Claimed'
                          : txState.status === 'pending'
                          ? 'Confirming on BSC...'
                          : txState.status === 'waiting_approval'
                          ? 'Approve in Wallet...'
                          : 'CLAIM EXISTING NFT REWARDS'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClaimFuture(selectedToken.epoch || 0, selectedToken.tokenId)}
                        disabled={selectedToken.isClaimed || txState.status === 'pending' || txState.status === 'waiting_approval'}
                        className="w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-400 hover:to-indigo-400 shadow-[0_0_25px_rgba(147,51,234,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {selectedToken.isClaimed
                          ? 'Token Reward Already Claimed'
                          : txState.status === 'pending'
                          ? 'Confirming on BSC...'
                          : 'CLAIM FUTURE MINTER REWARDS'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-gray-500 bg-[#090514] rounded-2xl border border-[#2E1B4E]">
                  Select an eligible token from the list to preview and claim rewards.
                </div>
              )}

              {/* Transaction Feedback Modal/Banner */}
              {txState.status !== 'idle' && (
                <div className="mt-6 p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] space-y-2">
                  <div className="flex items-center gap-2">
                    {txState.status === 'confirmed' && <span className="text-emerald-400 font-bold">✓ Transaction Confirmed</span>}
                    {txState.status === 'pending' && <span className="text-amber-400 font-bold animate-pulse">⏳ Transaction Pending</span>}
                    {txState.status === 'waiting_approval' && <span className="text-blue-400 font-bold animate-pulse">🦊 Awaiting Wallet Signature</span>}
                    {txState.status === 'failed' && <span className="text-red-400 font-bold">✕ Transaction Failed</span>}
                  </div>

                  {txState.txHash && (
                    <div className="text-xs">
                      <a
                        href={`https://bscscan.com/tx/${txState.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1 font-mono break-all"
                      >
                        View on BscScan: {formatAddress(txState.txHash)} ↗
                      </a>
                    </div>
                  )}

                  {txState.error && (
                    <div className="text-xs text-red-400 leading-relaxed">
                      {txState.error}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Smart Contract Reference Box */}
            <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E] text-xs space-y-2">
              <div className="text-gray-400 uppercase font-bold tracking-wider text-[10px]">Verified Contract Source</div>
              <div className="flex justify-between">
                <span className="text-gray-400">Airdrop Address:</span>
                <a
                  href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.AIRDROP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 font-mono hover:underline"
                >
                  {formatAddress(CONTRACT_ADDRESSES.AIRDROP)} ↗
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Token Address:</span>
                <a
                  href={`https://bscscan.com/token/${CONTRACT_ADDRESSES.TOKEN}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 font-mono hover:underline"
                >
                  {formatAddress(CONTRACT_ADDRESSES.TOKEN)} ↗
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

