# WeZards Web3 Ecosystem - Architecture & Specification

## 1. Executive Summary
**WeZards** is a production-grade Web3 ecosystem deployed on the **BNB Smart Chain (BSC)**. The ecosystem comprises:
- An **ERC-20 Governance & Utility Token** ($WEZ) with a fixed supply of 21,000,000 tokens.
- An **ERC-721 NFT Collection** ("WeZards: Magical Mages") strictly capped at 5,000 NFTs, featuring a Binance Agentic Wallet free-mint tier (250 allocations), a public paid-mint tier (250 allocations @ 0.001 BNB), and configurable reserve allocations.
- A **Decentralized NFT Marketplace** supporting peer-to-peer listing, purchasing, delisting, and marketplace fee management with full reentrancy protection.
- An **AI-Powered 10-Layer NFT Generation Engine** delivering 5,000 unique Mages in 3D Cartoon + Magical Fantasy + Luxury Wizard aesthetic, with deterministic generation, duplicate hashing, rarity calculation, and IPFS packaging.
- A **High-Performance Cloudflare Workers & D1 SQL Backend** featuring 15 relational tables, Argon2id/bcrypt admin authentication, rate limiting, and Binance Agentic Wallet signature verification.
- A **Community Reward Campaign Engine** distributing $1,000 worth of BNB across 1,000 verified winners using a transparent, verifiable random selection mechanism upon mint completion.
- A **Public dApp** (Next.js + Tailwind CSS) with a dark magical fantasy aesthetic.
- A **Completely Decoupled Admin Dashboard** with no public references, guarded by secure HTTP-only session cookies and brute-force defenses.

---

## 2. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 USER LAYER                                        |
|  +-------------------------------------+   +------------------------------------+ |
|  |     Public dApp (Next.js)           |   |    Admin Dashboard (Next.js)       | |
|  |     wezards.pages.dev               |   |    wezards-admin.pages.dev         | |
|  |  * Minting Portal                   |   |  * Submissions Verification Queue  | |
|  |  * NFT Marketplace                  |   |  * Verifiable Winner Picker (1,000)| |
|  |  * Rewards Campaign & Explorer      |   |  * AI NFT Generation Controller    | |
|  |  * Binance Agentic Wallet Connect   |   |  * Smart Contract Emergency Pause  | |
|  +------------------+------------------+   +-----------------+------------------+ |
+---------------------|----------------------------------------|--------------------+
                      |                                        |
                      | HTTPS / REST                           | HTTPS / REST (Auth Cookie)
                      v                                        v
+-----------------------------------------------------------------------------------+
|                        CLOUDFLARE EDGE BACKEND (WORKERS)                          |
|  * Auth Guard (Argon2id / JWT Sessions / Rate Limiter)                            |
|  * Binance Agentic Wallet Verifier & EIP-712 Mint Signer                          |
|  * Social Submissions API (Twitter Post Submissions & Status Tracking)            |
|  * Random Winner Selection Algorithm (Verifiable multi-seed PRNG)                 |
|  * IPFS Pinata Gateway Proxy & Metadata Delivery                                  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                    CLOUDFLARE D1 (Relational SQLite)                        |  |
|  |  users | wallets | nfts | nft_metadata | mint_txs | token_txs | submissions  |  |
|  |  reward_entries | reward_winners | reward_payments | admin_users | logs     |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                      |                                        |
                      v Web3 RPC (EIP-1193 / Viem / Wagmi)    v On-chain Read/Write
+-----------------------------------------------------------------------------------+
|                       BNB SMART CHAIN MAINNET (BSC - ChainID 56)                   |
|                                                                                   |
|  +--------------------+   +--------------------+   +---------------------------+  |
|  |  WeZardsToken.sol  |   |   WeZardsNFT.sol   |   |  WeZardsMarketplace.sol   |  |
|  |  ERC-20            |   |   ERC-721          |   |  Listing, Delist, Buy     |  |
|  |  21M Fixed Supply  |   |   5,000 Hard Cap   |   |  Non-reentrant Escrow     |  |
|  |  Pausable, Owner   |   |   Agentic Free/Paid|   |  Configurable Protocol Fee|  |
|  +--------------------+   +--------------------+   +---------------------------+  |
|                                     |                                             |
|                                     v                                             |
|                   +------------------------------------+                          |
|                   |    WeZardsRewardDistributor.sol    |                          |
|                   |    Verifiable $1,000 BNB Pool      |                          |
|                   |    Batch Distribution to Winners   |                          |
|                   +------------------------------------+                          |
+-----------------------------------------------------------------------------------+
```

---

## 3. Component Details & Security Model

### 3.1 Smart Contracts (Foundry)
1. **`WeZardsToken.sol`**:
   - Total supply capped strictly at 21,000,000 tokens (18 decimals).
   - Entire supply minted upon deployment to designated multi-sig/treasury distribution wallet. No further minting functions exist.
   - Built on OpenZeppelin contracts with `Pausable` for emergency circuit-breaker capability.
   
2. **`WeZardsNFT.sol`**:
   - Total supply hard-capped at 5,000 tokens.
   - Allocation tiers:
     - `AGENTIC_FREE_ALLOCATION`: 250 NFTs (free mint for verified Binance Agentic Wallets).
     - `PUBLIC_PAID_ALLOCATION`: 250 NFTs (0.001 BNB each).
     - Remaining 4,500 NFTs: configurable reserved batches for future game expansion and staking rewards.
   - Binance Agentic Wallet verification via backend cryptographic ECDSA signature (EIP-712 structured hash) preventing unauthorized free mints and sybil attacks.
   - Reveal mechanism with `unrevealedURI` placeholder and `baseURI` switcher.
   - Withdraw mechanism restricted strictly to `owner()` with reentrancy protection.

3. **`WeZardsMarketplace.sol`**:
   - Direct escrow or approved-transfer listing mechanism.
   - Seller price configuration in BNB.
   - Protocol fee percentage (default 2.5%, max cap 10%).
   - ReentrancyGuard on listing, purchasing, and fee updates.

4. **`WeZardsRewardDistributor.sol`**:
   - Funded with BNB equivalent to $1,000 (calculated via Chainlink or fixed oracle snapshot).
   - Activated only when the designated token/NFT supply milestones are reached.
   - Executes batched distributions to the 1,000 approved winners.
   - Emits structured events with transaction verification hashes.

### 3.2 AI NFT Generation Engine (`generator/`)
- 10 distinct layer groups: Background, Body, Eyes, Hair, Headwear, Clothing, Magic Power, Weapons, Accessories, Special Effects.
- Strict duplicate collision resolution (SHA-256 fingerprinting of combined trait properties).
- Five rarity tiers:
  - Common: ~45%
  - Uncommon: ~25%
  - Rare: ~18%
  - Epic: ~9%
  - Legendary: ~3%
- Deterministic random seed support.
- Checkpoint persistence in `progress.json` allows resumption without duplicate generation.
- Full IPFS Pinata bundle preparation.

### 3.3 Database & Cloudflare Workers Backend
- D1 SQLite schema with ACID guarantees and foreign key constraints.
- Admin sessions use secure HTTP-only cookies with TTL and brute-force IP rate limiting.
- Anti-duplicate submission constraint: 1 submission per unique wallet address.
- Status transition pipeline: `PENDING` -> `APPROVED` / `REJECTED` -> `WINNER` -> `PAID`.
