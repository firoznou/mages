'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CONTRACT_ADDRESSES, 
  ASSET_BASE_URLS, 
  fetchOnChainMintStats, 
  fetchMintedNFTList, 
  formatAddress 
} from '../../lib/web3';

interface NFTItem {
  token_id: number;
  name: string;
  owner_address: string;
  image_url: string;
  rarity_score: number;
  rarity_rank: number;
  rarity_tier: 'Legendary' | 'Epic' | 'Rare' | 'Uncommon' | 'Common';
  attributes: Array<{ trait_type: string; value: string }>;
}

export default function CollectionPage() {
  const [mintedNFTs, setMintedNFTs] = useState<NFTItem[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Real on-chain metrics from BSC
  const totalSupply = 5000;
  const freeAllocation = 2500;
  const paidAllocation = 2500;
  const [mintStats, setMintStats] = useState({
    freeMinted: 0,
    paidMinted: 0,
    totalMinted: 0,
    remaining: 5000,
    blockNumber: 131857855
  });

  useEffect(() => {
    async function loadRealData() {
      try {
        setLoading(true);
        const stats = await fetchOnChainMintStats();
        setMintStats(stats);

        if (stats.totalMinted > 0) {
          const list = await fetchMintedNFTList();
          setMintedNFTs(list);
        } else {
          setMintedNFTs([]);
        }
      } catch (err) {
        console.error('Failed to load on-chain collection data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRealData();
  }, []);

  const filteredNFTs = mintedNFTs.filter(nft => {
    if (selectedTier !== 'all' && nft.rarity_tier !== selectedTier) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = nft.name.toLowerCase().includes(q);
      const matchId = String(nft.token_id).includes(q);
      const matchTrait = nft.attributes?.some(a => a.value.toLowerCase().includes(q));
      return matchName || matchId || matchTrait;
    }
    return true;
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Legendary': return 'bg-amber-500 text-black font-extrabold';
      case 'Epic': return 'bg-purple-600 text-white';
      case 'Rare': return 'bg-blue-600 text-white';
      case 'Uncommon': return 'bg-emerald-600 text-white';
      default: return 'bg-gray-600 text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#090514] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7928CA]/20 text-[#C084FC] text-xs font-bold tracking-widest uppercase mb-3 border border-[#7928CA]/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Verified BSC On-Chain Collection
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            WeZards Pixel Mages
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Strictly viewing only minted WeZards NFTs on BNB Smart Chain. 5,000 unique retro 8-bit wizards with on-chain provenance, Chainlink VRF token rewards, and transparent contract tracking.
          </p>
        </div>

        {/* Real Collection Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-10">
          <div className="p-4 rounded-xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Total Supply</div>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">{totalSupply.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">Immutable Hard Cap</div>
          </div>
          <div className="p-4 rounded-xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Free Allocation</div>
            <div className="text-2xl font-bold font-mono text-[#F59E0B] mt-0.5">{freeAllocation.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">{mintStats.freeMinted} Minted On-Chain</div>
          </div>
          <div className="p-4 rounded-xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Paid Allocation</div>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-0.5">{paidAllocation.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">{mintStats.paidMinted} Minted (0.001 BNB)</div>
          </div>
          <div className="p-4 rounded-xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Minted Supply</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{mintStats.totalMinted.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">
              {((mintStats.totalMinted / totalSupply) * 100).toFixed(1)}% Minted
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase">Remaining Supply</div>
            <div className="text-2xl font-bold font-mono text-[#F59E0B] mt-0.5">{mintStats.remaining.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">Available to Mint</div>
          </div>
        </div>

        {/* Contract Address Verification Badge */}
        <div className="mb-8 p-3.5 rounded-2xl bg-[#160D27] border border-[#2E1B4E] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-gray-400">NFT Smart Contract:</span>
            <span className="text-white font-bold">{CONTRACT_ADDRESSES.NFT}</span>
          </div>
          <a
            href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.NFT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#F59E0B] hover:text-[#FBBF24] transition flex items-center gap-1 font-semibold font-sans text-xs"
          >
            <span>View Verified Contract on BscScan</span>
            <span>↗</span>
          </a>
        </div>

        {/* Minted NFTs View Constraint */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-2 border-[#7928CA] border-t-[#F59E0B] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm font-mono">Querying BNB Smart Chain for minted WeZards NFTs...</p>
          </div>
        ) : mintStats.totalMinted === 0 ? (
          /* Zero Minted State — strictly showing ONLY minted NFTs */
          <div className="py-20 px-6 rounded-3xl bg-[#160D27] border border-[#2E1B4E] text-center max-w-2xl mx-auto shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7928CA] to-[#F59E0B] mx-auto mb-5 flex items-center justify-center text-3xl shadow-lg">
              🧙‍♂️
            </div>
            <h3 className="text-2xl font-black text-white mb-3">
              No WeZards NFTs Minted Yet
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Only verified on-chain minted NFTs are displayed in this collection.
              Smart contract <span className="font-mono text-purple-300">{formatAddress(CONTRACT_ADDRESSES.NFT)}</span> currently has 0 minted items out of the 5,000 collection cap.
              Minting is officially live on BNB Smart Chain!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/mint"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:from-[#8B2BE2] hover:to-[#A855F7] shadow-[0_0_20px_rgba(121,40,202,0.5)] transition"
              >
                ⚡ Mint WeZards NFT #0001
              </Link>
              <Link
                href="/rewards"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-gray-300 bg-[#090514] border border-[#2E1B4E] hover:text-white transition"
              >
                MAGES Token Rewards
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#160D27] border border-[#2E1B4E]">
                {['all', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                      selectedTier === tier
                        ? 'bg-[#7928CA] text-white shadow'
                        : 'text-gray-400 hover:text-white hover:bg-[#24143D]'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>

              <div className="w-full md:w-72">
                <input
                  type="text"
                  placeholder="Search minted by ID, name, or trait..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-[#160D27] border border-[#2E1B4E] text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#7928CA]"
                />
              </div>
            </div>

            {/* Grid of Minted NFTs */}
            {filteredNFTs.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                No minted wizards match your filter criteria.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredNFTs.map((nft) => (
                  <div
                    key={nft.token_id}
                    onClick={() => setSelectedNFT(nft)}
                    className="group cursor-pointer bg-[#160D27] border border-[#2E1B4E] rounded-xl overflow-hidden hover:border-[#7928CA] transition-all hover:shadow-[0_8px_20px_-8px_rgba(121,40,202,0.5)] transform hover:-translate-y-1"
                  >
                    <div className="w-full aspect-square bg-[#090514] p-3 flex items-center justify-center relative">
                      <img
                        src={`${ASSET_BASE_URLS.IMAGES}/${nft.token_id}.png`}
                        alt={nft.name}
                        className="w-full h-full object-contain pixelated"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${getTierColor(nft.rarity_tier)}`}>
                        {nft.rarity_tier}
                      </span>
                    </div>

                    <div className="p-3">
                      <div className="font-bold text-white text-xs truncate">{nft.name}</div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1 font-mono">
                        <span>Rank: #{nft.rarity_rank}</span>
                        <span className="text-[#F59E0B] truncate max-w-[80px]">
                          {formatAddress(nft.owner_address)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NFT Detail Modal */}
        {selectedNFT && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="relative w-full max-w-2xl bg-[#160D27] border border-[#2E1B4E] rounded-2xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
              <button
                onClick={() => setSelectedNFT(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="aspect-square bg-[#090514] rounded-xl p-4 flex items-center justify-center border border-[#2E1B4E]">
                  <img
                    src={`${ASSET_BASE_URLS.IMAGES}/${selectedNFT.token_id}.png`}
                    alt={selectedNFT.name}
                    className="w-full h-full object-contain pixelated"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getTierColor(selectedNFT.rarity_tier)}`}>
                      {selectedNFT.rarity_tier}
                    </span>
                    <span className="text-xs text-gray-400">Rank #{selectedNFT.rarity_rank} of 5,000</span>
                  </div>

                  <h2 className="text-2xl font-black text-white mb-3">{selectedNFT.name}</h2>
                  
                  <div className="space-y-2 text-xs mb-5 font-mono">
                    <div className="flex justify-between py-1 border-b border-[#2E1B4E]">
                      <span className="text-gray-400">Token ID:</span>
                      <span className="text-white">#{selectedNFT.token_id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#2E1B4E]">
                      <span className="text-gray-400">Current Owner:</span>
                      <a
                        href={`https://bscscan.com/address/${selectedNFT.owner_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F59E0B] hover:underline"
                      >
                        {formatAddress(selectedNFT.owner_address)}
                      </a>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#2E1B4E]">
                      <span className="text-gray-400">Metadata URL:</span>
                      <a
                        href={`${ASSET_BASE_URLS.METADATA}/${selectedNFT.token_id}.json`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-300 hover:underline text-[11px]"
                      >
                        JSON Metadata ↗
                      </a>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#2E1B4E]">
                      <span className="text-gray-400">Rarity Score:</span>
                      <span className="text-[#F59E0B] font-bold">{selectedNFT.rarity_score}</span>
                    </div>
                  </div>

                  {/* Attributes */}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">Traits</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {selectedNFT.attributes?.map((attr, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-[#090514] border border-[#2E1B4E]">
                        <div className="text-[10px] text-gray-400 uppercase truncate">{attr.trait_type}</div>
                        <div className="text-xs font-semibold text-white truncate">{attr.value}</div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
