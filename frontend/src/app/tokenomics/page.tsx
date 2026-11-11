'use client';

import React from 'react';
import { CONTRACT_ADDRESSES } from '../../lib/web3';

export default function TokenomicsPage() {
  const tokenAllocations = [
    {
      category: 'Treasury & Ecosystem Reserve',
      percentage: 40,
      amount: '8,400,000',
      color: '#F59E0B',
      description: 'Dedicated to community incentives, protocol liquidity, platform development, and the 300-700 MAGES random rewards for paid-mint NFT holders.'
    },
    {
      category: 'Public Presale',
      percentage: 25,
      amount: '5,250,000',
      color: '#9333EA',
      description: 'Capped at $20,000 USD raise with pro-rata oversubscription settlement. Strictly unlocks only after the 5,000 NFT collection sells out.'
    },
    {
      category: 'NFT Holder Snapshot Airdrop',
      percentage: 20,
      amount: '4,200,000',
      color: '#3B82F6',
      description: 'Rarity-weighted snapshot for WeZards NFT holders. 50% claimable at Token Generation Event (TGE), remaining 50% vested one month later.'
    },
    {
      category: 'Team & Contributors',
      percentage: 15,
      amount: '3,150,000',
      color: '#10B981',
      description: 'Reserved for founding engineers, smart contract auditors, and core contributors with transparent on-chain vesting schedules.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#090514] text-white py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-[#7928CA]/20 text-[#F59E0B] text-xs font-bold tracking-widest uppercase mb-3 border border-[#7928CA]/40">
            Fixed Supply Architecture
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            MAGES Tokenomics
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            MAGES is the native utility, staking, and governance token of the WeZards ecosystem on BNB Smart Chain. Strictly hard-capped at 21,000,000 tokens with zero continuous or hidden minting functions.
          </p>
        </div>

        {/* Core Specs Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Token Name</div>
            <div className="text-xl font-bold text-white mt-1">MAGES ($MAGES)</div>
            <div className="text-[10px] text-gray-500">BEP-20 Standard</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Total Supply</div>
            <div className="text-xl font-bold font-mono text-[#F59E0B] mt-1">21,000,000</div>
            <div className="text-[10px] text-emerald-400">Strictly Fixed Cap</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Additional Minting</div>
            <div className="text-xl font-bold text-red-400 mt-1">Not Permitted</div>
            <div className="text-[10px] text-gray-500">0% Inflation Guaranteed</div>
          </div>
          <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Blockchain Network</div>
            <div className="text-xl font-bold text-white mt-1">BNB Smart Chain</div>
            <div className="text-[10px] text-gray-400">Decimals: 18</div>
          </div>
        </div>

        {/* Visual Tokenomics Distribution Bar */}
        <div className="mb-12 p-6 rounded-3xl bg-[#160D27] border border-[#2E1B4E]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">
            Token Supply Allocation Breakdown
          </h3>
          
          {/* Multi-segment Progress Bar */}
          <div className="h-6 w-full rounded-xl overflow-hidden flex mb-4 border border-[#2E1B4E]">
            <div style={{ width: '40%', backgroundColor: '#F59E0B' }} title="Treasury (40%)" />
            <div style={{ width: '25%', backgroundColor: '#9333EA' }} title="Presale (25%)" />
            <div style={{ width: '20%', backgroundColor: '#3B82F6' }} title="Airdrop (20%)" />
            <div style={{ width: '15%', backgroundColor: '#10B981' }} title="Team (15%)" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B]"></span>
              <span className="text-gray-300">Treasury (40%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#9333EA]"></span>
              <span className="text-gray-300">Presale (25%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#3B82F6]"></span>
              <span className="text-gray-300">Holder Airdrop (20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#10B981]"></span>
              <span className="text-gray-300">Team (15%)</span>
            </div>
          </div>
        </div>

        {/* Allocation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {tokenAllocations.map((alloc, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E] hover:border-[#7928CA]/60 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-lg font-bold text-white">{alloc.category}</h4>
                  <div className="text-sm font-mono font-bold mt-0.5" style={{ color: alloc.color }}>
                    {alloc.amount} MAGES
                  </div>
                </div>
                <div
                  className="text-xl font-black font-mono px-3 py-1 rounded-xl bg-[#090514] border border-[#2E1B4E]"
                  style={{ color: alloc.color }}
                >
                  {alloc.percentage}%
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {alloc.description}
              </p>
            </div>
          ))}
        </div>

        {/* Security Disclosures */}
        <div className="p-6 rounded-2xl bg-[#0E071A] border border-[#2E1B4E]">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-2">
            Transparent On-Chain Accounting
          </h4>
          <p className="text-xs text-gray-400 leading-relaxed mb-3">
            In accordance with best security practices, all initial allocations are minted to verified smart contracts or multi-sig treasury at deployment. The smart contract includes an emergency pause restricted to the two-step owner (<code className="text-gray-300">Ownable2Step</code>) and burn mechanisms. Fictional circulating supply, simulated DEX prices, and unverified listings are never displayed.
          </p>
          <div className="text-xs font-mono text-gray-300">
            Verified MAGES Token Address:{' '}
            <a
              href={`https://bscscan.com/token/${CONTRACT_ADDRESSES.TOKEN}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F59E0B] hover:text-amber-300 underline font-bold transition"
            >
              {CONTRACT_ADDRESSES.TOKEN} ↗
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
