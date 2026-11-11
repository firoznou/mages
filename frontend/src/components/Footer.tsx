'use client';

import React from 'react';
import Link from 'next/link';
import { CONTRACT_ADDRESSES } from '../lib/web3';

export default function Footer() {
  return (
    <footer className="bg-[#06030D] border-t border-[#2E1B4E]/80 text-[#9CA3AF] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          
          {/* Brand Info */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7928CA] to-[#F59E0B] p-[2px] shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-transform group-hover:scale-105">
                <img
                  src="https://assets.bunink.xyz/images/1.png"
                  alt="WeZards Logo"
                  className="w-full h-full rounded-[9px] bg-[#090514] object-contain p-0.5 pixelated"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <span className="text-2xl font-extrabold text-white tracking-wider">WeZards</span>
            </Link>
            <p className="text-sm text-[#9CA3AF] max-w-sm mb-6 leading-relaxed">
              The premier fantasy wizard Web3 ecosystem on BNB Smart Chain. 5,000 retro 8-bit collectible NFTs, fixed-cap MAGES tokenomics, and decentralized presale protocols.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#160D27] border border-[#2E1B4E] text-amber-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                BNB Smart Chain (ChainID: 56)
              </span>
              <a
                href="https://x.com/nfthunter_wp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#24133D] hover:bg-[#341B55] border border-[#2E1B4E] text-purple-200 transition"
              >
                <span>X / Twitter</span>
                <span>@nfthunter_wp ↗</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Ecosystem</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/collection" className="hover:text-white transition">NFT Collection</Link></li>
              <li><Link href="/mint" className="hover:text-white transition">Minting Portal</Link></li>
              <li><Link href="/mages/airdrop" className="hover:text-white transition text-emerald-400 font-semibold">MAGES Airdrop</Link></li>
              <li><Link href="/mages/presale" className="hover:text-white transition text-amber-400 font-semibold">MAGES Presale</Link></li>
              <li><Link href="/mages" className="hover:text-white transition">MAGES Dashboard</Link></li>
              <li><Link href="/rewards" className="hover:text-white transition">Token Claiming (Fixed)</Link></li>
              <li><Link href="/tokenomics" className="hover:text-white transition">Tokenomics</Link></li>
            </ul>
          </div>

          {/* Contract Addresses */}
          <div className="lg:col-span-2">
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Verified Smart Contracts</h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#0E071A] border border-[#2E1B4E]/60">
                <div className="text-gray-400 flex justify-between">
                  <span>WeZards NFT (ERC-721):</span>
                  <span className="text-emerald-400">5,000 Cap</span>
                </div>
                <a
                  href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.NFT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-emerald-400 truncate block transition"
                  title="View WeZards NFT on BscScan"
                >
                  {CONTRACT_ADDRESSES.NFT}
                </a>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0E071A] border border-[#2E1B4E]/60">
                <div className="text-gray-400 flex justify-between">
                  <span>MAGES Token (ERC-20):</span>
                  <span className="text-amber-400">21,000,000 Cap</span>
                </div>
                <a
                  href={`https://bscscan.com/token/${CONTRACT_ADDRESSES.TOKEN}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#F59E0B] truncate block transition"
                  title="View MAGES Token on BscScan"
                >
                  {CONTRACT_ADDRESSES.TOKEN}
                </a>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0E071A] border border-[#2E1B4E]/60">
                <div className="text-gray-400 flex justify-between">
                  <span>MAGES Airdrop Contract:</span>
                  <span className="text-emerald-400">4,000,000 Allocation</span>
                </div>
                <a
                  href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.AIRDROP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-emerald-400 truncate block transition"
                  title="View MAGES Airdrop on BscScan"
                >
                  {CONTRACT_ADDRESSES.AIRDROP}
                </a>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0E071A] border border-[#2E1B4E]/60">
                <div className="text-gray-400 flex justify-between">
                  <span>MAGES Presale Contract:</span>
                  <span className="text-purple-400">$0.0034 / MAGES</span>
                </div>
                <a
                  href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.PRESALE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-purple-400 truncate block transition"
                  title="View MAGES Presale on BscScan"
                >
                  {CONTRACT_ADDRESSES.PRESALE}
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#2E1B4E]/60 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} WeZards Core Architecture. All smart contracts audited and open-source.</p>
          <div className="flex gap-6">
            <span className="hover:text-gray-400 transition cursor-pointer">Security Policy</span>
            <span className="hover:text-gray-400 transition cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-400 transition cursor-pointer">BscScan Verified</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
