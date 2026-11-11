'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  const stats = [
    { label: 'Total NFT Supply', value: '5,000', sub: 'Strictly Capped' },
    { label: 'Free Agentic Allocation', value: '2,500', sub: 'Verified Binance Wallets' },
    { label: 'Paid Mint Allocation', value: '2,500', sub: '0.001 BNB per NFT' },
    { label: 'MAGES Total Supply', value: '21,000,000', sub: 'Fixed 0% Inflation' },
    { label: 'Presale Target', value: '$20,000', sub: 'Unlocks Post-Sellout' },
  ];

  const wizardPreviews = [
    { id: 1, name: 'WeZards #0001', tier: 'Legendary', trait: 'Star Archmage', bg: '#DDE4DC' },
    { id: 2, name: 'WeZards #0002', tier: 'Epic', trait: 'Crescent Scythe', bg: '#DDDDDD' },
    { id: 3, name: 'WeZards #0003', tier: 'Rare', trait: 'Frost Sorcery', bg: '#EDE6DA' },
    { id: 4, name: 'WeZards #0004', tier: 'Uncommon', trait: 'Celestial Orb', bg: '#DCE2E8' },
  ];

  return (
    <div className="min-h-screen bg-[#090514] text-white">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        {/* Background Radial Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#7928CA]/30 via-[#9333EA]/20 to-[#F59E0B]/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            
            {/* Network Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#160D27] border border-[#2E1B4E] text-sm text-[#F59E0B] mb-8 shadow-inner animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
              <span className="font-semibold tracking-wide">Live on BNB Smart Chain</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-300 font-mono text-xs">5,000 Mages Collection</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              The Next Evolution of{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#F59E0B] via-[#C084FC] to-[#9333EA]">
                Magical Web3
              </span>{' '}
              on BSC
            </h1>

            <p className="text-lg sm:text-xl text-[#9CA3AF] mb-10 leading-relaxed max-w-2xl mx-auto">
              WeZards is a premier Web3 ecosystem uniting 5,000 iconic retro 8-bit wizard NFTs, fixed-supply 21M MAGES tokenomics, verifiable random rewards, and a transparent presale protocol.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/mint"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:from-[#8B2BE2] hover:to-[#A855F7] shadow-[0_0_25px_rgba(121,40,202,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Mint NFT (Free & Paid)
              </Link>
              <Link
                href="/presale"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-gray-200 bg-[#160D27] border border-[#2E1B4E] hover:border-[#7928CA] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <span>MAGES Presale</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-[#F59E0B] border border-amber-500/30 font-semibold">
                  After Sellout
                </span>
              </Link>
            </div>

          </div>

          {/* 2. STATS BAR */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map((s, idx) => (
              <div
                key={idx}
                className="bg-[#160D27]/80 backdrop-blur-md border border-[#2E1B4E] rounded-2xl p-5 text-center transition-all hover:border-[#7928CA]/60 hover:shadow-[0_0_20px_rgba(121,40,202,0.2)]"
              >
                <div className="text-2xl sm:text-3xl font-extrabold text-white mb-1 tracking-tight font-mono">
                  {s.value}
                </div>
                <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  {s.label}
                </div>
                <div className="text-[11px] text-[#F59E0B]">
                  {s.sub}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 3. NFT COLLECTION PREVIEW */}
      <section className="py-20 border-t border-[#2E1B4E]/60 bg-[#0C061A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#F59E0B] font-bold">Iconic 8-Bit Pixel Art</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                The Magical Mages Collection
              </h2>
            </div>
            <Link
              href="/collection"
              className="mt-4 md:mt-0 inline-flex items-center gap-2 text-sm font-semibold text-[#C084FC] hover:text-white transition"
            >
              <span>Explore All 5,000 Wizards</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wizardPreviews.map((wiz) => (
              <div
                key={wiz.id}
                className="group bg-[#160D27] border border-[#2E1B4E] rounded-2xl overflow-hidden hover:border-[#7928CA] transition-all hover:shadow-[0_12px_24px_-10px_rgba(121,40,202,0.4)]"
              >
                <div
                  className="w-full aspect-square relative flex items-center justify-center p-6 border-b border-[#2E1B4E]"
                  style={{ backgroundColor: wiz.bg }}
                >
                  <img
                    src={`https://assets.bunink.xyz/images/${wiz.id}.png`}
                    alt={wiz.name}
                    className="w-full h-full object-contain pixelated group-hover:scale-105 transition-transform duration-300"
                    style={{ imageRendering: 'pixelated' }}
                    onError={(e: any) => {
                      // Fallback illustration if local image path differs
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      wiz.tier === 'Legendary' ? 'bg-amber-500 text-black font-extrabold' :
                      wiz.tier === 'Epic' ? 'bg-purple-600 text-white' :
                      wiz.tier === 'Rare' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      {wiz.tier}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="font-bold text-white text-base mb-1">{wiz.name}</div>
                  <div className="text-xs text-gray-400 flex justify-between items-center">
                    <span>Feature: {wiz.trait}</span>
                    <span className="font-mono text-[#F59E0B]">0.001 BNB</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. PRESALE SPOTLIGHT BANNER */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-[#090514] via-[#120822] to-[#090514]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#160D27] via-[#24133D] to-[#160D27] border-2 border-[#F59E0B]/40 shadow-[0_0_50px_rgba(245,158,11,0.15)] text-center relative">
            
            <div className="inline-block px-3 py-1 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold text-xs uppercase tracking-widest border border-[#F59E0B]/40 mb-4">
              Upcoming Token Event
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
              MAGES Presale — Coming After NFT Sellout
            </h2>

            <p className="text-[#9CA3AF] text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
              To guarantee true community distribution and prevent artificial manipulation, the 5,250,000 MAGES presale will activate strictly after all 5,000 WeZards NFTs have minted out.
            </p>

            {/* Presale Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8 text-left">
              <div className="bg-[#090514]/70 p-3.5 rounded-xl border border-[#2E1B4E]">
                <div className="text-[11px] text-gray-400 uppercase">Target Raise</div>
                <div className="text-lg font-bold text-white font-mono">$20,000 USD</div>
              </div>
              <div className="bg-[#090514]/70 p-3.5 rounded-xl border border-[#2E1B4E]">
                <div className="text-[11px] text-gray-400 uppercase">Min Purchase</div>
                <div className="text-lg font-bold text-white font-mono">$50 USD</div>
              </div>
              <div className="bg-[#090514]/70 p-3.5 rounded-xl border border-[#2E1B4E]">
                <div className="text-[11px] text-gray-400 uppercase">Max Wallet</div>
                <div className="text-lg font-bold text-white font-mono">1 BNB</div>
              </div>
              <div className="bg-[#090514]/70 p-3.5 rounded-xl border border-[#2E1B4E]">
                <div className="text-[11px] text-gray-400 uppercase">Token Price</div>
                <div className="text-lg font-bold text-[#F59E0B] font-mono">~$0.0038</div>
              </div>
            </div>

            <Link
              href="/presale"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-black bg-[#F59E0B] hover:bg-[#FBBF24] transition shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            >
              <span>View Presale Rules & Terms</span>
              <span>→</span>
            </Link>

          </div>
        </div>
      </section>

      {/* 5. MAGES TOKENOMICS OVERVIEW */}
      <section className="py-20 border-t border-[#2E1B4E]/60 bg-[#090514]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-[#F59E0B] font-bold">Fixed Supply Tokenomics</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 mb-4">
              21,000,000 MAGES Fixed Cap
            </h2>
            <p className="text-sm text-gray-400">
              No additional minting permitted. Mathematical scarcity inspired by Bitcoin, built for BNB Smart Chain governance and rewards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
              <div className="text-2xl font-bold text-[#F59E0B] font-mono mb-1">40%</div>
              <div className="text-base font-bold text-white mb-2">Treasury & Ecosystem</div>
              <div className="text-xs text-gray-400 mb-2">8,400,000 MAGES</div>
              <p className="text-xs text-gray-500">Fund for staking, paid-NFT random rewards (300-700 MAGES), and continuous ecosystem growth.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
              <div className="text-2xl font-bold text-[#9333EA] font-mono mb-1">25%</div>
              <div className="text-base font-bold text-white mb-2">Public Presale</div>
              <div className="text-xs text-gray-400 mb-2">5,250,000 MAGES</div>
              <p className="text-xs text-gray-500">Fixed $20,000 target raise with pro-rata oversubscription settlement and refundable excess BNB.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
              <div className="text-2xl font-bold text-blue-400 font-mono mb-1">20%</div>
              <div className="text-base font-bold text-white mb-2">NFT Holder Snapshot</div>
              <div className="text-xs text-gray-400 mb-2">4,200,000 MAGES</div>
              <p className="text-xs text-gray-500">Rarity-weighted snapshot airdrop: 50% unlocked at TGE, 50% vested one month later.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
              <div className="text-2xl font-bold text-emerald-400 font-mono mb-1">15%</div>
              <div className="text-base font-bold text-white mb-2">Team Allocation</div>
              <div className="text-xs text-gray-400 mb-2">3,150,000 MAGES</div>
              <p className="text-xs text-gray-500">Long-term team and development alignment subject to transparent on-chain vesting.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section className="py-20 border-t border-[#2E1B4E]/60 bg-[#0C061A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-widest text-[#F59E0B] font-bold">Knowledge Base</span>
            <h2 className="text-3xl font-extrabold text-white mt-1">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-[#160D27] border border-[#2E1B4E]">
              <h3 className="text-base font-bold text-white mb-2">How do I claim a Free Agentic NFT?</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Connect using a supported Binance Agentic Wallet. Our server verifies your wallet eligibility cryptographically. Once verified, you can claim 1 free WeZards NFT (plus gas on BSC). Only 2,500 total free NFTs exist.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#160D27] border border-[#2E1B4E]">
              <h3 className="text-base font-bold text-white mb-2">When does the MAGES Presale start?</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                The presale will activate only after all 5,000 WeZards NFTs have completely minted out. This ensures an organic holder base before token distribution begins.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#160D27] border border-[#2E1B4E]">
              <h3 className="text-base font-bold text-white mb-2">What is the Paid NFT Random MAGES Reward?</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Every qualifying paid-minted NFT (0.001 BNB) has its provenance recorded on-chain. Each paid NFT is eligible to claim a one-time random reward of 300 to 700 MAGES tokens, funded from the Treasury pool.
              </p>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
