'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchStats } from '../lib/api';

export default function HomePage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats().then(setStats);
  }, []);

  return (
    <div className="space-y-24 pb-24">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32">
        <div className="absolute inset-0 bg-arcane-glow pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-mage-purple/20 border border-mage-purple/40 text-purple-300 text-xs font-semibold mb-6 animate-pulse">
            <span>✨</span>
            <span>BNB Smart Chain Genesis Collection</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span className="text-amber-300">Free Mint for Binance Agentic Wallets</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            Unleash the Arcane Power of{' '}
            <span className="bg-gradient-to-r from-amber-300 via-purple-300 to-amber-200 bg-clip-text text-transparent">
              WeZards
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            A premier fantasy Web3 ecosystem powered by AI generation, fixed-supply governance, a non-custodial marketplace, and a $1,000 community reward campaign.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/mint"
              className="px-8 py-3.5 rounded-xl font-bold text-base bg-gradient-to-r from-amber-400 via-purple-500 to-amber-400 text-white shadow-xl shadow-mage-purple/30 hover:scale-105 transition-all"
            >
              Mint Your Mage ⚡
            </Link>
            <Link
              href="/explore"
              className="px-8 py-3.5 rounded-xl font-bold text-base bg-mage-card border border-mage-border text-gray-200 hover:text-white hover:border-mage-glow hover:bg-mage-card/80 transition-all"
            >
              Explore Collection 🔍
            </Link>
            <Link
              href="/rewards"
              className="px-8 py-3.5 rounded-xl font-bold text-base bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              $1,000 Reward Campaign 🎁
            </Link>
          </div>
        </div>
      </section>

      {/* 2. LIVE METRICS & STATS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-mage-card border border-mage-border rounded-2xl p-6 text-center hover:border-mage-purple/60 transition-colors shadow-lg">
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-amber-300 to-amber-100 bg-clip-text text-transparent">
              {stats ? `${stats.totalMinted} / ${stats.totalSupplyCap}` : '5,000'}
            </div>
            <div className="text-sm font-semibold text-gray-400 mt-2">NFT Hard Cap</div>
            <div className="text-xs text-purple-400 mt-1">Strictly Enforced On-Chain</div>
          </div>

          <div className="bg-mage-card border border-mage-border rounded-2xl p-6 text-center hover:border-mage-purple/60 transition-colors shadow-lg">
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent">
              21,000,000
            </div>
            <div className="text-sm font-semibold text-gray-400 mt-2">$WEZ Total Supply</div>
            <div className="text-xs text-amber-400 mt-1">Fixed Supply Cap (ERC-20)</div>
          </div>

          <div className="bg-mage-card border border-mage-border rounded-2xl p-6 text-center hover:border-mage-purple/60 transition-colors shadow-lg">
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-300 to-emerald-100 bg-clip-text text-transparent">
              $1,000
            </div>
            <div className="text-sm font-semibold text-gray-400 mt-2">BNB Community Pool</div>
            <div className="text-xs text-emerald-400 mt-1">1,000 Random Winners ($1 each)</div>
          </div>

          <div className="bg-mage-card border border-mage-border rounded-2xl p-6 text-center hover:border-mage-purple/60 transition-colors shadow-lg">
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-amber-300 to-purple-300 bg-clip-text text-transparent">
              0.001 BNB
            </div>
            <div className="text-sm font-semibold text-gray-400 mt-2">Public Mint Price</div>
            <div className="text-xs text-purple-400 mt-1">Free for Agentic Wallets</div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED MAGES PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-extrabold text-white">Magical Mages Showcase</h2>
            <p className="text-gray-400 mt-1">3D Cartoon + Anime + Luxury Wizard Collectibles</p>
          </div>
          <Link href="/explore" className="text-amber-300 hover:text-amber-200 font-semibold text-sm mt-4 sm:mt-0">
            View All 5,000 Mages →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { id: 1, name: 'WeZards #0001', tier: 'Legendary', score: 98.4, bg: 'from-amber-600/30 to-purple-900/40' },
            { id: 42, name: 'WeZards #0042', tier: 'Epic', score: 86.2, bg: 'from-purple-600/30 to-blue-900/40' },
            { id: 108, name: 'WeZards #0108', tier: 'Rare', score: 72.8, bg: 'from-blue-600/30 to-indigo-900/40' },
            { id: 250, name: 'WeZards #0250', tier: 'Uncommon', score: 58.5, bg: 'from-emerald-600/30 to-teal-900/40' },
          ].map((mage) => (
            <div key={mage.id} className="bg-mage-card border border-mage-border rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform shadow-xl">
              <div className={`aspect-square bg-gradient-to-tr ${mage.bg} flex items-center justify-center p-8 relative`}>
                <span className="text-7xl filter drop-shadow-[0_10px_20px_rgba(245,158,11,0.4)]">🧙‍♂️</span>
                <span className={`absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                  mage.tier === 'Legendary' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50' :
                  mage.tier === 'Epic' ? 'bg-purple-600 text-white' :
                  mage.tier === 'Rare' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {mage.tier}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-white">{mage.name}</h3>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                  <span>Rarity Score: <strong className="text-amber-300">{mage.score}</strong></span>
                  <span>10 Visual Layers</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. FOUR PILLARS OF WEZARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-white">Engineered for Web3 Excellence</h2>
          <p className="text-gray-400 mt-2">A fully integrated modular ecosystem on BNB Smart Chain</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-mage-card border border-mage-border rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-2xl">
              🎨
            </div>
            <h3 className="font-bold text-lg text-white">AI Art Generator</h3>
            <p className="text-sm text-gray-400">
              10 layers of visual traits composed deterministically with zero duplicates, weighted rarity scores, and IPFS metadata packaging.
            </p>
          </div>

          <div className="bg-mage-card border border-mage-border rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-2xl">
              🪙
            </div>
            <h3 className="font-bold text-lg text-white">$WEZ Tokenomics</h3>
            <p className="text-sm text-gray-400">
              Strictly fixed 21,000,000 total supply. No hidden mint functions, pausable emergency controls, and 2-step ownership security.
            </p>
          </div>

          <div className="bg-mage-card border border-mage-border rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-2xl">
              🤖
            </div>
            <h3 className="font-bold text-lg text-white">Binance Agentic Wallet</h3>
            <p className="text-sm text-gray-400">
              Native integration supporting Binance Agentic Wallet verification with cryptographic signature validation for 250 free mints.
            </p>
          </div>

          <div className="bg-mage-card border border-mage-border rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-2xl">
              🏆
            </div>
            <h3 className="font-bold text-lg text-white">$1,000 Reward Pool</h3>
            <p className="text-sm text-gray-400">
              1,000 random winners receive $1 in BNB upon supply sell-out. Verifiable deterministic random seed with transparent auditing.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
