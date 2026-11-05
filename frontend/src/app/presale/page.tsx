'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchOnChainMintStats } from '../../lib/web3';

export default function PresalePage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [bnbPriceUSD, setBnbPriceUSD] = useState<number>(600.0);
  const [contributionBNB, setContributionBNB] = useState<string>('0.2');
  const [isPresaleActive, setIsPresaleActive] = useState<boolean>(false);
  const [nftMintedCount, setNftMintedCount] = useState<number>(0); // Real on-chain data
  const nftMaxSupply = 5000;

  // Presale Terms
  const targetRaiseUSD = 20000;
  const tokenAllocation = 5250000; // 25% of 21,000,000
  const tokenPriceUSD = 0.00380952381;
  const minPurchaseUSD = 50;
  const maxWalletBNB = 1.0;
  const binanceDepositAddress = '0x9999999999999999999999999999999999999999';

  useEffect(() => {
    async function loadStatus() {
      try {
        const stats = await fetchOnChainMintStats();
        setNftMintedCount(stats.totalMinted);
      } catch (err) {
        console.error('Failed to load on-chain presale status', err);
      }
    }
    loadStatus();
  }, []);

  const parsedBNB = parseFloat(contributionBNB) || 0;
  const calculatedUSD = parsedBNB * bnbPriceUSD;
  const estimatedMAGES = calculatedUSD > 0 ? Math.floor(calculatedUSD / tokenPriceUSD) : 0;
  const isBelowMin = calculatedUSD < minPurchaseUSD;
  const isAboveMax = parsedBNB > maxWalletBNB;

  const nftSelloutPercent = ((nftMintedCount / nftMaxSupply) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-[#090514] text-white py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner Headline */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Presale Activation Requirement
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
            MAGES Presale —{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#F59E0B] via-[#EAB308] to-[#FBBF24]">
              Coming After NFT Sellout
            </span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            The MAGES presale contract is deployed on BNB Smart Chain and locked by design. Contributions will only open once the 5,000 WeZards NFT collection has completely sold out.
          </p>
        </div>

        {/* 1. NFT SELLOUT PROGRESS TRACKER */}
        <div className="mb-10 p-6 sm:p-8 rounded-3xl bg-[#160D27] border-2 border-[#2E1B4E] shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-xs uppercase font-bold text-gray-400 tracking-wider">Prerequisite Condition</div>
              <h3 className="text-lg font-bold text-white mt-0.5">NFT Collection Sellout Progress</h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-[#F59E0B]">{nftMintedCount.toLocaleString()}</span>
              <span className="text-sm font-mono text-gray-400"> / {nftMaxSupply.toLocaleString()} MINTED</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-4 bg-[#090514] rounded-full overflow-hidden p-0.5 border border-[#2E1B4E] mb-3">
            <div
              className="h-full bg-gradient-to-r from-[#7928CA] via-[#9333EA] to-[#F59E0B] rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, (nftMintedCount / nftMaxSupply) * 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Current Status: <strong className="text-amber-400">Minting in Progress ({nftSelloutPercent}%)</strong></span>
            <span>Target to Unlock Presale: <strong className="text-white">5,000 / 5,000 NFTs</strong></span>
          </div>
        </div>

        {/* 2. OFFICIAL PRESALE TERMS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Presale Allocation</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">5,250,000</div>
            <div className="text-[11px] text-purple-400">25% of Total Supply</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Fundraising Target</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">$20,000</div>
            <div className="text-[11px] text-gray-400">Hard Target Cap (USD)</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Token Price</div>
            <div className="text-2xl font-bold font-mono text-[#F59E0B] mt-1">~$0.00381</div>
            <div className="text-[11px] text-gray-400">Fixed Rate per MAGES</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Max Contribution</div>
            <div className="text-2xl font-bold font-mono text-blue-400 mt-1">1 BNB</div>
            <div className="text-[11px] text-gray-400">Per Eligible Wallet</div>
          </div>
        </div>

        {/* 3. PRESALE PURCHASE INTERFACE (COMING SOON / DISABLED) */}
        <div className="bg-[#160D27] border-2 border-dashed border-[#2E1B4E] rounded-3xl p-6 sm:p-10 mb-10 relative overflow-hidden">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[#2E1B4E] mb-6 gap-4">
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[#F59E0B] text-xs font-bold uppercase mb-1">
                Presale Status: Coming Soon
              </div>
              <h3 className="text-2xl font-bold text-white">Contribution Interface Preview</h3>
            </div>
            <div className="text-right text-xs font-mono text-gray-400 bg-[#090514] px-3 py-2 rounded-xl border border-[#2E1B4E]">
              <div>Chainlink Price: <strong className="text-white">${bnbPriceUSD.toFixed(2)} / BNB</strong></div>
              <div className="text-emerald-400 text-[10px]">Oracle Feed: Verified BSC Mainnet</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            
            {/* Input Controls (Disabled before activation) */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Contribution Amount (in BNB)
              </label>
              <div className="relative mb-2">
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="1.0"
                  disabled={!isPresaleActive}
                  value={contributionBNB}
                  onChange={(e) => setContributionBNB(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#090514] border border-[#2E1B4E] text-white font-mono text-lg focus:outline-none focus:border-[#7928CA] disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <span className="absolute right-4 top-3.5 text-sm font-bold text-gray-400">BNB</span>
              </div>

              <div className="flex justify-between text-xs text-gray-400 px-1">
                <span>Min: $50 USD ({(minPurchaseUSD / bnbPriceUSD).toFixed(3)} BNB)</span>
                <span>Max: 1.0 BNB</span>
              </div>

              {isBelowMin && (
                <div className="text-xs text-amber-400 mt-2 font-medium">
                  ⚠️ Minimum purchase requirement is $50 USD.
                </div>
              )}
              {isAboveMax && (
                <div className="text-xs text-red-400 mt-2 font-medium">
                  ⚠️ Maximum contribution per wallet cannot exceed 1 BNB.
                </div>
              )}
            </div>

            {/* Live Calculation Preview */}
            <div className="p-5 rounded-2xl bg-[#090514] border border-[#2E1B4E] space-y-2.5 text-xs font-mono">
              <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 font-sans">
                Estimated Allocation
              </div>
              <div className="flex justify-between text-gray-400">
                <span>USD Equivalent:</span>
                <span className="text-white">${calculatedUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Estimated MAGES:</span>
                <span className="text-[#F59E0B] font-bold">{estimatedMAGES.toLocaleString()} MAGES</span>
              </div>
              <div className="flex justify-between text-gray-400 pt-2 border-t border-[#2E1B4E]">
                <span>Oversubscription Rule:</span>
                <span className="text-purple-300">Pro-rata allocation + excess BNB refund</span>
              </div>
            </div>

          </div>

          {/* Action Button (Strictly Disabled) */}
          <button
            disabled
            className="w-full py-4 rounded-xl font-bold text-base text-gray-400 bg-[#24133D]/60 border border-[#2E1B4E] cursor-not-allowed text-center"
          >
            Presale Locked — Awaiting NFT Sellout ({nftMintedCount} / {nftMaxSupply} Minted)
          </button>

          <p className="text-[11px] text-gray-500 text-center mt-3">
            Contributions are strictly rejected on-chain by the smart contract until activated by the admin post-sellout.
          </p>

        </div>

        {/* 4. SECURITY & SETTLEMENT SPECIFICATIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-[#F59E0B]">⚖️</span>
              Pro-Rata Settlement & Refunds
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              If the presale receives more than $20,000, smart contract math applies a strict pro-rata allocation. Users claim their allocated MAGES tokens at TGE, and their excess unused BNB is 100% refundable directly from the contract.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-purple-400">🛡️</span>
              Binance Deposit Account Accounting
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Accepted net presale proceeds are withdrawable only to the verified project Binance deposit address (<code className="text-gray-300 font-mono text-[10px]">0x9999...9999</code>) after finalization. User refund liabilities are locked in contract and cannot be drained.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}

