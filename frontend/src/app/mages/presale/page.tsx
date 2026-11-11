'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  formatAddress,
  CONTRACT_ADDRESSES,
  fetchMagesPresaleStats,
  MagesPresaleStats,
  fetchWalletMagesUnifiedState,
  sendWalletContractTransaction,
  bscPublicClient,
  getWalletProvider
} from '../../../lib/web3';
import { encodeFunctionData, parseAbi, formatUnits } from 'viem';

export default function MagesPresalePage() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [stats, setStats] = useState<MagesPresaleStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Wallet balances
  const [walletState, setWalletState] = useState<{
    magesBalance: string;
    bnbBalance: string;
    usdtBalance: string;
    usdtAllowance: string;
    rawUsdtAllowance: bigint;
  }>({
    magesBalance: '0',
    bnbBalance: '0',
    usdtBalance: '0',
    usdtAllowance: '0',
    rawUsdtAllowance: 0n
  });

  // Purchase form
  const [paymentMethod, setPaymentMethod] = useState<'BNB' | 'USDT'>('BNB');
  const [inputAmount, setInputAmount] = useState<string>('');

  // Countdown
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Transaction state
  const [txState, setTxState] = useState<{
    status: 'idle' | 'approving' | 'waiting_approval' | 'submitted' | 'pending' | 'confirmed' | 'failed';
    txHash: string | null;
    error: string | null;
    magesReceived: string | null;
  }>({ status: 'idle', txHash: null, error: null, magesReceived: null });

  // Load on-chain presale stats
  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const s = await fetchMagesPresaleStats();
      setStats(s);
    } catch (e) {
      console.error('Failed to load presale stats:', e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Load wallet balances
  const loadWalletState = useCallback(async (addr: string) => {
    try {
      const ws = await fetchWalletMagesUnifiedState(addr);
      setWalletState({
        magesBalance: ws.magesBalance,
        bnbBalance: ws.bnbBalance,
        usdtBalance: ws.usdtBalance,
        usdtAllowance: ws.usdtAllowance,
        rawUsdtAllowance: ws.rawUsdtAllowance || 0n
      });
    } catch (e) {
      console.error('Failed to load wallet state:', e);
    }
  }, []);

  // Check wallet on mount
  useEffect(() => {
    loadStats();

    if (typeof window !== 'undefined') {
      const provider = (window as any).ethereum;
      if (provider?.selectedAddress) {
        setAddress(provider.selectedAddress);
        loadWalletState(provider.selectedAddress);
      }

      const handleAccounts = (accs: string[]) => {
        const a = accs[0] || null;
        setAddress(a);
        if (a) loadWalletState(a);
      };
      const handleChain = (c: string) => setChainId(Number(BigInt(c)));

      provider?.on?.('accountsChanged', handleAccounts);
      provider?.on?.('chainChanged', handleChain);
      provider?.request?.({ method: 'eth_chainId' }).then((c: string) => setChainId(Number(BigInt(c)))).catch(() => {});

      return () => {
        provider?.removeListener?.('accountsChanged', handleAccounts);
        provider?.removeListener?.('chainChanged', handleChain);
      };
    }
  }, [loadStats, loadWalletState]);

  // Countdown timer
  useEffect(() => {
    if (!stats) return;

    const updateCountdown = () => {
      const remaining = stats.timeRemainingSeconds > 0
        ? stats.timeRemainingSeconds - Math.floor((Date.now() / 1000) - (stats.saleEndTime - stats.timeRemainingSeconds))
        : stats.saleEndTime > 0
          ? stats.saleEndTime - Math.floor(Date.now() / 1000)
          : 0;

      if (remaining <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(remaining / 86400),
        hours: Math.floor((remaining % 86400) / 3600),
        minutes: Math.floor((remaining % 3600) / 60),
        seconds: remaining % 60
      });
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [stats]);

  // Connect wallet
  const connectWallet = async () => {
    const provider = getWalletProvider();
    if (!provider) {
      alert('Please install MetaMask or Binance Web3 Wallet.');
      return;
    }
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts?.[0]) {
        setAddress(accounts[0]);
        loadWalletState(accounts[0]);
      }
      const c = await provider.request({ method: 'eth_chainId' });
      setChainId(Number(BigInt(c)));
    } catch (err: any) {
      alert(err.message || 'Failed to connect wallet');
    }
  };

  // Switch network
  const switchNetwork = async () => {
    const provider = getWalletProvider();
    if (!provider) return;
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] });
      setChainId(56);
    } catch (err: any) {
      if (err.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x38',
            chainName: 'BNB Smart Chain Mainnet',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com']
          }]
        });
        setChainId(56);
      }
    }
  };

  // Calculations
  const parsedAmount = parseFloat(inputAmount) || 0;
  const bnbPriceUSD = stats?.bnbPriceUSD || 687;
  const usdtPriceUSD = stats?.usdtPriceUSD || 1.0;
  const tokenPriceUSD = stats?.tokenPriceUSD || 0.0034;

  const usdValue = paymentMethod === 'BNB'
    ? parsedAmount * bnbPriceUSD
    : parsedAmount * usdtPriceUSD;

  const estimatedMAGES = tokenPriceUSD > 0 ? Math.floor(usdValue / tokenPriceUSD) : 0;
  const isBelowMinimum = usdValue > 0 && usdValue < (stats?.minPurchaseUSD || 10);
  const exceedsRemaining = estimatedMAGES > (stats?.remainingAllocation || 5250000);

  const saleProgressPercent = stats
    ? ((stats.tokensSold / stats.presaleAllocation) * 100)
    : 0;

  // Buy with BNB
  const handleBuyBNB = async () => {
    if (!address || chainId !== 56) { await switchNetwork(); return; }
    if (parsedAmount <= 0) { alert('Enter a valid BNB amount'); return; }
    if (isBelowMinimum) { alert(`Minimum purchase is $${stats?.minPurchaseUSD || 10}. Your amount is ~$${usdValue.toFixed(2)}.`); return; }
    if (!stats?.saleActive) { alert('Presale is not currently active.'); return; }
    if (exceedsRemaining) { alert('Purchase exceeds remaining presale allocation.'); return; }

    try {
      setTxState({ status: 'waiting_approval', txHash: null, error: null, magesReceived: null });

      // Calculate minMAGESOut with 2% slippage
      const minMAGESOut = BigInt(Math.floor(estimatedMAGES * 0.98)) * (10n ** 18n);
      const bnbWei = BigInt(Math.floor(parsedAmount * 1e18));

      const abi = parseAbi(['function buyWithBNB(uint256 minMAGESOut) external payable']);
      const calldata = encodeFunctionData({
        abi,
        functionName: 'buyWithBNB',
        args: [minMAGESOut]
      });

      setTxState({ status: 'submitted', txHash: null, error: null, magesReceived: null });

      const hash = await sendWalletContractTransaction({
        to: CONTRACT_ADDRESSES.PRESALE,
        data: calldata,
        value: '0x' + bnbWei.toString(16)
      });

      setTxState({ status: 'pending', txHash: hash, error: null, magesReceived: null });

      const receipt = await bscPublicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        confirmations: 1
      });

      if (receipt.status === 'success') {
        setTxState({ status: 'confirmed', txHash: hash, error: null, magesReceived: estimatedMAGES.toLocaleString() });
        if (address) await loadWalletState(address);
        await loadStats();
        setInputAmount('');
      } else {
        setTxState({ status: 'failed', txHash: hash, error: 'Transaction reverted on-chain.', magesReceived: null });
      }
    } catch (err: any) {
      setTxState({ status: 'failed', txHash: null, error: err?.shortMessage || err?.message || 'Transaction rejected.', magesReceived: null });
    }
  };

  // Buy with USDT (approval + purchase)
  const handleBuyUSDT = async () => {
    if (!address || chainId !== 56) { await switchNetwork(); return; }
    if (parsedAmount <= 0) { alert('Enter a valid USDT amount'); return; }
    if (isBelowMinimum) { alert(`Minimum purchase is $${stats?.minPurchaseUSD || 10}. Your amount is ~$${usdValue.toFixed(2)}.`); return; }
    if (!stats?.saleActive) { alert('Presale is not currently active.'); return; }
    if (exceedsRemaining) { alert('Purchase exceeds remaining presale allocation.'); return; }

    const usdtWei = BigInt(Math.floor(parsedAmount * 1e18));

    try {
      // Step 1: Check allowance and approve if needed
      if (walletState.rawUsdtAllowance < usdtWei) {
        setTxState({ status: 'approving', txHash: null, error: null, magesReceived: null });

        const approveAbi = parseAbi(['function approve(address spender, uint256 amount) returns (bool)']);
        const approveCalldata = encodeFunctionData({
          abi: approveAbi,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.PRESALE as `0x${string}`, usdtWei]
        });

        const approveHash = await sendWalletContractTransaction({
          to: CONTRACT_ADDRESSES.USDT,
          data: approveCalldata
        });

        await bscPublicClient.waitForTransactionReceipt({
          hash: approveHash as `0x${string}`,
          confirmations: 1
        });
      }

      // Step 2: Execute purchase
      setTxState({ status: 'waiting_approval', txHash: null, error: null, magesReceived: null });

      const minMAGESOut = BigInt(Math.floor(estimatedMAGES * 0.98)) * (10n ** 18n);

      const buyAbi = parseAbi(['function buyWithUSDT(uint256 usdtAmount, uint256 minMAGESOut) external']);
      const buyCalldata = encodeFunctionData({
        abi: buyAbi,
        functionName: 'buyWithUSDT',
        args: [usdtWei, minMAGESOut]
      });

      setTxState({ status: 'submitted', txHash: null, error: null, magesReceived: null });

      const hash = await sendWalletContractTransaction({
        to: CONTRACT_ADDRESSES.PRESALE,
        data: buyCalldata
      });

      setTxState({ status: 'pending', txHash: hash, error: null, magesReceived: null });

      const receipt = await bscPublicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        confirmations: 1
      });

      if (receipt.status === 'success') {
        setTxState({ status: 'confirmed', txHash: hash, error: null, magesReceived: estimatedMAGES.toLocaleString() });
        if (address) await loadWalletState(address);
        await loadStats();
        setInputAmount('');
      } else {
        setTxState({ status: 'failed', txHash: hash, error: 'Transaction reverted on-chain.', magesReceived: null });
      }
    } catch (err: any) {
      setTxState({ status: 'failed', txHash: null, error: err?.shortMessage || err?.message || 'Transaction rejected.', magesReceived: null });
    }
  };

  const canPurchase = stats?.saleActive && !stats?.isPaused && parsedAmount > 0 && !isBelowMinimum && !exceedsRemaining;

  return (
    <div className="min-h-screen bg-[#090514] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HERO */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            BNB Smart Chain Mainnet • Public Token Sale
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
            MAGES Public{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
              Presale
            </span>
          </h1>

          <div className="text-5xl sm:text-7xl font-black font-mono text-amber-400 mb-4 tracking-tight">
            $0.0034
            <span className="text-lg sm:text-xl text-gray-400 font-normal ml-3">per MAGES</span>
          </div>

          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Acquire MAGES tokens at the public presale price. Pay with <strong className="text-white">BNB</strong> or <strong className="text-white">USDT</strong>. Tokens delivered immediately upon purchase confirmation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link href="/mages" className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#160D27] border border-[#2E1B4E] text-gray-300 hover:text-white hover:border-[#7928CA] transition">
              ← MAGES Hub
            </Link>
            <Link href="/mages/airdrop" className="text-xs font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300 hover:text-white transition">
              NFT Holder Airdrop (1,000/NFT) →
            </Link>
          </div>
        </div>

        {/* NETWORK WARNING */}
        {address && chainId !== 56 && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="text-sm font-bold text-amber-300">Wrong Network</div>
                <div className="text-xs text-gray-300">Switch to BNB Smart Chain (Chain ID: 56) to purchase.</div>
              </div>
            </div>
            <button onClick={switchNetwork} className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition">
              Switch to BNB Chain
            </button>
          </div>
        )}

        {/* SALE STATUS + COUNTDOWN */}
        <div className="mb-10 p-6 sm:p-8 rounded-3xl bg-[#160D27] border-2 border-[#2E1B4E] shadow-xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-6">
            <div>
              <div className="text-xs uppercase font-bold text-gray-400 tracking-wider">Sale Status</div>
              <h3 className="text-xl font-bold text-white mt-1">
                {!stats ? 'Loading...' : stats.statusLabel}
              </h3>
            </div>

            {/* Countdown Timer */}
            {stats?.saleActive && (
              <div className="flex items-center gap-3">
                {[
                  { label: 'DAYS', value: countdown.days },
                  { label: 'HRS', value: countdown.hours },
                  { label: 'MIN', value: countdown.minutes },
                  { label: 'SEC', value: countdown.seconds }
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-[#090514] border border-[#2E1B4E] text-2xl font-black font-mono text-amber-400">
                      {String(value).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 font-bold">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-5 bg-[#090514] rounded-full overflow-hidden p-0.5 border border-[#2E1B4E] mb-3">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(1, Math.min(100, saleProgressPercent))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Sold: <strong className="text-amber-400">{(stats?.tokensSold || 0).toLocaleString()} MAGES</strong></span>
            <span>Remaining: <strong className="text-white">{(stats?.remainingAllocation || 5250000).toLocaleString()} MAGES</strong></span>
            <span>Allocation: <strong className="text-gray-300">{(stats?.presaleAllocation || 5250000).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase font-bold">Token Price</div>
            <div className="text-2xl font-black font-mono text-amber-400 mt-1">${tokenPriceUSD.toFixed(4)}</div>
            <div className="text-[11px] text-gray-500">Per MAGES Token</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase font-bold">BNB Price</div>
            <div className="text-2xl font-black font-mono text-white mt-1">${bnbPriceUSD.toFixed(2)}</div>
            <div className="text-[11px] text-gray-500">Chainlink Oracle (Live)</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase font-bold">Total BNB Raised</div>
            <div className="text-2xl font-black font-mono text-purple-300 mt-1">{stats?.totalBNBReceived || '0.0000'}</div>
            <div className="text-[11px] text-gray-500">BNB Received</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase font-bold">Total USDT Raised</div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">${stats?.totalUSDTReceived || '0.00'}</div>
            <div className="text-[11px] text-gray-500">USDT Received</div>
          </div>
        </div>

        {/* PURCHASE TERMINAL */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">

          {/* LEFT: Calculator */}
          <div className="lg:col-span-3 p-6 sm:p-8 rounded-3xl bg-[#160D27] border-2 border-[#2E1B4E] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="text-xs uppercase font-bold text-amber-400 tracking-wider mb-1">Purchase Calculator</div>
            <h3 className="text-xl font-black text-white mb-6">Buy MAGES Tokens</h3>

            {/* Payment Toggle */}
            <div className="flex rounded-xl bg-[#090514] p-1 border border-[#2E1B4E] mb-6">
              <button
                onClick={() => { setPaymentMethod('BNB'); setInputAmount(''); }}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${paymentMethod === 'BNB' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                BNB
              </button>
              <button
                onClick={() => { setPaymentMethod('USDT'); setInputAmount(''); }}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${paymentMethod === 'USDT' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                USDT
              </button>
            </div>

            {/* Input Amount */}
            <div className="mb-6">
              <label className="text-xs text-gray-400 uppercase font-bold mb-2 block">
                Investment Amount ({paymentMethod})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  placeholder={paymentMethod === 'BNB' ? '0.02' : '10.00'}
                  className="w-full p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] focus:border-amber-500 text-xl font-mono font-bold text-white placeholder-gray-600 outline-none transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">
                  {paymentMethod}
                </span>
              </div>
              {address && (
                <div className="text-xs text-gray-500 mt-2">
                  Available: <strong className="text-gray-300">
                    {paymentMethod === 'BNB' ? walletState.bnbBalance : walletState.usdtBalance} {paymentMethod}
                  </strong>
                </div>
              )}
            </div>

            {/* Calculator Output */}
            <div className="space-y-3 p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Investment Amount</span>
                <span className="text-white font-mono">{parsedAmount.toFixed(paymentMethod === 'BNB' ? 4 : 2)} {paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Estimated USD Value</span>
                <span className="text-white font-mono">${usdValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Oracle Price ({paymentMethod}/USD)</span>
                <span className="text-white font-mono">${paymentMethod === 'BNB' ? bnbPriceUSD.toFixed(2) : usdtPriceUSD.toFixed(6)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Token Price</span>
                <span className="text-amber-400 font-mono">${tokenPriceUSD.toFixed(4)} / MAGES</span>
              </div>
              <div className="border-t border-[#2E1B4E] pt-3 flex justify-between text-lg">
                <span className="text-gray-300 font-bold">MAGES Received</span>
                <span className="text-amber-400 font-black font-mono">{estimatedMAGES.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Min Output (2% slippage)</span>
                <span className="text-gray-400 font-mono">{Math.floor(estimatedMAGES * 0.98).toLocaleString()} MAGES</span>
              </div>
            </div>

            {/* Validation Warnings */}
            {isBelowMinimum && parsedAmount > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                ⚠ Minimum purchase is ${stats?.minPurchaseUSD || 10}. Your amount is ~${usdValue.toFixed(2)}.
              </div>
            )}
            {exceedsRemaining && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                ⚠ Purchase exceeds remaining presale allocation ({(stats?.remainingAllocation || 0).toLocaleString()} MAGES).
              </div>
            )}

            {/* USDT Approval Info */}
            {paymentMethod === 'USDT' && address && parsedAmount > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-[#160D27] border border-[#2E1B4E] text-xs text-gray-400">
                USDT Allowance: <strong className="text-white">{walletState.usdtAllowance}</strong>
                {walletState.rawUsdtAllowance < BigInt(Math.floor(parsedAmount * 1e18)) && (
                  <span className="text-amber-400 ml-2">→ Approval required before purchase</span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {!address ? (
              <button
                onClick={connectWallet}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-[#7928CA] to-[#9333EA] text-white hover:from-[#8B2BE2] hover:to-[#A855F7] shadow-[0_0_25px_rgba(121,40,202,0.4)] transition"
              >
                Connect Wallet to Purchase
              </button>
            ) : !stats?.saleActive && !stats?.saleStarted ? (
              <button disabled className="w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider bg-gray-700 text-gray-400 cursor-not-allowed">
                Presale Not Yet Started
              </button>
            ) : stats?.saleEnded ? (
              <button disabled className="w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider bg-gray-700 text-gray-400 cursor-not-allowed">
                Presale Has Ended
              </button>
            ) : stats?.isPaused ? (
              <button disabled className="w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider bg-gray-700 text-gray-400 cursor-not-allowed">
                Presale Temporarily Paused
              </button>
            ) : (stats?.remainingAllocation || 0) <= 0 ? (
              <button disabled className="w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider bg-gray-700 text-gray-400 cursor-not-allowed">
                SOLD OUT — Presale Allocation Exhausted
              </button>
            ) : (
              <button
                onClick={paymentMethod === 'BNB' ? handleBuyBNB : handleBuyUSDT}
                disabled={!canPurchase || txState.status === 'pending' || txState.status === 'waiting_approval' || txState.status === 'approving'}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {txState.status === 'approving' ? 'Approving USDT...' :
                 txState.status === 'waiting_approval' ? 'Approve in Wallet...' :
                 txState.status === 'pending' ? 'Confirming on BSC...' :
                 `BUY ${estimatedMAGES.toLocaleString()} MAGES WITH ${paymentMethod}`}
              </button>
            )}

            {/* Transaction Feedback */}
            {txState.status !== 'idle' && (
              <div className="mt-6 p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] space-y-2">
                <div className="flex items-center gap-2">
                  {txState.status === 'confirmed' && <span className="text-emerald-400 font-bold">✓ Purchase Confirmed — {txState.magesReceived} MAGES received!</span>}
                  {txState.status === 'pending' && <span className="text-amber-400 font-bold animate-pulse">⏳ Transaction Pending on BSC...</span>}
                  {txState.status === 'waiting_approval' && <span className="text-blue-400 font-bold animate-pulse">🦊 Awaiting Wallet Signature</span>}
                  {txState.status === 'approving' && <span className="text-blue-400 font-bold animate-pulse">🔑 Approving USDT Allowance...</span>}
                  {txState.status === 'submitted' && <span className="text-amber-400 font-bold animate-pulse">📡 Transaction Submitted</span>}
                  {txState.status === 'failed' && <span className="text-red-400 font-bold">✕ Transaction Failed</span>}
                </div>
                {txState.txHash && (
                  <a href={`https://bscscan.com/tx/${txState.txHash}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:underline font-mono break-all block">
                    View on BscScan: {formatAddress(txState.txHash)} ↗
                  </a>
                )}
                {txState.error && <div className="text-xs text-red-400">{txState.error}</div>}
              </div>
            )}
          </div>

          {/* RIGHT: Wallet & Info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Wallet Balance */}
            <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
              <div className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-3">Your Wallet</div>
              {address ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Address</span>
                    <span className="text-white font-mono">{formatAddress(address)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">BNB Balance</span>
                    <span className="text-white font-mono">{walletState.bnbBalance} BNB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">USDT Balance</span>
                    <span className="text-white font-mono">${walletState.usdtBalance}</span>
                  </div>
                  <div className="border-t border-[#2E1B4E] pt-3 flex justify-between text-sm">
                    <span className="text-amber-400 font-bold">MAGES Balance</span>
                    <span className="text-amber-400 font-black font-mono">{walletState.magesBalance}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 py-4">
                  Connect wallet to view balances
                </div>
              )}
            </div>

            {/* Presale Terms */}
            <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E] space-y-3">
              <div className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2">Presale Terms</div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Token Price</span><span className="text-white">${tokenPriceUSD.toFixed(4)} / MAGES</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Minimum Purchase</span><span className="text-white">${stats?.minPurchaseUSD || 10}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Sale Duration</span><span className="text-white">30 Days</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Token Delivery</span><span className="text-emerald-400 font-bold">Immediate</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Payment Methods</span><span className="text-white">BNB, USDT</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Allocation</span><span className="text-white">5,250,000 MAGES</span></div>
            </div>

            {/* Contract Info */}
            <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E] text-xs space-y-2">
              <div className="text-gray-400 uppercase font-bold tracking-wider text-[10px]">Verified Contracts</div>
              <div className="flex justify-between">
                <span className="text-gray-400">Presale:</span>
                <a href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.PRESALE}`} target="_blank" rel="noopener noreferrer" className="text-amber-400 font-mono hover:underline">
                  {formatAddress(CONTRACT_ADDRESSES.PRESALE)} ↗
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">MAGES:</span>
                <a href={`https://bscscan.com/token/${CONTRACT_ADDRESSES.TOKEN}`} target="_blank" rel="noopener noreferrer" className="text-amber-400 font-mono hover:underline">
                  {formatAddress(CONTRACT_ADDRESSES.TOKEN)} ↗
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">BNB Oracle:</span>
                <a href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.CHAINLINK_BNB_USD}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 font-mono hover:underline">
                  {formatAddress(CONTRACT_ADDRESSES.CHAINLINK_BNB_USD)} ↗
                </a>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

