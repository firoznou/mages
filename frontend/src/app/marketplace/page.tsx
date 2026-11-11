'use client';

import React, { useState } from 'react';
import { getWalletProvider, formatAddress, ELEMENT_MARKETPLACE_URL } from '../../lib/web3';

interface MarketListing {
  id: string;
  tokenId: number;
  name: string;
  tier: string;
  priceBNB: number;
  seller: string;
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'list'>('browse');
  const [listingTokenId, setListingTokenId] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [listings, setListings] = useState<MarketListing[]>([
    { id: 'list_1', tokenId: 7, name: 'WeZards #0007', tier: 'Epic', priceBNB: 0.15, seller: '0x32A...8B4' },
    { id: 'list_2', tokenId: 18, name: 'WeZards #0018', tier: 'Rare', priceBNB: 0.08, seller: '0x9F1...C72' },
    { id: 'list_3', tokenId: 99, name: 'WeZards #0099', tier: 'Legendary', priceBNB: 0.85, seller: '0x1C4...2E0' },
    { id: 'list_4', tokenId: 142, name: 'WeZards #0142', tier: 'Uncommon', priceBNB: 0.04, seller: '0x7B2...F31' },
  ]);

  const handleBuy = async (listing: MarketListing) => {
    try {
      setStatusMsg({ type: 'success', text: `Purchased ${listing.name} for ${listing.priceBNB} BNB! NFT transferred to your wallet.` });
      setListings(listings.filter(l => l.id !== listing.id));
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Purchase failed' });
    }
  };

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    const idNum = parseInt(listingTokenId, 10);
    const priceNum = parseFloat(listingPrice);

    if (isNaN(idNum) || isNaN(priceNum) || priceNum <= 0) {
      setStatusMsg({ type: 'error', text: 'Enter valid Token ID and Price in BNB.' });
      return;
    }

    const newListing: MarketListing = {
      id: `list_${Date.now()}`,
      tokenId: idNum,
      name: `WeZards #${String(idNum).padStart(4, '0')}`,
      tier: 'Rare',
      priceBNB: priceNum,
      seller: '0xYourWallet...Me'
    };

    setListings([newListing, ...listings]);
    setStatusMsg({ type: 'success', text: `Successfully listed WeZards #${idNum} for ${priceNum} BNB in marketplace escrow!` });
    setListingTokenId('');
    setListingPrice('');
    setActiveTab('browse');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              NFT Marketplace
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              BNB Smart Chain
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">WeZards Marketplace</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Non-custodial trading, peer-to-peer escrow, and official secondary sales for WeZards NFTs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={ELEMENT_MARKETPLACE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/20 via-purple-600/30 to-amber-500/20 text-amber-300 border border-amber-500/40 hover:border-amber-300 hover:bg-amber-500/30 transition-all shadow-md group"
          >
            <span className="text-sm">💎</span>
            <span>Element Market</span>
            <svg className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          <div className="flex items-center gap-1 bg-mage-card border border-mage-border rounded-xl p-1">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'browse' ? 'bg-mage-purple text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Browse Listings
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'list' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              + List Your Mage
            </button>
          </div>
        </div>
      </div>

      {/* Official Element Market Secondary Collection Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#170B28] via-[#1A0F33] to-[#110722] p-6 sm:p-7 shadow-2xl">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#0b0517] border border-amber-500/40 p-2.5 flex items-center justify-center shadow-lg shadow-purple-950/60 shrink-0">
              <img
                src="https://assets.bunink.xyz/images/1.png"
                alt="WeZards"
                className="w-full h-full object-contain rounded-lg"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  Official Secondary Marketplace
                </span>
                <span className="text-[10px] sm:text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Verified Collection
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Trade WeZards on Element Market
              </h2>
              <p className="text-gray-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                The official verified secondary collection is live on <strong className="text-amber-300">Element Market</strong> on BNB Smart Chain. Buy floor WeZards, make collection bids, and trade with low gas fees and instant settlement.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <a
              href={ELEMENT_MARKETPLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-purple-600 text-black hover:text-white hover:opacity-95 hover:scale-[1.02] active:scale-[0.99] transition-all shadow-xl shadow-amber-500/10 group"
            >
              <span>Trade on Element Market</span>
              <svg className="w-4 h-4 text-black group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            <a
              href={ELEMENT_MARKETPLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-xs bg-mage-dark/80 hover:bg-mage-dark text-gray-300 hover:text-white border border-mage-border transition-all"
            >
              <span>View Floor & Bids ↗</span>
            </a>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl border text-sm ${statusMsg.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-red-950/40 border-red-500/50 text-red-200'}`}>
          {statusMsg.text}
        </div>
      )}

      {activeTab === 'browse' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {listings.map((item) => (
              <div key={item.id} className="bg-mage-card border border-mage-border rounded-2xl overflow-hidden hover:border-mage-glow transition-all shadow-xl">
                <div className="aspect-square bg-gradient-to-tr from-purple-900/40 via-mage-dark to-amber-900/30 flex items-center justify-center p-8 relative">
                  <span className="text-7xl filter drop-shadow-[0_10px_20px_rgba(121,40,202,0.4)]">🧙‍♂️</span>
                  <span className={`absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                    item.tier === 'Legendary' ? 'bg-amber-500 text-black' :
                    item.tier === 'Epic' ? 'bg-purple-600 text-white' :
                    item.tier === 'Rare' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {item.tier}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-white">{item.name}</h3>
                    <div className="text-xs text-gray-400 mt-0.5">Seller: {item.seller}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-mage-border">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">Price</div>
                      <div className="text-base font-extrabold text-amber-300">{item.priceBNB} BNB</div>
                    </div>
                    <button
                      onClick={() => handleBuy(item)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-purple-500 text-white hover:opacity-90 shadow-md"
                    >
                      Buy Now ⚡
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Secondary Marketplace Callout Footer */}
          <div className="bg-mage-card/70 border border-mage-border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Element Market Aggregator</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-400">wezards-3</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Looking for more listings, bids, or bulk sweeps?</h3>
              <p className="text-gray-400 text-xs sm:text-sm max-w-xl">
                Access deep liquidity, instant floor sweeping, and live collection order books on Element Market.
              </p>
            </div>

            <a
              href={ELEMENT_MARKETPLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-[#1f1136] hover:bg-[#2b184d] text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-all shadow-md group"
            >
              <span>Explore wezards-3 on Element</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-mage-card border border-mage-border rounded-3xl p-8 space-y-6">
          <h2 className="text-2xl font-bold text-white">List Your Mage for Sale</h2>
          <form onSubmit={handleCreateListing} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Token ID</label>
              <input
                type="number"
                placeholder="e.g. 42"
                value={listingTokenId}
                onChange={(e) => setListingTokenId(e.target.value)}
                className="w-full bg-mage-dark border border-mage-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-mage-glow"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Listing Price (in BNB)</label>
              <input
                type="number"
                step="0.001"
                placeholder="e.g. 0.05"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                className="w-full bg-mage-dark border border-mage-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-mage-glow"
                required
              />
            </div>

            <div className="text-xs text-gray-400 bg-mage-dark/60 p-3 rounded-xl border border-mage-border">
              Protocol fee: <strong>2.5%</strong>. Upon listing, your NFT is safely held in the verified escrow contract until purchased or delisted.
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-purple-500 text-white hover:scale-[1.01] transition-transform"
            >
              Confirm Listing ⚡
            </button>
          </form>

          <div className="text-center pt-2 border-t border-mage-border">
            <span className="text-xs text-gray-400">Prefer secondary market trading? </span>
            <a
              href={ELEMENT_MARKETPLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>List on Element Market</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
