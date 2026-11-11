'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  formatAddress,
  CONTRACT_ADDRESSES,
  fetchMagesAirdropStats,
  fetchMagesPresaleStats,
  MagesAirdropStats,
  MagesPresaleStats,
  sendWalletContractTransaction,
  bscPublicClient,
  getWalletProvider
} from '@/lib/web3';
import { phaseASummary } from '@/lib/merkleEngine';
import { encodeFunctionData, parseAbi } from 'viem';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel,
  isDestructive,
  onConfirm,
  onCancel
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#160D27] border border-[#2E1B4E] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
            isDestructive ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          }`}>
            {isDestructive ? '⚠️' : '🛡️'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-xs text-gray-400">Owner Action Required</p>
          </div>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed bg-black/30 p-4 rounded-2xl border border-white/5 font-mono text-xs">
          {description}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMagesPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Contract On-Chain Stats & Owners
  const [airdropStats, setAirdropStats] = useState<MagesAirdropStats | null>(null);
  const [presaleStats, setPresaleStats] = useState<MagesPresaleStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Airdrop Form States
  const [existingRootInput, setExistingRootInput] = useState('');
  const [existingCountInput, setExistingCountInput] = useState('');
  const [futureRootInput, setFutureRootInput] = useState('');
  const [futureCountInput, setFutureCountInput] = useState('');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    isDestructive?: boolean;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: '',
    isDestructive: false,
    action: async () => {}
  });

  // Transaction State
  const [txState, setTxState] = useState<{
    status: 'idle' | 'waiting_approval' | 'submitted' | 'pending' | 'confirmed' | 'failed';
    txHash: string | null;
    error: string | null;
    actionName: string;
  }>({
    status: 'idle',
    txHash: null,
    error: null,
    actionName: ''
  });

  // Check connected wallet
  const checkWallet = useCallback(async () => {
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

  const connectWallet = async () => {
    if (typeof window === 'undefined') return;
    const provider = getWalletProvider();
    if (!provider) {
      alert('Please install Binance Agentic Wallet or MetaMask.');
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

  const loadData = useCallback(async () => {
    try {
      setLoadingStats(true);
      const [airdrop, presale] = await Promise.all([
        fetchMagesAirdropStats(),
        fetchMagesPresaleStats()
      ]);
      setAirdropStats(airdrop);
      setPresaleStats(presale);
    } catch (err) {
      console.error('Failed to load contract stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    checkWallet();

    if (typeof window !== 'undefined') {
      const provider = getWalletProvider();
      if (provider) {
        const handleAccounts = (accs: string[]) => setAddress(accs[0] || null);
        const handleChain = (c: string) => setChainId(Number(BigInt(c)));
        provider.on?.('accountsChanged', handleAccounts);
        provider.on?.('chainChanged', handleChain);
        return () => {
          provider.removeListener?.('accountsChanged', handleAccounts);
          provider.removeListener?.('chainChanged', handleChain);
        };
      }
    }
  }, [loadData, checkWallet]);

  // Ownership verification
  const isAirdropOwner = Boolean(
    address &&
    airdropStats?.owner &&
    airdropStats.owner !== '0x0000000000000000000000000000000000000000' &&
    address.toLowerCase() === airdropStats.owner.toLowerCase()
  );

  const isPresaleOwner = Boolean(
    address &&
    presaleStats?.owner &&
    presaleStats.owner !== '0x0000000000000000000000000000000000000000' &&
    address.toLowerCase() === presaleStats.owner.toLowerCase()
  );

  const isAnyOwner = isAirdropOwner || isPresaleOwner;

  // Execute generic admin transaction
  const executeAdminTx = async (
    actionName: string,
    contractAddress: string,
    abiDef: string[],
    functionName: string,
    args: any[]
  ) => {
    try {
      setTxState({ status: 'waiting_approval', txHash: null, error: null, actionName });

      const data = encodeFunctionData({
        abi: parseAbi(abiDef),
        functionName: functionName as any,
        args
      });

      const txHash = await sendWalletContractTransaction({
        to: contractAddress,
        data,
        value: '0x0'
      });

      setTxState({ status: 'pending', txHash, error: null, actionName });

      const receipt = await bscPublicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`
      });

      if (receipt.status === 'success') {
        setTxState({ status: 'confirmed', txHash, error: null, actionName });
        await loadData();
      } else {
        setTxState({ status: 'failed', txHash, error: 'Transaction execution reverted on-chain.', actionName });
      }
    } catch (err: any) {
      console.error('Admin transaction failed:', err);
      setTxState({
        status: 'failed',
        txHash: null,
        error: err.shortMessage || err.message || 'Transaction was rejected or failed.',
        actionName
      });
    }
  };

  // Pre-fill Phase A Merkle Data from generated snapshot
  const loadPhaseAPreset = () => {
    setExistingRootInput(phaseASummary.merkleRoot);
    setExistingCountInput(String(phaseASummary.eligibleCount));
  };

  return (
    <div className="min-h-screen bg-[#090514] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#2E1B4E] pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              Contract Owner Console
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              MAGES <span className="bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">ADMIN</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-400 max-w-2xl">
              On-chain administration for the MAGES Airdrop and Public Presale smart contracts on BNB Smart Chain.
            </p>
          </div>

          <div>
            {!address ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-black font-bold rounded-2xl shadow-lg shadow-rose-500/20 transition-all"
              >
                {isConnecting ? 'Connecting...' : 'Connect Owner Wallet'}
              </button>
            ) : (
              <div className="bg-[#160D27]/80 border border-[#2E1B4E] px-4 py-2.5 rounded-2xl backdrop-blur-md">
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-mono">Connected As</p>
                  <p className="text-sm font-bold text-white font-mono">{formatAddress(address)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Access Status Check */}
        {address && !isAnyOwner && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-8 backdrop-blur-md text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-3xl">
              🔒
            </div>
            <h3 className="text-2xl font-black text-rose-300">Access Restricted</h3>
            <p className="text-sm text-gray-300 max-w-xl mx-auto">
              Your connected wallet <span className="font-mono text-white font-bold">{formatAddress(address)}</span> is not the on-chain contract owner of the MAGES Airdrop or Presale contracts.
            </p>

            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-xs text-left">
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 font-mono">
                <p className="text-gray-400 mb-1">Airdrop Contract Owner:</p>
                <p className="text-emerald-400 font-bold break-all">
                  {airdropStats?.owner || 'Loading...'}
                </p>
              </div>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 font-mono">
                <p className="text-gray-400 mb-1">Presale Contract Owner:</p>
                <p className="text-amber-400 font-bold break-all">
                  {presaleStats?.owner || 'Loading...'}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 pt-2">
              Please switch to the respective owner wallet address in MetaMask to unlock administrative actions.
            </p>
          </div>
        )}

        {/* Transaction Status Modal */}
        {txState.status !== 'idle' && (
          <div className="p-6 bg-[#160D27] border border-[#2E1B4E] rounded-3xl backdrop-blur-md space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {txState.status === 'waiting_approval' && (
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                )}
                {txState.status === 'pending' && (
                  <span className="w-3 h-3 rounded-full bg-cyan-400 animate-spin" />
                )}
                {txState.status === 'confirmed' && (
                  <span className="text-emerald-400 text-xl">✓</span>
                )}
                {txState.status === 'failed' && (
                  <span className="text-rose-400 text-xl">✕</span>
                )}
                <h4 className="font-bold text-white">
                  {txState.status === 'waiting_approval' && `Confirm ${txState.actionName} in Wallet...`}
                  {txState.status === 'pending' && `Executing ${txState.actionName} on BNB Chain...`}
                  {txState.status === 'confirmed' && `${txState.actionName} Successfully Confirmed!`}
                  {txState.status === 'failed' && `${txState.actionName} Failed`}
                </h4>
              </div>
              <button
                onClick={() => setTxState({ status: 'idle', txHash: null, error: null, actionName: '' })}
                className="text-xs text-gray-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>

            {txState.txHash && (
              <p className="text-xs font-mono text-gray-300">
                Transaction Hash:{' '}
                <a
                  href={`https://bscscan.com/tx/${txState.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  {txState.txHash} ↗
                </a>
              </p>
            )}

            {txState.error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-mono">
                {txState.error}
              </p>
            )}
          </div>
        )}

        {/* OWNER CONTROLS SECTION */}
        {(!address || isAnyOwner) && (
          <div className="space-y-10">
            {/* 1. AIRDROP CONTRACT MANAGEMENT */}
            <div className="bg-[#160D27]/80 border border-[#2E1B4E] rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2E1B4E] pb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase mb-2">
                    Airdrop Administration
                  </div>
                  <h2 className="text-2xl font-black text-white">MAGES Airdrop Contract</h2>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    Address: {CONTRACT_ADDRESSES.AIRDROP}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    airdropStats?.isPaused ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {airdropStats?.isPaused ? 'PAUSED' : 'ACTIVE'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    airdropStats?.eligibilityFinalized ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {airdropStats?.eligibilityFinalized ? 'FINALIZED' : 'UNFINALIZED'}
                  </span>
                </div>
              </div>

              {/* Airdrop Metrics Display */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                  <span className="text-gray-400 block mb-1">Existing Root</span>
                  <span className="text-white font-bold truncate block">
                    {airdropStats?.existingRoot ? `${airdropStats.existingRoot.slice(0, 10)}...${airdropStats.existingRoot.slice(-8)}` : 'Not Set'}
                  </span>
                </div>
                <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                  <span className="text-gray-400 block mb-1">Existing Eligible NFTs</span>
                  <span className="text-white font-bold text-sm block">
                    {airdropStats?.existingEligibleCount?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                  <span className="text-gray-400 block mb-1">Future Epoch Count</span>
                  <span className="text-white font-bold text-sm block">
                    {airdropStats?.futureEpochCount || 0}
                  </span>
                </div>
                <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                  <span className="text-gray-400 block mb-1">Total Claimed NFTs</span>
                  <span className="text-emerald-400 font-bold text-sm block">
                    {airdropStats?.totalClaimedNFTs || 0}
                  </span>
                </div>
              </div>

              {/* Action: Set Phase A Existing Merkle Root */}
              <div className="p-6 bg-black/20 rounded-2xl border border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">Set Phase A Snapshot Merkle Root</h3>
                    <p className="text-xs text-gray-400">
                      Authoritative root for existing 2,556 WeZards NFT holders.
                    </p>
                  </div>
                  <button
                    onClick={loadPhaseAPreset}
                    className="text-xs px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl transition-all self-start sm:self-auto font-mono"
                  >
                    ✦ Auto-Fill Generated Snapshot
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Merkle Root (bytes32)
                    </label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={existingRootInput}
                      onChange={(e) => setExistingRootInput(e.target.value)}
                      disabled={airdropStats?.eligibilityFinalized}
                      className="w-full bg-[#090514] border border-[#2E1B4E] rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Eligible Count
                    </label>
                    <input
                      type="number"
                      placeholder="2556"
                      value={existingCountInput}
                      onChange={(e) => setExistingCountInput(e.target.value)}
                      disabled={airdropStats?.eligibilityFinalized}
                      className="w-full bg-[#090514] border border-[#2E1B4E] rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!existingRootInput.startsWith('0x') || !existingCountInput) {
                      alert('Please provide a valid bytes32 Merkle root and eligible count.');
                      return;
                    }
                    setConfirmModal({
                      isOpen: true,
                      title: 'Set Existing Merkle Root',
                      description: `Execute setExistingRoot(${existingRootInput}, ${existingCountInput}) on MAGES Airdrop contract?`,
                      confirmLabel: 'Confirm Set Root',
                      action: async () => {
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        await executeAdminTx(
                          'Set Existing Root',
                          CONTRACT_ADDRESSES.AIRDROP,
                          ['function setExistingRoot(bytes32 root, uint256 eligibleCount) external'],
                          'setExistingRoot',
                          [existingRootInput as `0x${string}`, BigInt(existingCountInput)]
                        );
                      }
                    });
                  }}
                  disabled={airdropStats?.eligibilityFinalized || !existingRootInput}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold rounded-xl text-xs transition-all shadow-md"
                >
                  Set Phase A Merkle Root
                </button>
              </div>

              {/* Action: Add Phase B Future Epoch Root */}
              <div className="p-6 bg-black/20 rounded-2xl border border-white/5 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Add Phase B Future Epoch Merkle Root</h3>
                  <p className="text-xs text-gray-400">
                    Add subsequent epochs for future mints up to the 4,000 NFT total cap.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Epoch Merkle Root (bytes32)
                    </label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={futureRootInput}
                      onChange={(e) => setFutureRootInput(e.target.value)}
                      disabled={airdropStats?.eligibilityFinalized}
                      className="w-full bg-[#090514] border border-[#2E1B4E] rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Batch Count
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={futureCountInput}
                      onChange={(e) => setFutureCountInput(e.target.value)}
                      disabled={airdropStats?.eligibilityFinalized}
                      className="w-full bg-[#090514] border border-[#2E1B4E] rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!futureRootInput.startsWith('0x') || !futureCountInput) {
                      alert('Please provide a valid bytes32 Merkle root and batch count.');
                      return;
                    }
                    setConfirmModal({
                      isOpen: true,
                      title: 'Add Future Epoch Root',
                      description: `Execute addFutureRoot(${futureRootInput}, ${futureCountInput}) on MAGES Airdrop contract?`,
                      confirmLabel: 'Confirm Add Epoch',
                      action: async () => {
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        await executeAdminTx(
                          'Add Future Root',
                          CONTRACT_ADDRESSES.AIRDROP,
                          ['function addFutureRoot(bytes32 root, uint256 batchCount) external'],
                          'addFutureRoot',
                          [futureRootInput as `0x${string}`, BigInt(futureCountInput)]
                        );
                      }
                    });
                  }}
                  disabled={airdropStats?.eligibilityFinalized || !futureRootInput}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold rounded-xl text-xs transition-all shadow-md"
                >
                  Add Epoch Root
                </button>
              </div>

              {/* Protocol Controls */}
              <div className="p-6 bg-black/20 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-base font-bold text-white">Airdrop Contract State Controls</h3>
                <div className="flex flex-wrap gap-3">
                  {airdropStats?.isPaused ? (
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Unpause Airdrop Claims',
                          description: 'Enable claiming for all eligible NFT holders?',
                          confirmLabel: 'Unpause Contract',
                          action: async () => {
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            await executeAdminTx(
                              'Unpause Airdrop',
                              CONTRACT_ADDRESSES.AIRDROP,
                              ['function unpause() external'],
                              'unpause',
                              []
                            );
                          }
                        });
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all"
                    >
                      ▶ Unpause Airdrop
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Pause Airdrop Claims',
                          description: 'Temporarily halt all airdrop claim transactions?',
                          confirmLabel: 'Pause Contract',
                          isDestructive: true,
                          action: async () => {
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            await executeAdminTx(
                              'Pause Airdrop',
                              CONTRACT_ADDRESSES.AIRDROP,
                              ['function pause() external'],
                              'pause',
                              []
                            );
                          }
                        });
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all"
                    >
                      ⏸ Pause Airdrop
                    </button>
                  )}

                  {!airdropStats?.eligibilityFinalized && (
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Finalize Eligibility Permanently',
                          description: 'Finalize eligibility? Root changes will be permanently locked and the 180-day claim deadline will start.',
                          confirmLabel: 'Permanently Finalize',
                          isDestructive: true,
                          action: async () => {
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            await executeAdminTx(
                              'Finalize Eligibility',
                              CONTRACT_ADDRESSES.AIRDROP,
                              ['function finalizeEligibility() external'],
                              'finalizeEligibility',
                              []
                            );
                          }
                        });
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all"
                    >
                      🔒 Finalize Eligibility
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Withdraw Unclaimed Tokens',
                        description: 'Withdraw remaining unclaimed MAGES tokens to the treasury address (only callable after claim deadline)?',
                        confirmLabel: 'Withdraw Tokens',
                        isDestructive: true,
                        action: async () => {
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          await executeAdminTx(
                            'Withdraw Unclaimed',
                            CONTRACT_ADDRESSES.AIRDROP,
                            ['function withdrawUnclaimedTokens() external'],
                            'withdrawUnclaimedTokens',
                            []
                          );
                        }
                      });
                    }}
                    className="px-4 py-2 bg-rose-600/80 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all"
                  >
                    Withdraw Unclaimed Tokens
                  </button>
                </div>
              </div>
            </div>

            {/* 2. PRESALE CONTRACT MANAGEMENT */}
            <div className="bg-[#160D27]/80 border border-[#2E1B4E] rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2E1B4E] pb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase mb-2">
                    Presale Administration
                  </div>
                  <h2 className="text-2xl font-black text-white">MAGES Presale Contract</h2>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    Address: {CONTRACT_ADDRESSES.PRESALE}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    presaleStats?.isPaused ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {presaleStats?.isPaused ? 'PAUSED' : 'ACTIVE'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    STATUS: {presaleStats?.statusLabel || 'NOT STARTED'}
                  </span>
                </div>
              </div>

              {/* Presale Metrics Display */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                  <span className="text-gray-400 block mb-1">Tokens Sold</span>
                  <span className="text-white font-bold text-sm block">
                    {presaleStats?.tokensSold?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                  <span className="text-gray-400 block mb-1">Remaining MAGES</span>
                  <span className="text-white font-bold text-sm block">
                    {presaleStats?.remainingAllocation?.toLocaleString() || '5,250,000'}
                  </span>
                </div>
                <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                  <span className="text-gray-400 block mb-1">Total BNB Raised</span>
                  <span className="text-emerald-400 font-bold text-sm block">
                    {presaleStats?.totalBNBReceived || '0.0000'} BNB
                  </span>
                </div>
                <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                  <span className="text-gray-400 block mb-1">Total USDT Raised</span>
                  <span className="text-emerald-400 font-bold text-sm block">
                    ${presaleStats?.totalUSDTReceived || '0.00'}
                  </span>
                </div>
              </div>

              {/* Presale Action Controls */}
              <div className="p-6 bg-black/20 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-base font-bold text-white">Presale Lifecycle Controls</h3>
                <div className="flex flex-wrap gap-3">
                  {!presaleStats?.saleStarted ? (
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Start Public Presale',
                          description: 'Start the public presale? This activates purchases for a duration of 30 days.',
                          confirmLabel: 'Start Sale Now',
                          action: async () => {
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            await executeAdminTx(
                              'Start Presale',
                              CONTRACT_ADDRESSES.PRESALE,
                              ['function startPresale() external'],
                              'startPresale',
                              []
                            );
                          }
                        });
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold rounded-xl text-xs transition-all shadow-md"
                    >
                      🚀 Start Public Presale
                    </button>
                  ) : !presaleStats?.saleEnded ? (
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'End Public Presale',
                          description: 'End the public presale early? New purchases will be stopped.',
                          confirmLabel: 'End Sale Now',
                          isDestructive: true,
                          action: async () => {
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            await executeAdminTx(
                              'End Presale',
                              CONTRACT_ADDRESSES.PRESALE,
                              ['function endPresale() external'],
                              'endPresale',
                              []
                            );
                          }
                        });
                      }}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all"
                    >
                      ⏹ End Presale
                    </button>
                  ) : null}

                  {presaleStats?.isPaused ? (
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Unpause Presale',
                          description: 'Unpause presale purchases?',
                          confirmLabel: 'Unpause Sale',
                          action: async () => {
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            await executeAdminTx(
                              'Unpause Presale',
                              CONTRACT_ADDRESSES.PRESALE,
                              ['function unpause() external'],
                              'unpause',
                              []
                            );
                          }
                        });
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all"
                    >
                      ▶ Unpause Presale
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Pause Presale',
                          description: 'Pause all presale purchase transactions?',
                          confirmLabel: 'Pause Sale',
                          isDestructive: true,
                          action: async () => {
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            await executeAdminTx(
                              'Pause Presale',
                              CONTRACT_ADDRESSES.PRESALE,
                              ['function pause() external'],
                              'pause',
                              []
                            );
                          }
                        });
                      }}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all"
                    >
                      ⏸ Pause Presale
                    </button>
                  )}
                </div>
              </div>

              {/* Fund Withdrawal Controls */}
              <div className="p-6 bg-black/20 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-base font-bold text-white">Withdrawal Controls (To Treasury)</h3>
                <p className="text-xs text-gray-400">
                  Transfers accumulated presale funds directly to Treasury address: {CONTRACT_ADDRESSES.TREASURY}
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Withdraw BNB Proceeds',
                        description: `Withdraw collected BNB from Presale contract directly to the treasury wallet (${CONTRACT_ADDRESSES.TREASURY})?`,
                        confirmLabel: 'Withdraw BNB',
                        action: async () => {
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          await executeAdminTx(
                            'Withdraw BNB',
                            CONTRACT_ADDRESSES.PRESALE,
                            ['function withdrawBNB() external'],
                            'withdrawBNB',
                            []
                          );
                        }
                      });
                    }}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition-all shadow-md"
                  >
                    Withdraw BNB
                  </button>

                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Withdraw USDT Proceeds',
                        description: `Withdraw collected USDT from Presale contract directly to the treasury wallet (${CONTRACT_ADDRESSES.TREASURY})?`,
                        confirmLabel: 'Withdraw USDT',
                        action: async () => {
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          await executeAdminTx(
                            'Withdraw USDT',
                            CONTRACT_ADDRESSES.PRESALE,
                            ['function withdrawUSDT() external'],
                            'withdrawUSDT',
                            []
                          );
                        }
                      });
                    }}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all shadow-md"
                  >
                    Withdraw USDT
                  </button>

                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Withdraw Unsold MAGES Tokens',
                        description: `Withdraw remaining unsold MAGES inventory to the treasury (${CONTRACT_ADDRESSES.TREASURY})? (Only available after sale has ended).`,
                        confirmLabel: 'Withdraw MAGES',
                        isDestructive: true,
                        action: async () => {
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          await executeAdminTx(
                            'Withdraw Unsold MAGES',
                            CONTRACT_ADDRESSES.PRESALE,
                            ['function withdrawUnsoldMAGES() external'],
                            'withdrawUnsoldMAGES',
                            []
                          );
                        }
                      });
                    }}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all"
                  >
                    Withdraw Unsold MAGES
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.confirmLabel}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
