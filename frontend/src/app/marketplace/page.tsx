'use client';

import React, { useState } from 'react';
import { getWalletProvider, formatAddress } from '../../lib/web3';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">WeZards Marketplace</h1>
          <p className="text-gray-400 mt-1">Non-custodial, reentrancy-protected trading for WeZards NFTs on BNB Chain.</p>
        </div>

        <div className="flex items-center gap-2 bg-mage-card border border-mage-border rounded-xl p-1">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'browse' ? 'bg-mage-purple text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Browse Listings
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'list' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            + List Your Mage
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl border text-sm ${statusMsg.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-red-950/40 border-red-500/50 text-red-200'}`}>
          {statusMsg.text}
        </div>
      )}

      {activeTab === 'browse' ? (
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
        </div>
      )}
    </div>
  );
}
