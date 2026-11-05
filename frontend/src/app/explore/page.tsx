'use client';

import React, { useState, useEffect } from 'react';

interface NFTItem {
  id: number;
  name: string;
  tier: string;
  rank: number;
  score: number;
  traits: Record<string, string>;
}

export default function ExplorePage() {
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);

  // Generate sample explorer dataset representing the 5,000 collection
  const mockCollection: NFTItem[] = [
    {
      id: 1,
      name: 'WeZards #0001',
      tier: 'Legendary',
      rank: 1,
      score: 142.8,
      traits: {
        Background: 'Celestial Void',
        Body: 'Chrono Sovereign',
        Eyes: 'Golden Omniscience',
        Hair: 'Radiant Starlight Flow',
        Headwear: 'Crown of the Celestial Archmage',
        Clothing: 'Regalia of the Cosmic Sovereign',
        'Magic Power': 'Primordial Big Bang Genesis',
        Weapons: 'Scepter of Eternal Light',
        Accessories: 'Astral Dragon Familiar',
        'Special Effects': 'Divine Archangel Wings'
      }
    },
    {
      id: 14,
      name: 'WeZards #0014',
      tier: 'Epic',
      rank: 42,
      score: 95.3,
      traits: {
        Background: 'Arcane Sanctum',
        Body: 'Void Archon',
        Eyes: 'Cosmic Nebula Iris',
        Hair: 'Braided Nebula',
        Headwear: 'Star-Weaved Wizard Hat',
        Clothing: 'Void Dragon-Scale Robe',
        'Magic Power': 'Black Hole Gravity Singularity',
        Weapons: 'Primordial Dragon Staff',
        Accessories: 'Eye of the All-Seeing Amulet',
        'Special Effects': 'Void Singularity Aura'
      }
    },
    {
      id: 88,
      name: 'WeZards #0088',
      tier: 'Rare',
      rank: 120,
      score: 78.4,
      traits: {
        Background: 'Solstice Citadel',
        Body: 'Astral Summoner',
        Eyes: 'Runed Starlight',
        Hair: 'Ethereal Silver Strands',
        Headwear: 'Gilded Mystic Circlet',
        Clothing: 'Velvet Archon Cloak',
        'Magic Power': 'Arcane Lightning Storm',
        Weapons: 'Crystal Orb Staff',
        Accessories: 'Orbiting Mana Runestones',
        'Special Effects': 'Swirling Golden Stardust'
      }
    },
    {
      id: 210,
      name: 'WeZards #0210',
      tier: 'Uncommon',
      rank: 310,
      score: 62.1,
      traits: {
        Background: 'Whispering Forest',
        Body: 'Pyromancer',
        Eyes: 'Frost Diamond',
        Hair: 'Arcane Spikes',
        Headwear: 'Enchanted Sorcerer Hood',
        Clothing: 'Frostbound Tunic',
        'Magic Power': 'Holy Radiance Aura',
        Weapons: 'Ancient Runed Wand',
        Accessories: 'Velvet Spell Scroll Satchel',
        'Special Effects': 'Floating Mystic Runes'
      }
    },
    {
      id: 450,
      name: 'WeZards #0450',
      tier: 'Common',
      rank: 750,
      score: 41.6,
      traits: {
        Background: 'Mystic Violet',
        Body: 'Mystic Scholar',
        Eyes: 'Mystic Blue',
        Hair: 'Classic Wizard Cut',
        Headwear: 'Classic Pointed Hat',
        Clothing: 'Apprentice Robes',
        'Magic Power': 'Mystic Mana Orbs',
        Weapons: 'Carved Oak Wand',
        Accessories: 'Silver Chain',
        'Special Effects': 'Subtle Mana Haze'
      }
    },
    {
      id: 500,
      name: 'WeZards #0500',
      tier: 'Legendary',
      rank: 3,
      score: 139.1,
      traits: {
        Background: 'Celestial Void',
        Body: 'Chrono Sovereign',
        Eyes: 'Golden Omniscience',
        Hair: 'Radiant Starlight Flow',
        Headwear: 'Crown of the Celestial Archmage',
        Clothing: 'Regalia of the Cosmic Sovereign',
        'Magic Power': 'Primordial Big Bang Genesis',
        Weapons: 'Scepter of Eternal Light',
        Accessories: 'Astral Dragon Familiar',
        'Special Effects': 'Divine Archangel Wings'
      }
    }
  ];

  const filtered = mockCollection.filter((item) => {
    const matchesTier = selectedTier === 'All' || item.tier === selectedTier;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toString() === searchQuery.trim();
    return matchesTier && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Explore Mages</h1>
        <p className="text-gray-400 mt-1">Browse all 5,000 unique Mages NFTs generated with 10 visual trait layers.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-mage-card border border-mage-border rounded-2xl p-4">
        {/* Tier Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {['All', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedTier === tier
                  ? 'bg-mage-purple text-white shadow-md shadow-mage-purple/40 border border-purple-400'
                  : 'bg-mage-dark/60 text-gray-300 hover:text-white hover:bg-mage-dark'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by ID or name (e.g. 1)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-mage-dark border border-mage-border rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-mage-glow"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((nft) => (
          <div
            key={nft.id}
            onClick={() => setSelectedNFT(nft)}
            className="bg-mage-card border border-mage-border rounded-2xl overflow-hidden cursor-pointer hover:border-mage-glow hover:-translate-y-1 transition-all shadow-lg"
          >
            <div className="aspect-square bg-gradient-to-tr from-purple-900/40 via-mage-dark to-amber-900/30 flex items-center justify-center p-8 relative">
              <span className="text-8xl filter drop-shadow-[0_10px_20px_rgba(121,40,202,0.4)]">🧙‍♂️</span>
              <span
                className={`absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                  nft.tier === 'Legendary'
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50'
                    : nft.tier === 'Epic'
                    ? 'bg-purple-600 text-white'
                    : nft.tier === 'Rare'
                    ? 'bg-blue-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {nft.tier}
              </span>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-white">{nft.name}</h3>
                <span className="text-xs text-amber-300 font-semibold">Rank #{nft.rank}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(nft.traits).slice(0, 3).map(([k, v]) => (
                  <span key={k} className="text-[11px] px-2 py-0.5 rounded bg-mage-dark border border-mage-border text-gray-300">
                    {k}: {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedNFT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-mage-card border border-mage-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedNFT(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-800 to-amber-700 flex items-center justify-center text-4xl">
                🧙‍♂️
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedNFT.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {selectedNFT.tier}
                  </span>
                  <span className="text-xs text-gray-400">Rarity Rank: #{selectedNFT.rank}</span>
                  <span className="text-xs text-gray-400">Score: {selectedNFT.score}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">10 Visual Traits</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedNFT.traits).map(([traitType, val]) => (
                  <div key={traitType} className="bg-mage-dark border border-mage-border rounded-xl p-3">
                    <div className="text-[10px] uppercase text-gray-400 font-semibold">{traitType}</div>
                    <div className="text-sm font-bold text-gray-100 mt-0.5">{val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-mage-border">
              <a
                href="/marketplace"
                className="flex-1 py-3 text-center rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-purple-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-95"
              >
                Trade in Marketplace 🛒
              </a>
              <button
                onClick={() => setSelectedNFT(null)}
                className="px-6 py-3 rounded-xl font-semibold text-sm bg-mage-dark border border-mage-border text-gray-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
