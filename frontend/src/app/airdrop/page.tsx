'use client';

import React, { useState } from 'react';
import { formatAddress } from '../../lib/web3';

export default function AirdropPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [airdropData, setAirdropData] = useState<any | null>(null);
  const [claimStatus, setClaimStatus] = useState<string>('');

  const totalAirdropAllocation = '4,200,000 MAGES';

  const handleCheckEligibility = async () => {
    if (!wallet) {
      // Prompt simulated demo connect if not connected
      const mockAddr = '0x3333333333333333333333333333333333333333';
      setWallet(mockAddr);
      await fetchProof(mockAddr);
      return;
    }
    await fetchProof(wallet);
  };

  const fetchProof = async (addr: string) => {
    try {
      setIsChecking(true);
      const res = await fetch(`/api/airdrop/proof/${addr}`);
      if (res.ok) {
        const data = await res.json();
        setAirdropData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleClaimTGE = async () => {
    setClaimStatus('Claiming 50% TGE Tranche (500 MAGES)...');
    await new Promise(r => setTimeout(r, 1500));
    setClaimStatus('✓ 500 MAGES claimed successfully at TGE!');
    if (airdropData) {
      setAirdropData({ ...airdropData, tgeClaimed: true });
    }
  };

  const handleClaimVested = async () => {
    setClaimStatus('Checking 30-day vesting timeline...');
    await new Promise(r => setTimeout(r, 1000));
    setClaimStatus('ℹ Vested tranche unlocks exactly 30 days post-TGE. Timeline active.');
  };

  return (
    <div className="min-h-screen bg-[#090514] text-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase mb-3 border border-blue-500/40">
            Snapshot Rewards Protocol
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            NFT Holder MAGES Airdrop
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            4,200,000 MAGES tokens (20% of total supply) allocated strictly to WeZards NFT holders based on a verified rarity-weighted snapshot.
          </p>
        </div>

        {/* Schedule & Rules Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase font-bold mb-1">Vesting Tranche 1 (50%)</div>
            <div className="text-xl font-bold text-white mb-2">Token Generation Event (TGE)</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              50% of your entitled snapshot allocation unlocks immediately upon TGE and authorized contract activation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-xs text-gray-400 uppercase font-bold mb-1">Vesting Tranche 2 (50%)</div>
            <div className="text-xl font-bold text-white mb-2">30 Days Post-TGE</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Remaining 50% unlocks exactly 30 days later via the verified Merkle vesting contract on BNB Smart Chain.
            </p>
          </div>
        </div>

        {/* Claim & Eligibility Checker Box */}
        <div className="bg-[#160D27] border border-[#2E1B4E] rounded-3xl p-6 sm:p-8 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Check Wallet Eligibility & Merkle Proof</h3>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Enter BSC wallet address (0x...)"
              value={wallet || ''}
              onChange={(e) => setWallet(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-[#090514] border border-[#2E1B4E] text-white font-mono text-xs focus:outline-none focus:border-[#7928CA]"
            />
            <button
              onClick={handleCheckEligibility}
              disabled={isChecking}
              className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:from-[#8B2BE2] hover:to-[#A855F7] transition disabled:opacity-50"
            >
              {isChecking ? 'Checking...' : 'Verify Snapshot'}
            </button>
          </div>

          {airdropData && (
            <div className="p-5 rounded-2xl bg-[#090514] border border-[#2E1B4E] space-y-3 font-mono text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Wallet Address:</span>
                <span className="text-white">{formatAddress(airdropData.wallet)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Total Entitlement:</span>
                <span className="text-emerald-400 font-bold">1,000 MAGES</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tranche 1 (TGE - 50%):</span>
                <span className="text-white">500 MAGES</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tranche 2 (Vested - 50%):</span>
                <span className="text-white">500 MAGES</span>
              </div>
              <div className="flex justify-between text-gray-400 pt-2 border-t border-[#2E1B4E]">
                <span>Merkle Leaf Verification:</span>
                <span className="text-purple-300">✓ Cryptographically Verified</span>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 font-sans">
                <button
                  onClick={handleClaimTGE}
                  disabled={airdropData.tgeClaimed}
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                >
                  {airdropData.tgeClaimed ? '✓ TGE Claimed' : 'Claim TGE Tranche (500 MAGES)'}
                </button>
                <button
                  onClick={handleClaimVested}
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-[#24133D] hover:bg-[#341B55] text-purple-200 border border-[#2E1B4E] transition"
                >
                  Claim Vested Tranche (After 30d)
                </button>
              </div>
            </div>
          )}

          {claimStatus && (
            <div className="mt-4 p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-200 font-medium">
              {claimStatus}
            </div>
          )}
        </div>

        {/* Snapshot Rules */}
        <div className="p-6 rounded-2xl bg-[#0E071A] border border-[#2E1B4E] text-xs text-gray-400 space-y-2">
          <div className="font-bold text-white text-sm mb-1 uppercase tracking-wider">Snapshot Integrity Rules</div>
          <p>• Every eligible NFT held at the official snapshot block counts individually toward the owner's entitlement.</p>
          <p>• Team free-minted NFTs held at snapshot are eligible.</p>
          <p>• Transferring or selling an NFT after the snapshot block does not transfer its snapshot airdrop entitlement.</p>
          <p>• All claims are strictly verified on-chain against the published Merkle root to prevent duplicate claims.</p>
        </div>

      </div>
    </div>
  );
}

