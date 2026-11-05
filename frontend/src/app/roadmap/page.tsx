import React from 'react';

export default function RoadmapPage() {
  const phases = [
    {
      phase: 'Phase 1',
      title: 'Genesis Awakening',
      status: 'Completed',
      items: [
        'Solidity smart contract suite audited on BNB Chain (ERC-20, ERC-721, Marketplace, RewardDistributor).',
        '1-bit retro crypto pixel art generation engine with 10 visual trait layers and zero duplicate collisions.',
        'High performance Cloudflare Workers backend with relational D1 database (15 tables).',
        'Decoupled Admin Command Center with secure PBKDF2 authentication.'
      ]
    },
    {
      phase: 'Phase 2',
      title: 'Summoning & Community Campaign',
      status: 'Current Phase',
      items: [
        'Binance Agentic Wallet free minting portal (250 exclusive allocations).',
        'Public paid mint phase (250 allocations @ 0.001 BNB).',
        '$1,000 BNB community reward campaign with 1,000 verifiable random winners.',
        'IPFS Pinata permanent decentralized image & metadata hosting.'
      ]
    },
    {
      phase: 'Phase 3',
      title: 'Decentralized Marketplace & $WEZ Launch',
      status: 'Upcoming',
      items: [
        'Non-custodial WeZards NFT Marketplace trading with 2.5% protocol fee.',
        '$WEZ liquidity pool deployment on PancakeSwap with transparent allocations.',
        'Holder staking and Mage trait leveling rewards.'
      ]
    },
    {
      phase: 'Phase 4',
      title: 'Arcane Guilds & Meta Expansion',
      status: 'Future Vision',
      items: [
        'On-chain Mage guild factions and PvP spell dueling.',
        'Remaining 4,500 reserve Mages ecosystem expansion.',
        'Community DAO governance powered by $WEZ voting.'
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
          🗺️ Project Lore & Trajectory
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          The <span className="bg-gradient-to-r from-amber-300 to-purple-300 bg-clip-text text-transparent">WeZards Roadmap</span>
        </h1>
        <p className="text-gray-300 max-w-xl mx-auto text-base">
          From the creation of the 5,000 Pixel Mages to decentralized on-chain governance on BNB Smart Chain.
        </p>
      </div>

      <div className="space-y-6">
        {phases.map((p, idx) => (
          <div key={p.phase} className="bg-mage-card border border-mage-border rounded-3xl p-6 sm:p-8 space-y-4 relative overflow-hidden shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-mage-border pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-amber-400 font-mono">{p.phase}</span>
                <h3 className="text-xl font-bold text-white">{p.title}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase w-fit ${
                p.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                p.status === 'Current Phase' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
                'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {p.status}
              </span>
            </div>

            <ul className="space-y-2.5 text-sm text-gray-300 pt-2">
              {p.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-amber-400 font-bold mt-0.5">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

