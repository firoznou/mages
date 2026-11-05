import React from 'react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
          📜 About the Ecosystem
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          About <span className="bg-gradient-to-r from-amber-300 to-purple-300 bg-clip-text text-transparent">WeZards</span>
        </h1>
        <p className="text-gray-300 max-w-xl mx-auto text-base">
          A production-grade Web3 ecosystem combining retro crypto pixel art, audited smart contracts, and decentralized governance on BNB Smart Chain.
        </p>
      </div>

      <div className="bg-mage-card border border-mage-border rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl leading-relaxed text-gray-300">
        <h2 className="text-2xl font-bold text-white">The Origin Lore</h2>
        <p>
          In the forgotten archives of the blockchain realm, the first Mages gathered to forge a sanctuary of decentralized magic. Channeling the speed and low cost of the BNB Smart Chain, the WeZards universe was conceived as a permanent, immutable bastion of on-chain collectibles.
        </p>
        <p>
          Each Mage is rendered in an iconic 1-bit retro crypto pixel art aesthetic—paying homage to the early pioneers of cypherpunk culture and on-chain art. Spanning 10 distinct visual trait layers, each Mage embodies unique combinations of hats, beards, eyes, robes, and ancient staffs of power.
        </p>
      </div>

      {/* Security Architecture Box */}
      <div className="bg-mage-card border border-mage-border rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl">
        <h2 className="text-2xl font-bold text-white">Security & Code Integrity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-mage-dark rounded-xl border border-mage-border space-y-1">
            <span className="font-bold text-amber-300 text-sm">Hard Supply Caps</span>
            <p className="text-gray-400">Total NFT supply capped strictly at 5,000. $WEZ token supply fixed at 21,000,000 with zero minting functions.</p>
          </div>
          <div className="p-4 bg-mage-dark rounded-xl border border-mage-border space-y-1">
            <span className="font-bold text-purple-300 text-sm">2-Step Ownership</span>
            <p className="text-gray-400">OpenZeppelin Ownable2Step prevents accidental ownership loss through pending owner confirmations.</p>
          </div>
          <div className="p-4 bg-mage-dark rounded-xl border border-mage-border space-y-1">
            <span className="font-bold text-emerald-300 text-sm">Reentrancy Protection</span>
            <p className="text-gray-400">Strict Checks-Effects-Interactions (CEI) pattern and ReentrancyGuard on minting, marketplace, and payouts.</p>
          </div>
          <div className="p-4 bg-mage-dark rounded-xl border border-mage-border space-y-1">
            <span className="font-bold text-blue-300 text-sm">Cryptographic Verification</span>
            <p className="text-gray-400">EIP-712 ECDSA backend signature verification ensures only eligible Binance Agentic Wallets can claim free mints.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

