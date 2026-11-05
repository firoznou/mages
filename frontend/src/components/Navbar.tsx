'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { connectBinanceWallet, switchToBSC, getWalletProvider } from '../lib/web3';

export default function Navbar() {
  const pathname = usePathname();
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isAgentic, setIsAgentic] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if wallet is already connected
    const provider = getWalletProvider();
    if (provider && provider.selectedAddress) {
      setAddress(provider.selectedAddress);
      setIsAgentic(!!(provider.isBinanceAgentic || provider.isAgentic));
    }
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const conn = await connectBinanceWallet();
      setAddress(conn.address);
      setChainId(conn.chainId);
      setIsAgentic(conn.isAgentic);

      if (conn.chainId !== 97 && conn.chainId !== 56) {
        await switchToBSC(97); // Switch to BSC Testnet by default
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Explore', href: '/explore' },
    { name: 'Mint', href: '/mint' },
    { name: 'Marketplace', href: '/marketplace' },
    { name: 'Rewards', href: '/rewards' },
    { name: 'Tokenomics', href: '/tokenomics' },
    { name: 'Roadmap', href: '/roadmap' },
    { name: 'About', href: '/about' },
  ];

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-mage-dark/90 border-b border-mage-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-mage-purple to-mage-gold flex items-center justify-center p-0.5 shadow-lg shadow-mage-purple/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-mage-dark rounded-[10px] flex items-center justify-center text-xl">
                🧙‍♂️
              </div>
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-amber-300 via-purple-300 to-amber-200 bg-clip-text text-transparent">
                WeZards
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-mage-purple/30 text-purple-300 border border-mage-purple/50">
                BNB Chain
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'text-amber-300 bg-mage-card border border-mage-border shadow-sm shadow-mage-purple/20'
                      : 'text-gray-300 hover:text-white hover:bg-mage-card/50'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Wallet Connect & Actions */}
          <div className="flex items-center gap-3">
            {address ? (
              <div className="flex items-center gap-2 bg-mage-card border border-mage-border rounded-xl px-3.5 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-sm font-mono text-gray-200">{formatAddress(address)}</span>
                {isAgentic && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Agentic
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="relative group overflow-hidden rounded-xl p-px font-semibold text-sm transition-all shadow-lg shadow-mage-purple/25 hover:shadow-mage-gold/25"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-mage-purple via-mage-gold to-mage-purple rounded-xl group-hover:scale-105 transition-transform duration-300"></div>
                <div className="relative px-4 py-2 bg-mage-dark rounded-[11px] transition-colors group-hover:bg-opacity-80 flex items-center gap-2 text-white">
                  <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                </div>
              </button>
            )}

            {/* Mobile menu toggle button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-mage-card"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-mage-border bg-mage-dark/95 px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-base font-medium ${
                pathname === link.href
                  ? 'text-amber-300 bg-mage-card border border-mage-border'
                  : 'text-gray-300 hover:text-white hover:bg-mage-card/50'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
