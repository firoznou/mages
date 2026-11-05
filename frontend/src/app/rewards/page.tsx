'use client';

import React, { useState } from 'react';
import { submitRewardCampaign } from '../../lib/api';

export default function RewardsPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [twitterUsername, setTwitterUsername] = useState('');
  const [twitterPostUrl, setTwitterPostUrl] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      alert('Please accept campaign terms to proceed.');
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const res = await submitRewardCampaign({
        walletAddress: walletAddress.trim(),
        twitterUsername: twitterUsername.trim(),
        twitterPostUrl: twitterPostUrl.trim()
      });
      setResult({ success: true, message: res.message });
      setWalletAddress('');
      setTwitterUsername('');
      setTwitterPostUrl('');
      setAcceptedTerms(false);
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Submission failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      {/* Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          🎁 $1,000 BNB Community Campaign
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Win <span className="text-amber-300">$1 Worth of BNB</span> (1,000 Winners)
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto text-base">
          When the initial WeZards mint allocation sells out, 1,000 approved participants will be chosen via a verifiable random selection algorithm to receive $1 worth of BNB each.
        </p>
      </div>

      {/* Rules & Eligibility Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-mage-card border border-mage-border rounded-2xl p-5 space-y-2">
          <div className="text-2xl font-bold text-amber-300">01</div>
          <h3 className="font-bold text-white text-base">Mint a Mage</h3>
          <p className="text-xs text-gray-400">Claim your Free Binance Agentic Mint or participate in the Public Paid Mint.</p>
        </div>

        <div className="bg-mage-card border border-mage-border rounded-2xl p-5 space-y-2">
          <div className="text-2xl font-bold text-purple-300">02</div>
          <h3 className="font-bold text-white text-base">Post on X / Twitter</h3>
          <p className="text-xs text-gray-400">Share your WeZards Mage artwork on Twitter/X with tag #WeZards and copy the tweet link.</p>
        </div>

        <div className="bg-mage-card border border-mage-border rounded-2xl p-5 space-y-2">
          <div className="text-2xl font-bold text-emerald-300">03</div>
          <h3 className="font-bold text-white text-base">Verifiable Payout</h3>
          <p className="text-xs text-gray-400">Exactly 1,000 unique approved winners chosen deterministically and paid in BNB.</p>
        </div>
      </div>

      {/* Submission Form */}
      <div className="bg-mage-card border border-mage-border rounded-3xl p-6 sm:p-10 shadow-2xl relative">
        <h2 className="text-2xl font-bold text-white mb-6">Submit Your Campaign Entry</h2>

        {result && (
          <div className={`p-4 rounded-xl border text-sm mb-6 ${result.success ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-red-950/40 border-red-500/50 text-red-200'}`}>
            {result.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
              BNB Smart Chain Wallet Address *
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full bg-mage-dark border border-mage-border rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-mage-glow"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
              X / Twitter Username *
            </label>
            <input
              type="text"
              placeholder="@YourHandle"
              value={twitterUsername}
              onChange={(e) => setTwitterUsername(e.target.value)}
              className="w-full bg-mage-dark border border-mage-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-mage-glow"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
              X / Twitter Post URL *
            </label>
            <input
              type="url"
              placeholder="https://x.com/YourHandle/status/123456789"
              value={twitterPostUrl}
              onChange={(e) => setTwitterPostUrl(e.target.value)}
              className="w-full bg-mage-dark border border-mage-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-mage-glow"
              required
            />
          </div>

          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 rounded bg-mage-dark border-mage-border text-purple-600 focus:ring-0"
              required
            />
            <label htmlFor="terms" className="text-xs text-gray-400 leading-normal">
              I certify that I hold an eligible BNB Chain wallet, have posted on Twitter/X, and agree that duplicate wallet entries are strictly prohibited.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-r from-emerald-500 via-amber-400 to-purple-600 text-black hover:opacity-95 shadow-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Submitting Entry...' : 'Submit Campaign Entry 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
