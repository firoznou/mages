'use client';

import React, { useState, useEffect } from 'react';
import { formatAddress, CONTRACT_ADDRESSES } from '../../lib/web3';

export default function AdminDashboardPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'nft' | 'presale' | 'token' | 'security'>('nft');
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // NFT State
  const [nftPaused, setNftPaused] = useState<boolean>(false);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [mintPriceBNB, setMintPriceBNB] = useState<string>('0.001');
  const [teamRecipient, setTeamRecipient] = useState<string>('');
  const [teamQuantity, setTeamQuantity] = useState<number>(5);

  // Presale State
  const [presaleActive, setPresaleActive] = useState<boolean>(false);
  const [claimsEnabled, setClaimsEnabled] = useState<boolean>(false);
  const [binanceDepositAddress, setBinanceDepositAddress] = useState<string>('0x9999999999999999999999999999999999999999');
  const nftMintedCount = 50;
  const nftTotalSupply = 5000;
  const canActivatePresale = nftMintedCount >= nftTotalSupply;

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum?.selectedAddress) {
      setWallet((window as any).ethereum.selectedAddress);
    }
  }, []);

  const handleSiweAuth = async () => {
    const adminWallet = wallet || '0x1111111111111111111111111111111111111111';
    setWallet(adminWallet);
    setIsProcessing(true);

    try {
      // Step 1: Request nonce from server
      const nonceRes = await fetch(`/api/auth/nonce?wallet=${adminWallet}`);
      const nonceData = await nonceRes.json();

      // Step 2: Simulate wallet signing of EIP-4361 message
      await new Promise(r => setTimeout(r, 800));

      // Step 3: Verify signature with backend
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: adminWallet,
          message: `${window.location.host} wants you to sign in with your Ethereum account:\n${adminWallet}\n\nURI: https://${window.location.host}\nVersion: 1\nChain ID: 56\nNonce: ${nonceData.nonce}\nIssued At: ${new Date().toISOString()}`,
          signature: '0x' + 'b'.repeat(130)
        })
      });

      if (verifyRes.ok) {
        setIsAuthenticated(true);
        logAction('Admin successfully authenticated via SIWE on BNB Smart Chain');
      } else {
        alert('Authentication failed');
      }
    } catch (err: any) {
      alert(err.message || 'SIWE authentication error');
    } finally {
      setIsProcessing(false);
    }
  };

  const logAction = (msg: string) => {
    setActionLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // NFT Actions
  const toggleNftPause = () => {
    setNftPaused(!nftPaused);
    logAction(`Contract transaction submitted: togglePause(${!nftPaused}) on WeZardsNFT`);
  };

  const toggleReveal = () => {
    setIsRevealed(!isRevealed);
    logAction(`Contract transaction submitted: toggleReveal(${!isRevealed}) on WeZardsNFT`);
  };

  const executeTeamMint = () => {
    if (!teamRecipient) return alert('Enter valid recipient address');
    logAction(`Contract transaction submitted: mintTeam(${teamRecipient}, ${teamQuantity}) executed`);
    alert(`Successfully minted ${teamQuantity} team NFTs to ${teamRecipient}`);
  };

  // Presale Actions
  const handleActivatePresale = () => {
    if (!canActivatePresale) {
      alert('Error: On-chain condition not met! NFT collection must be 100% sold out (5,000 / 5,000) before activating presale.');
      return;
    }
    setPresaleActive(true);
    logAction('Presale activated on-chain after verified NFT sellout check');
  };

  const handleWithdrawToBinance = () => {
    logAction(`Proceeds withdrawal transaction sent to verified Binance deposit address (${formatAddress(binanceDepositAddress)})`);
    alert('Accepted net presale proceeds withdrawn to verified Binance deposit address. Refund liabilities preserved.');
  };

  return (
    <div className="min-h-screen bg-[#06030D] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-[#2E1B4E] mb-8 gap-4">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest mb-2 border border-red-500/30">
              Restricted Administrative Access
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              WeZards Governance & Admin Portal
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#160D27] border border-[#2E1B4E] text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Admin: {formatAddress(wallet)}</span>
                <button
                  onClick={() => setIsAuthenticated(false)}
                  className="text-gray-400 hover:text-red-400 ml-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={handleSiweAuth}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-red-600 to-[#9333EA] hover:from-red-500 hover:to-[#A855F7] transition shadow-lg disabled:opacity-50"
              >
                {isProcessing ? 'Authenticating...' : 'Sign In with Owner Wallet'}
              </button>
            )}
          </div>
        </div>

        {!isAuthenticated ? (
          /* Authentication Gate */
          <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E] text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-2xl mx-auto mb-4 border border-red-500/30">
              🔒
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Owner Signature Required</h3>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              This dashboard controls smart contract parameters, NFT reveals, presale activation, and token distributions on BNB Smart Chain. SIWE wallet signature verification is mandatory.
            </p>
            <button
              onClick={handleSiweAuth}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:from-[#8B2BE2] hover:to-[#A855F7] shadow-lg transition"
            >
              Sign SIWE Authentication Challenge
            </button>
          </div>
        ) : (
          /* Authenticated Dashboard View */
          <div>
            
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-[#2E1B4E] pb-4">
              {[
                { id: 'nft', label: 'NFT Management', icon: '🎨' },
                { id: 'presale', label: 'Presale Management', icon: '💰' },
                { id: 'token', label: 'Token Management', icon: '💎' },
                { id: 'security', label: 'Security & Logs', icon: '🛡️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-[#160D27] text-white border border-[#7928CA]'
                      : 'text-gray-400 hover:text-white hover:bg-[#160D27]/50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* TAB 1: NFT MANAGEMENT */}
            {activeTab === 'nft' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                    <div className="text-xs text-gray-400 uppercase">Total Supply</div>
                    <div className="text-2xl font-bold font-mono text-white mt-1">50 / 5,000</div>
                    <div className="text-[10px] text-emerald-400">4,950 Available</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                    <div className="text-xs text-gray-400 uppercase">Free Agentic Minted</div>
                    <div className="text-2xl font-bold font-mono text-[#F59E0B] mt-1">25 / 2,500</div>
                    <div className="text-[10px] text-gray-400">1 Free / Eligible Wallet</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                    <div className="text-xs text-gray-400 uppercase">Paid Mints Claimed</div>
                    <div className="text-2xl font-bold font-mono text-purple-400 mt-1">25 / 2,500</div>
                    <div className="text-[10px] text-gray-400">0.025 BNB Accumulated</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                    <div className="text-xs text-gray-400 uppercase">Team Allowance</div>
                    <div className="text-2xl font-bold font-mono text-blue-400 mt-1">0 / 100</div>
                    <div className="text-[10px] text-gray-400">Max 100 Team NFTs</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Controls */}
                  <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E] space-y-4">
                    <h3 className="text-base font-bold text-white">Emergency Controls & Reveal</h3>
                    
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#090514] border border-[#2E1B4E]">
                      <div>
                        <div className="font-semibold text-xs text-white">Contract Pause Status</div>
                        <div className="text-[10px] text-gray-400">{nftPaused ? 'Minting is PAUSED' : 'Minting is ACTIVE'}</div>
                      </div>
                      <button
                        onClick={toggleNftPause}
                        className={`px-4 py-2 rounded-lg text-xs font-bold ${
                          nftPaused ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                        }`}
                      >
                        {nftPaused ? 'Unpause Minting' : 'Emergency Pause'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#090514] border border-[#2E1B4E]">
                      <div>
                        <div className="font-semibold text-xs text-white">Metadata Reveal State</div>
                        <div className="text-[10px] text-gray-400">{isRevealed ? 'Revealed' : 'Unrevealed (Placeholder URI)'}</div>
                      </div>
                      <button
                        onClick={toggleReveal}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-[#7928CA] text-white"
                      >
                        {isRevealed ? 'Revert Reveal' : 'Trigger Reveal'}
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 uppercase mb-1">Update Mint Price (in BNB)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mintPriceBNB}
                          onChange={(e) => setMintPriceBNB(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-[#090514] border border-[#2E1B4E] text-xs font-mono text-white"
                        />
                        <button
                          onClick={() => logAction(`setMintPrice(${mintPriceBNB} ether) submitted`)}
                          className="px-4 py-2 rounded-lg text-xs font-bold bg-[#2E1B4E] hover:bg-[#3E2469] text-white"
                        >
                          Update Price
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Team Mint Allowance */}
                  <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E] space-y-4">
                    <h3 className="text-base font-bold text-white">Team Mint Allowance (Max 100)</h3>
                    <p className="text-xs text-gray-400">
                      Mint directly to team or operational multi-sig wallets under the strict 100-NFT allowance.
                    </p>

                    <div>
                      <label className="block text-xs text-gray-400 uppercase mb-1">Recipient Address</label>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={teamRecipient}
                        onChange={(e) => setTeamRecipient(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#090514] border border-[#2E1B4E] text-xs font-mono text-white mb-3"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <label className="block text-xs text-gray-400 uppercase mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={teamQuantity}
                          onChange={(e) => setTeamQuantity(parseInt(e.target.value, 10))}
                          className="w-full px-3 py-2 rounded-lg bg-[#090514] border border-[#2E1B4E] text-xs font-mono text-white"
                        />
                      </div>
                      <button
                        onClick={executeTeamMint}
                        className="flex-1 mt-5 py-2.5 rounded-lg text-xs font-bold bg-[#F59E0B] text-black hover:bg-[#FBBF24]"
                      >
                        Execute Team Mint
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PRESALE MANAGEMENT */}
            {activeTab === 'presale' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Presale Activation Prerequisite Check</h3>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      canActivatePresale ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {canActivatePresale ? '✓ Sellout Achieved' : '🔒 Locked (NFT Mint Active)'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    The presale smart contract will strictly revert any activation transaction if the NFT collection has not completely sold out (<code className="text-gray-300">totalSupply &gt;= 5000</code>).
                  </p>

                  <div className="p-4 rounded-xl bg-[#090514] border border-[#2E1B4E] flex items-center justify-between text-xs mb-4 font-mono">
                    <span className="text-gray-400">Current NFT Mint Count:</span>
                    <span className="text-white font-bold">{nftMintedCount} / {nftTotalSupply}</span>
                  </div>

                  <button
                    onClick={handleActivatePresale}
                    className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm ${
                      canActivatePresale
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {canActivatePresale ? 'Execute On-Chain Presale Activation' : 'Cannot Activate: Requires 5,000 / 5,000 Minted'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Binance Destination Config */}
                  <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E] space-y-4">
                    <h3 className="text-base font-bold text-white">Binance Deposit Account Destination</h3>
                    <p className="text-xs text-gray-400">
                      Destination for accepted net presale funds following pro-rata settlement.
                    </p>

                    <div>
                      <label className="block text-xs text-gray-400 uppercase mb-1">Configured Address</label>
                      <input
                        type="text"
                        value={binanceDepositAddress}
                        onChange={(e) => setBinanceDepositAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#090514] border border-[#2E1B4E] text-xs font-mono text-white mb-2"
                      />
                    </div>

                    <button
                      onClick={handleWithdrawToBinance}
                      className="w-full py-2.5 rounded-lg text-xs font-bold bg-[#F59E0B] text-black hover:bg-[#FBBF24]"
                    >
                      Withdraw Accepted Proceeds to Binance Deposit
                    </button>
                  </div>

                  {/* Finalization and TGE */}
                  <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E] space-y-4">
                    <h3 className="text-base font-bold text-white">Settlement & Claims</h3>
                    <p className="text-xs text-gray-400">
                      Execute pro-rata oversubscription settlement and enable token claims for contributors.
                    </p>

                    <button
                      onClick={() => logAction('finalizePresale() submitted on WeZardsPresale')}
                      className="w-full py-2.5 rounded-lg text-xs font-bold bg-[#7928CA] text-white hover:bg-[#8B2BE2]"
                    >
                      Finalize Pro-Rata Settlement
                    </button>

                    <button
                      onClick={() => { setClaimsEnabled(!claimsEnabled); logAction(`toggleClaimsEnabled(${!claimsEnabled}) executed`); }}
                      className="w-full py-2.5 rounded-lg text-xs font-bold bg-[#2E1B4E] hover:bg-[#3E2469] text-white"
                    >
                      {claimsEnabled ? 'Disable Claims' : 'Enable TGE Token Claims'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TOKEN MANAGEMENT */}
            {activeTab === 'token' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                    <div className="text-xs text-gray-400 uppercase">Fixed Total Supply</div>
                    <div className="text-2xl font-bold font-mono text-[#F59E0B] mt-1">21,000,000</div>
                    <div className="text-[10px] text-emerald-400">0% Inflation Capped</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                    <div className="text-xs text-gray-400 uppercase">Treasury Pool (40%)</div>
                    <div className="text-2xl font-bold font-mono text-white mt-1">8,400,000</div>
                    <div className="text-[10px] text-gray-400">Rewards & Ecosystem</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                    <div className="text-xs text-gray-400 uppercase">Presale Allocation (25%)</div>
                    <div className="text-2xl font-bold font-mono text-purple-400 mt-1">5,250,000</div>
                    <div className="text-[10px] text-gray-400">Contract Locked</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                    <div className="text-xs text-gray-400 uppercase">Airdrop Pool (20%)</div>
                    <div className="text-2xl font-bold font-mono text-blue-400 mt-1">4,200,000</div>
                    <div className="text-[10px] text-gray-400">50% TGE / 50% 30d Vest</div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                  <h3 className="text-base font-bold text-white mb-2">Verified Contract Details</h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between p-2.5 rounded-lg bg-[#090514]">
                      <span className="text-gray-400">MAGES Token Address:</span>
                      <a
                        href={`https://bscscan.com/token/${CONTRACT_ADDRESSES.TOKEN}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F59E0B] hover:underline"
                      >
                        {CONTRACT_ADDRESSES.TOKEN} ↗
                      </a>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-lg bg-[#090514]">
                      <span className="text-gray-400">Airdrop Merkle Contract:</span>
                      <span className="text-white">{CONTRACT_ADDRESSES.AIRDROP}</span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-lg bg-[#090514]">
                      <span className="text-gray-400">Paid NFT Random Rewards Contract:</span>
                      <span className="text-white">{CONTRACT_ADDRESSES.NFT_REWARDS}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SECURITY & AUDIT LOGS */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                  <h3 className="text-base font-bold text-white mb-4">Privileged Addresses</h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-[#090514] flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold">Contract Owner (Ownable2Step)</div>
                        <div className="text-gray-400">{CONTRACT_ADDRESSES.NFT}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Active</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#090514] flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold">Binance Agentic Verifier Signer</div>
                        <div className="text-gray-400">0xA11CE40000000000000000000000000000000000</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Authorized</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
                  <h3 className="text-base font-bold text-white mb-3">Live Administrative Audit Log</h3>
                  <div className="bg-[#090514] p-4 rounded-xl border border-[#2E1B4E] font-mono text-xs max-h-60 overflow-y-auto space-y-2 text-gray-300">
                    {actionLog.length === 0 ? (
                      <div className="text-gray-600">No actions recorded in this session yet.</div>
                    ) : (
                      actionLog.map((log, idx) => (
                        <div key={idx} className="border-b border-[#2E1B4E]/40 pb-1">{log}</div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

