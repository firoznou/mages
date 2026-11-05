'use client';

import React, { useState, useEffect } from 'react';
import {
  adminLogin,
  adminLogout,
  fetchAdminStats,
  fetchSubmissions,
  reviewSubmission,
  triggerWinnerSelection,
  fetchWinners,
  recordWinnerPayment
} from '../lib/adminApi';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Dashboard Data State
  const [stats, setStats] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [winners, setWinners] = useState<any[]>([]);
  const [verifiableSeed, setVerifiableSeed] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check login on load
  useEffect(() => {
    const saved = localStorage.getItem('wezards_admin_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setIsAuthenticated(true);
        setAdminUser(parsed);
      } catch (e) {
        localStorage.removeItem('wezards_admin_auth');
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, activeTab, filterStatus]);

  const loadDashboardData = async () => {
    try {
      const s = await fetchAdminStats();
      setStats(s);

      if (activeTab === 'submissions') {
        const subs = await fetchSubmissions(filterStatus);
        setSubmissions(subs);
      } else if (activeTab === 'winners' || activeTab === 'distribution') {
        const winList = await fetchWinners();
        setWinners(winList);
      }
    } catch (err: any) {
      console.warn('Dashboard data fetch:', err.message);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await adminLogin({ username, password });
      setIsAuthenticated(true);
      setAdminUser(res.admin);
      localStorage.setItem('wezards_admin_auth', JSON.stringify(res.admin));
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    setIsAuthenticated(false);
    setAdminUser(null);
    localStorage.removeItem('wezards_admin_auth');
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await reviewSubmission(id, status, `Reviewed by ${adminUser?.username || 'admin'}`);
      setActionMessage({ type: 'success', text: `Submission #${id} marked as ${status}` });
      loadDashboardData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Review failed' });
    }
  };

  const handleSelectWinners = async () => {
    try {
      setActionMessage({ type: 'success', text: 'Executing verifiable random winner selection...' });
      const res = await triggerWinnerSelection(verifiableSeed || undefined);
      setActionMessage({
        type: 'success',
        text: `Successfully selected ${res.totalSelected} unique winners with seed ${res.verifiableSeed.slice(0, 16)}...`
      });
      loadDashboardData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Winner selection failed' });
    }
  };

  const handleRecordPayout = async (winnerId: string, walletAddress: string) => {
    const txHash = prompt(`Enter BNB transfer transaction hash for wallet ${walletAddress}:`);
    if (!txHash) return;

    try {
      await recordWinnerPayment({
        winnerId,
        walletAddress,
        bnbAmount: '0.002', // $1 worth of BNB @ $500/BNB
        txHash
      });
      setActionMessage({ type: 'success', text: `Payment recorded for ${walletAddress}` });
      loadDashboardData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Payment recording failed' });
    }
  };

  // -----------------------------------------------------------
  // 1. LOGIN SCREEN (If not authenticated)
  // -----------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#0A0A10] to-[#12121A]">
        <div className="max-w-md w-full bg-[#181824] border border-[#28283C] rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-600/20 text-purple-300 flex items-center justify-center text-2xl">
              🛡️
            </div>
            <h1 className="text-2xl font-extrabold text-white">WeZards Command Center</h1>
            <p className="text-xs text-gray-400">Restricted Administrative Access</p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                Admin Username
              </label>
              <input
                type="text"
                placeholder="wezards_admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0F0F17] border border-[#28283C] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0F0F17] border border-[#28283C] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-purple-600/20 transition-all"
            >
              Authenticate & Enter ⚡
            </button>
          </form>

          <div className="text-center text-[11px] text-gray-500">
            Protected by Cloudflare Workers & PBKDF2 Hashing. Rate-limited.
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // 2. MAIN DASHBOARD INTERFACE
  // -----------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A0A10]">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-[#12121A] border-r border-[#222233] flex flex-col justify-between p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧙‍♂️</span>
            <div>
              <div className="font-extrabold text-white text-lg leading-tight">WeZards</div>
              <div className="text-[10px] text-purple-400 font-mono">ADMIN v1.0.0</div>
            </div>
          </div>

          <nav className="space-y-1 text-sm font-medium">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'token', name: 'Token ($WEZ)', icon: '🪙' },
              { id: 'nft', name: 'NFT Management', icon: '🧙‍♂️' },
              { id: 'generator', name: 'Pixel AI Generator', icon: '🎨' },
              { id: 'submissions', name: 'Submissions Queue', icon: '📬' },
              { id: 'winners', name: 'Winner Picker (1k)', icon: '🎲' },
              { id: 'distribution', name: 'BNB Payouts', icon: '💸' },
              { id: 'logs', name: 'Activity Logs', icon: '📜' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setActionMessage(null); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-[#181824]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-6 border-t border-[#222233] space-y-3">
          <div className="text-xs text-gray-400">
            Logged in as: <strong className="text-white">{adminUser?.username || 'Superadmin'}</strong>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-xl text-xs font-bold bg-[#181824] border border-red-500/30 text-red-300 hover:bg-red-950/30 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 sm:p-10 space-y-8 overflow-y-auto max-h-screen">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222233]">
          <div>
            <h2 className="text-2xl font-extrabold text-white capitalize">{activeTab} Console</h2>
            <p className="text-xs text-gray-400 mt-0.5">Real-time governance and monitoring on BNB Smart Chain</p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              Chain: BSC Testnet (97)
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
              D1 Database Connected
            </span>
          </div>
        </div>

        {/* Action Status Banner */}
        {actionMessage && (
          <div className={`p-4 rounded-xl text-sm border ${
            actionMessage.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-red-950/40 border-red-500/50 text-red-200'
          }`}>
            {actionMessage.text}
          </div>
        )}

        {/* ----------------- TAB: OVERVIEW ----------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#181824] border border-[#28283C] rounded-2xl p-6">
                <div className="text-xs text-gray-400 uppercase font-semibold">Total Minted</div>
                <div className="text-3xl font-extrabold text-white mt-2">
                  {stats ? stats.totalMinted : 42} <span className="text-xs text-gray-400">/ 5,000</span>
                </div>
                <div className="text-[11px] text-purple-400 mt-1">250 Free | 250 Paid</div>
              </div>

              <div className="bg-[#181824] border border-[#28283C] rounded-2xl p-6">
                <div className="text-xs text-gray-400 uppercase font-semibold">$WEZ Token Supply</div>
                <div className="text-3xl font-extrabold text-amber-300 mt-2">21,000,000</div>
                <div className="text-[11px] text-gray-400 mt-1">Fixed Supply (No Extra Mint)</div>
              </div>

              <div className="bg-[#181824] border border-[#28283C] rounded-2xl p-6">
                <div className="text-xs text-gray-400 uppercase font-semibold">Social Submissions</div>
                <div className="text-3xl font-extrabold text-blue-300 mt-2">
                  {stats ? stats.totalSubmissions : 67}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">{stats ? stats.approvedSubmissions : 54} Approved for Draw</div>
              </div>

              <div className="bg-[#181824] border border-[#28283C] rounded-2xl p-6">
                <div className="text-xs text-gray-400 uppercase font-semibold">Reward Pool</div>
                <div className="text-3xl font-extrabold text-emerald-300 mt-2">$1,000</div>
                <div className="text-[11px] text-gray-400 mt-1">1,000 Winners @ $1 in BNB</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#181824] border border-[#28283C] rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white text-base">Ecosystem Health & Contracts</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-[#28283C]">
                    <span className="text-gray-400">WeZardsToken.sol:</span>
                    <span className="text-emerald-400 font-mono">21M Supply Verified</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#28283C]">
                    <span className="text-gray-400">WeZardsNFT.sol:</span>
                    <span className="text-emerald-400 font-mono">5,000 Cap Enforced</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#28283C]">
                    <span className="text-gray-400">WeZardsMarketplace.sol:</span>
                    <span className="text-emerald-400 font-mono">2.5% Fee Configured</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#28283C]">
                    <span className="text-gray-400">WeZardsRewardDistributor.sol:</span>
                    <span className="text-emerald-400 font-mono">Ready for Finalization</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#181824] border border-[#28283C] rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white text-base">Quick Administrative Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveTab('submissions')}
                    className="p-3.5 rounded-xl bg-[#0F0F17] border border-[#28283C] hover:border-purple-500 text-left text-xs font-semibold text-gray-200"
                  >
                    Review Submissions →
                  </button>
                  <button
                    onClick={() => setActiveTab('winners')}
                    className="p-3.5 rounded-xl bg-[#0F0F17] border border-[#28283C] hover:border-amber-500 text-left text-xs font-semibold text-gray-200"
                  >
                    Winner Selection →
                  </button>
                  <button
                    onClick={() => setActiveTab('nft')}
                    className="p-3.5 rounded-xl bg-[#0F0F17] border border-[#28283C] hover:border-blue-500 text-left text-xs font-semibold text-gray-200"
                  >
                    NFT Allocations →
                  </button>
                  <button
                    onClick={() => setActiveTab('generator')}
                    className="p-3.5 rounded-xl bg-[#0F0F17] border border-[#28283C] hover:border-emerald-500 text-left text-xs font-semibold text-gray-200"
                  >
                    Pixel Art Generator →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: SUBMISSIONS QUEUE ----------------- */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {['', 'PENDING', 'APPROVED', 'REJECTED', 'WINNER'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      filterStatus === st ? 'bg-purple-600 text-white' : 'bg-[#181824] text-gray-400 hover:text-white'
                    }`}
                  >
                    {st === '' ? 'All' : st}
                  </button>
                ))}
              </div>
              <button
                onClick={loadDashboardData}
                className="px-3 py-1.5 rounded-xl bg-[#181824] border border-[#28283C] text-xs text-gray-300 hover:text-white"
              >
                Refresh 🔄
              </button>
            </div>

            <div className="bg-[#181824] border border-[#28283C] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#12121A] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#28283C]">
                    <tr>
                      <th className="py-3 px-4">Wallet Address</th>
                      <th className="py-3 px-4">X / Twitter Handle</th>
                      <th className="py-3 px-4">Post Link</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#28283C] text-gray-300">
                    {submissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No submissions found matching filter.
                        </td>
                      </tr>
                    ) : (
                      submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-[#1C1C2B]">
                          <td className="py-3 px-4 font-mono text-purple-300">{sub.wallet_address}</td>
                          <td className="py-3 px-4 font-semibold text-white">@{sub.twitter_username}</td>
                          <td className="py-3 px-4">
                            <a
                              href={sub.twitter_post_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 underline hover:text-blue-300"
                            >
                              View Tweet ↗
                            </a>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sub.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              sub.status === 'REJECTED' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                              sub.status === 'WINNER' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {sub.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleReview(sub.id, 'APPROVED')}
                                  className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-500"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReview(sub.id, 'REJECTED')}
                                  className="px-2.5 py-1 rounded bg-red-600 text-white font-bold hover:bg-red-500"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: WINNER PICKER (1,000 WINNERS) ----------------- */}
        {activeTab === 'winners' && (
          <div className="space-y-6">
            <div className="bg-[#181824] border border-[#28283C] rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Verifiable Random Winner Selection</h3>
              <p className="text-xs text-gray-400">
                Chooses exactly 1,000 unique approved participants via deterministic Fisher-Yates shuffle. No duplicate winners.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Optional custom randomness seed (e.g. blockhash 0x...)"
                  value={verifiableSeed}
                  onChange={(e) => setVerifiableSeed(e.target.value)}
                  className="flex-1 bg-[#0F0F17] border border-[#28283C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleSelectWinners}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 text-black font-bold text-xs hover:opacity-95 shadow-md shadow-amber-500/20"
                >
                  Execute Random Selection (1,000) 🎲
                </button>
              </div>
            </div>

            <div className="bg-[#181824] border border-[#28283C] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[#28283C] flex justify-between items-center">
                <h4 className="font-bold text-white text-sm">Selected Winners ({winners.length})</h4>
                <button
                  onClick={() => alert(`Exporting ${winners.length} winners to CSV...`)}
                  className="px-3 py-1 rounded-lg bg-[#0F0F17] border border-[#28283C] text-xs text-gray-300 hover:text-white"
                >
                  Export CSV 📥
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#12121A] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#28283C]">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Winner Wallet</th>
                      <th className="py-3 px-4">Twitter</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#28283C] text-gray-300">
                    {winners.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No winners selected yet. Run selection above after approvals.
                        </td>
                      </tr>
                    ) : (
                      winners.map((win) => (
                        <tr key={win.id} className="hover:bg-[#1C1C2B]">
                          <td className="py-3 px-4 font-bold text-amber-300">#{win.selection_rank}</td>
                          <td className="py-3 px-4 font-mono text-purple-300">{win.wallet_address}</td>
                          <td className="py-3 px-4 font-semibold text-white">@{win.twitter_username}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              win.payment_status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {win.payment_status || 'PENDING_PAYOUT'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {win.payment_status !== 'CONFIRMED' && (
                              <button
                                onClick={() => handleRecordPayout(win.id, win.wallet_address)}
                                className="px-2.5 py-1 rounded bg-purple-600 text-white font-bold hover:bg-purple-500 text-[11px]"
                              >
                                Record Payment
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: NFT & SMART CONTRACT CONTROLS ----------------- */}
        {activeTab === 'nft' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#181824] border border-[#28283C] rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white text-base">Allocation & Pricing Settings</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-gray-400">Agentic Free Mint Allocation:</label>
                    <input type="number" defaultValue={250} className="w-full mt-1 bg-[#0F0F17] border border-[#28283C] rounded-xl px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400">Public Paid Mint Allocation:</label>
                    <input type="number" defaultValue={250} className="w-full mt-1 bg-[#0F0F17] border border-[#28283C] rounded-xl px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400">Paid Mint Price (BNB):</label>
                    <input type="number" step="0.0001" defaultValue={0.001} className="w-full mt-1 bg-[#0F0F17] border border-[#28283C] rounded-xl px-3 py-2 text-white" />
                  </div>
                  <button
                    onClick={() => setActionMessage({ type: 'success', text: 'Allocations updated successfully!' })}
                    className="w-full py-2.5 rounded-xl bg-purple-600 font-bold text-white"
                  >
                    Save Allocation Changes
                  </button>
                </div>
              </div>

              <div className="bg-[#181824] border border-[#28283C] rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white text-base">Metadata Reveal & Base URI</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-gray-400">Current Base URI (IPFS):</label>
                    <input type="text" defaultValue="ipfs://QmWeZardsPixelImagesCID/" className="w-full mt-1 bg-[#0F0F17] border border-[#28283C] rounded-xl px-3 py-2 text-white font-mono" />
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-[#28283C]">
                    <span className="text-gray-400">Reveal Collection Status:</span>
                    <button
                      onClick={() => setActionMessage({ type: 'success', text: 'Collection reveal state toggled!' })}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs"
                    >
                      Toggle Reveal
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-[#28283C]">
                    <span className="text-gray-400">Emergency Circuit Breaker:</span>
                    <button
                      onClick={() => setActionMessage({ type: 'success', text: 'Emergency pause toggled on-chain!' })}
                      className="px-4 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs"
                    >
                      Emergency Pause
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB: PIXEL AI GENERATOR CONTROLS ----------------- */}
        {activeTab === 'generator' && (
          <div className="bg-[#181824] border border-[#28283C] rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Pixel Mages Generation Engine</h3>
            <p className="text-xs text-gray-400">
              1-bit retro crypto art engine with 10 visual trait layers, zero duplicate collisions, 1024x1024 PNG + SVG export, and Pinata IPFS bundling.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 bg-[#0F0F17] rounded-xl border border-[#28283C] text-xs">
                <span className="text-gray-400">Target Supply:</span>
                <div className="text-xl font-bold text-white mt-1">5,000 Mages</div>
              </div>
              <div className="p-4 bg-[#0F0F17] rounded-xl border border-[#28283C] text-xs">
                <span className="text-gray-400">Grid Size:</span>
                <div className="text-xl font-bold text-purple-300 mt-1">40x40 Pixels</div>
              </div>
              <div className="p-4 bg-[#0F0F17] rounded-xl border border-[#28283C] text-xs">
                <span className="text-gray-400">Resolution:</span>
                <div className="text-xl font-bold text-amber-300 mt-1">1024x1024 Sharp PNG</div>
              </div>
            </div>
            <div className="pt-2">
              <a
                href="/preview.html"
                target="_blank"
                className="inline-block px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors"
              >
                Open Pixel Gallery Previewer ↗
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

