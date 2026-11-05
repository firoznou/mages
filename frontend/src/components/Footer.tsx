import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-mage-border bg-mage-dark text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧙‍♂️</span>
              <span className="font-extrabold text-2xl bg-gradient-to-r from-amber-300 to-purple-400 bg-clip-text text-transparent">
                WeZards
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-sm">
              The premier magical fantasy Web3 ecosystem on BNB Smart Chain. 5,000 unique Mages NFTs, 21,000,000 $WEZ governance tokens, decentralized marketplace, and community reward campaigns.
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold text-purple-300">
              <span className="px-2.5 py-1 rounded-md bg-mage-purple/20 border border-mage-purple/40">
                BNB Chain Mainnet / Testnet
              </span>
              <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300">
                Audited Smart Contracts
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">Ecosystem</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/mint" className="hover:text-amber-300 transition-colors">Mint Portal</Link></li>
              <li><Link href="/explore" className="hover:text-amber-300 transition-colors">Explore Mages</Link></li>
              <li><Link href="/marketplace" className="hover:text-amber-300 transition-colors">NFT Marketplace</Link></li>
              <li><Link href="/rewards" className="hover:text-amber-300 transition-colors">Reward Campaign</Link></li>
              <li><Link href="/tokenomics" className="hover:text-amber-300 transition-colors">$WEZ Tokenomics</Link></li>
            </ul>
          </div>

          {/* Security & Docs */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-amber-300 transition-colors">About WeZards</Link></li>
              <li><Link href="/roadmap" className="hover:text-amber-300 transition-colors">Lore & Roadmap</Link></li>
              <li><a href="https://testnet.bscscan.com" target="_blank" rel="noreferrer" className="hover:text-amber-300 transition-colors">BscScan Explorer ↗</a></li>
              <li><a href="https://ipfs.tech" target="_blank" rel="noreferrer" className="hover:text-amber-300 transition-colors">IPFS Storage ↗</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-mage-border/60 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
          <p>© {new Date().getFullYear()} WeZards Ecosystem. All rights reserved.</p>
          <p className="mt-4 sm:mt-0">Built for the BNB Smart Chain Community.</p>
        </div>
      </div>
    </footer>
  );
}
