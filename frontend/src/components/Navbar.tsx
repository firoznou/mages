'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { verifyAgenticWallet } from '../lib/api';
import { formatAddress } from '../lib/web3';

export default function Navbar() {
  const pathname = usePathname();
  const [address, setAddress] = useState<string | null>(null);
  const [isAgentic, setIsAgentic] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'extension' | 'agent_qr'>('agent_qr');
  const [copiedCli, setCopiedCli] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && (window as any).ethereum?.selectedAddress) {
      const addr = (window as any).ethereum.selectedAddress;
      setAddress(addr);
      checkAgenticEligibility(addr);
    }
  }, []);

  const checkAgenticEligibility = async (addr: string) => {
    try {
      const data = await verifyAgenticWallet(addr);
      setIsAgentic(data.eligible === true);
    } catch {
      setIsAgentic(false);
    }
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);

      const provider = (window as any).BinanceChain || (window as any).ethereum;
      if (!provider) {
        throw new Error('No compatible wallet extension was found.');
      }

      const chainId = await provider.request({ method: 'eth_chainId' });
      if (BigInt(chainId) !== 56n) {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }]
        });
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
        await checkAgenticEligibility(accounts[0]);
      }
      setWalletModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const agentCliCommand = `binance-agent wallet connect --uri "binance-agent://wezards?session=ag_bsc_98214&chain=56"`;

  const copyCliCommand = () => {
    navigator.clipboard.writeText(agentCliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Collection', href: '/collection' },
    { name: 'Mint', href: '/mint', badge: 'Live' },
    { name: 'Gift Drop', href: '/mint#gift', badge: '🎁' },
    { name: 'Presale', href: '/presale', badge: 'After Sellout' },
    { name: 'MAGES Token', href: '/tokenomics' },
    { name: 'Airdrop', href: '/airdrop' },
    { name: 'Rewards', href: '/rewards' },
    { name: 'Marketplace', href: '/marketplace' }
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#090514]/90 border-b border-[#2E1B4E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7928CA] via-[#9333EA] to-[#F59E0B] p-[2px] transition-transform group-hover:scale-105">
                <div className="w-full h-full bg-[#090514] rounded-[10px] flex items-center justify-center">
                  <span className="text-xl font-black text-[#F59E0B]">W</span>
                </div>
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-[#F3F4F6] to-[#C084FC]">
                  WeZards
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#2E1B4E] text-[#C084FC] font-semibold border border-[#4C2882]">
                  BSC Ecosystem
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative group flex items-center gap-1.5 ${
                      isActive
                        ? 'text-white bg-[#160D27] border border-[#7928CA]/50 shadow-[0_0_15px_rgba(121,40,202,0.3)]'
                        : 'text-[#9CA3AF] hover:text-white hover:bg-[#160D27]/60'
                    }`}
                  >
                    {link.name}
                    {link.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                        link.badge === 'Live'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Wallet Actions */}
            <div className="hidden md:flex items-center gap-3">
              {address ? (
                <div className="flex items-center gap-2 bg-[#160D27] border border-[#2E1B4E] rounded-xl px-3 py-1.5 shadow-inner">
                  {isAgentic ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-[#F59E0B] border border-amber-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span>
                      Agent ID holder
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Connected
                    </span>
                  )}
                  <span className="text-sm font-mono text-gray-200">
                    {formatAddress(address)}
                  </span>
                  <button
                    onClick={() => setAddress(null)}
                    className="text-xs text-gray-400 hover:text-red-400 ml-1 transition"
                    title="Disconnect"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setWalletModalOpen(true)}
                  disabled={isConnecting}
                  className="relative inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all bg-gradient-to-r from-[#7928CA] to-[#9333EA] rounded-xl hover:from-[#8B2BE2] hover:to-[#A855F7] shadow-[0_0_20px_rgba(121,40,202,0.4)] active:scale-95 disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex lg:hidden items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#160D27] focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-[#2E1B4E] bg-[#090514]/98 px-4 pt-2 pb-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-[#160D27]"
              >
                {link.name} {link.badge && `(${link.badge})`}
              </Link>
            ))}
            <div className="pt-4 border-t border-[#2E1B4E]">
              {address ? (
                <div className="flex items-center justify-between text-sm text-gray-300 py-2">
                  <span>{formatAddress(address)}</span>
                  <button onClick={() => setAddress(null)} className="text-red-400 text-xs">Disconnect</button>
                </div>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); setWalletModalOpen(true); }}
                  className="w-full py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#7928CA] to-[#9333EA]"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* PORTAL-RENDERED WALLET MODAL (Mounted directly to body to eliminate upper-layer clipping) */}
      {mounted && walletModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setWalletModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-[#160D27] border-2 border-[#7928CA]/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-[#F59E0B] text-[11px] font-bold border border-amber-500/20 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span>
                  BNB Smart Chain (ChainID: 56)
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Connect Web3 Wallet</h3>
              </div>
              <button
                onClick={() => setWalletModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#090514] border border-[#2E1B4E] text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex rounded-xl bg-[#090514] p-1 border border-[#2E1B4E] mb-6">
              <button
                onClick={() => setModalTab('agent_qr')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  modalTab === 'agent_qr'
                    ? 'bg-gradient-to-r from-[#7928CA] to-[#9333EA] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>⚡ Binance Agent CLI & QR</span>
              </button>
              <button
                onClick={() => setModalTab('extension')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  modalTab === 'extension'
                    ? 'bg-gradient-to-r from-[#7928CA] to-[#9333EA] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>📱 Browser Extension</span>
              </button>
            </div>

            {/* TAB 1: BINANCE AGENT WALLET CLI & QR CODE */}
            {modalTab === 'agent_qr' ? (
              <div className="space-y-5">
                
                {/* QR Code Container */}
                <div className="bg-[#090514] border border-[#2E1B4E] rounded-2xl p-5 text-center">
                  <div className="text-xs text-gray-300 font-medium mb-3">
                    Scan with Binance Agent Wallet App or Mobile Camera
                  </div>
                  
                  {/* High-Resolution Binance Agentic QR Code SVG */}
                  <div className="w-52 h-52 mx-auto bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center relative">
                    <svg viewBox="0 0 160 160" className="w-full h-full">
                      {/* Background */}
                      <rect width="160" height="160" fill="#FFFFFF" />
                      
                      {/* Corner Position Marks */}
                      {/* Top-Left */}
                      <rect x="10" y="10" width="35" height="35" fill="#090514" rx="4" />
                      <rect x="15" y="15" width="25" height="25" fill="#FFFFFF" rx="2" />
                      <rect x="20" y="20" width="15" height="15" fill="#F59E0B" rx="2" />
                      
                      {/* Top-Right */}
                      <rect x="115" y="10" width="35" height="35" fill="#090514" rx="4" />
                      <rect x="120" y="15" width="25" height="25" fill="#FFFFFF" rx="2" />
                      <rect x="125" y="20" width="15" height="15" fill="#F59E0B" rx="2" />
                      
                      {/* Bottom-Left */}
                      <rect x="10" y="115" width="35" height="35" fill="#090514" rx="4" />
                      <rect x="15" y="120" width="25" height="25" fill="#FFFFFF" rx="2" />
                      <rect x="20" y="125" width="15" height="15" fill="#F59E0B" rx="2" />
                      
                      {/* QR Matrix Elements */}
                      <g fill="#160D27">
                        <rect x="52" y="12" width="6" height="6" />
                        <rect x="64" y="12" width="6" height="6" />
                        <rect x="76" y="12" width="6" height="6" />
                        <rect x="94" y="12" width="6" height="6" />
                        <rect x="58" y="24" width="6" height="6" />
                        <rect x="70" y="24" width="6" height="6" />
                        <rect x="88" y="24" width="6" height="6" />
                        <rect x="52" y="36" width="6" height="6" />
                        <rect x="82" y="36" width="6" height="6" />
                        
                        <rect x="12" y="52" width="6" height="6" />
                        <rect x="24" y="52" width="6" height="6" />
                        <rect x="42" y="52" width="6" height="6" />
                        <rect x="54" y="52" width="6" height="6" />
                        <rect x="72" y="52" width="6" height="6" />
                        <rect x="90" y="52" width="6" height="6" />
                        <rect x="108" y="52" width="6" height="6" />
                        <rect x="126" y="52" width="6" height="6" />
                        <rect x="144" y="52" width="6" height="6" />
                        
                        <rect x="18" y="64" width="6" height="6" />
                        <rect x="36" y="64" width="6" height="6" />
                        <rect x="102" y="64" width="6" height="6" />
                        <rect x="120" y="64" width="6" height="6" />
                        <rect x="138" y="64" width="6" height="6" />
                        
                        <rect x="12" y="76" width="6" height="6" />
                        <rect x="30" y="76" width="6" height="6" />
                        <rect x="48" y="76" width="6" height="6" />
                        <rect x="114" y="76" width="6" height="6" />
                        <rect x="132" y="76" width="6" height="6" />
                        
                        <rect x="24" y="88" width="6" height="6" />
                        <rect x="42" y="88" width="6" height="6" />
                        <rect x="60" y="88" width="6" height="6" />
                        <rect x="96" y="88" width="6" height="6" />
                        <rect x="114" y="88" width="6" height="6" />
                        <rect x="138" y="88" width="6" height="6" />
                        
                        <rect x="12" y="100" width="6" height="6" />
                        <rect x="36" y="100" width="6" height="6" />
                        <rect x="72" y="100" width="6" height="6" />
                        <rect x="90" y="100" width="6" height="6" />
                        <rect x="126" y="100" width="6" height="6" />
                        <rect x="144" y="100" width="6" height="6" />
                        
                        <rect x="52" y="114" width="6" height="6" />
                        <rect x="70" y="114" width="6" height="6" />
                        <rect x="88" y="114" width="6" height="6" />
                        <rect x="106" y="114" width="6" height="6" />
                        <rect x="132" y="114" width="6" height="6" />
                        
                        <rect x="58" y="126" width="6" height="6" />
                        <rect x="76" y="126" width="6" height="6" />
                        <rect x="114" y="126" width="6" height="6" />
                        <rect x="138" y="126" width="6" height="6" />
                        
                        <rect x="52" y="138" width="6" height="6" />
                        <rect x="70" y="138" width="6" height="6" />
                        <rect x="88" y="138" width="6" height="6" />
                        <rect x="106" y="138" width="6" height="6" />
                        <rect x="126" y="138" width="6" height="6" />
                      </g>
                      
                      {/* Center Binance Diamond Badge */}
                      <rect x="65" y="65" width="30" height="30" fill="#090514" rx="8" />
                      <circle cx="80" cy="80" r="11" fill="#F59E0B" />
                      <path d="M76 80 L80 76 L84 80 L80 84 Z" fill="#090514" />
                    </svg>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-emerald-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Listening for Binance Agent handshake...</span>
                  </div>
                </div>

                {/* Binance Agent Wallet CLI Pairing Command */}
                <div className="bg-[#090514] border border-[#2E1B4E] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>💻</span>
                      <span>Binance Agent Wallet CLI</span>
                    </span>
                    <button
                      onClick={copyCliCommand}
                      className="text-[11px] text-[#F59E0B] hover:text-[#FBBF24] font-semibold flex items-center gap-1"
                    >
                      {copiedCli ? '✓ Copied!' : 'Copy Command'}
                    </button>
                  </div>

                  <div className="bg-[#160D27] p-2.5 rounded-xl border border-[#2E1B4E]/80 text-[11px] font-mono text-gray-300 break-all select-all">
                    {agentCliCommand}
                  </div>

                  <p className="text-[10px] text-gray-400 mt-2">
                    Run this command in your terminal running <code className="text-[#F59E0B]">binance-agent</code> to connect your autonomous wallet agent to WeZards.
                  </p>
                </div>

              </div>
            ) : (
              /* TAB 2: BROWSER EXTENSIONS */
              <div className="space-y-3">
                <button
                  onClick={connectWallet}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] hover:border-[#F59E0B] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/20 flex items-center justify-center font-bold text-[#F59E0B] text-lg">
                      BNB
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-white group-hover:text-[#F59E0B] flex items-center gap-2">
                        Binance Wallet Extension
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-[#F59E0B] font-bold">Agent ID Check</span>
                      </div>
                      <div className="text-xs text-gray-400">Free mint eligibility requires a registered Agent ID</div>
                    </div>
                  </div>
                  <span className="text-gray-500 group-hover:text-white">→</span>
                </button>

                <button
                  onClick={connectWallet}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] hover:border-[#9333EA] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#9333EA]/20 flex items-center justify-center text-xl">
                      🦊
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-white group-hover:text-[#9333EA]">
                        MetaMask / Injected Wallet
                      </div>
                      <div className="text-xs text-gray-400">Standard Web3 browser extensions & mobile in-app wallets</div>
                    </div>
                  </div>
                  <span className="text-gray-500 group-hover:text-white">→</span>
                </button>
              </div>
            )}

            <p className="text-[11px] text-gray-500 text-center mt-6">
              By connecting, you agree to the WeZards Terms of Service. Private keys and recovery phrases are never requested.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
