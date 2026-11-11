# WeZards MAGES NFT Airdrop + Public Token Presale Integration Guide

**Network:** BNB Smart Chain Mainnet (`Chain ID: 56`)  
**Ecosystem Website:** https://wezards.bunink.xyz/

---

## 1. Verified Smart Contracts

| Entity | Address | Explorer Link | Notes |
|---|---|---|---|
| **MAGES ERC-20** | `0xE12A32c9E92f0584ede944465960D97238013107` | [BscScan](https://bscscan.com/token/0xE12A32c9E92f0584ede944465960D97238013107) | 18 decimals, fixed supply caps |
| **WeZards ERC-721** | `0xe4d7Ec33Fcf7D93cBE7F4D46d0ef35F437956aab` | [BscScan](https://bscscan.com/token/0xe4d7Ec33Fcf7D93cBE7F4D46d0ef35F437956aab) | Max supply 5,000, 2,556 minted |
| **MAGES Airdrop** | `0x7B88a86FAf66ea06df05A89EEda19B09A9C4b90B` | [BscScan](https://bscscan.com/address/0x7B88a86FAf66ea06df05A89EEda19B09A9C4b90B) | Merkle proof verification contract |
| **MAGES Presale** | `0x3D8e948618B55b343ea1397D8CBc5276e8B9FC75` | [BscScan](https://bscscan.com/address/0x3D8e948618B55b343ea1397D8CBc5276e8B9FC75) | Chainlink oracle integrated BNB & USDT purchases |
| **Chainlink BNB/USD** | `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE` | [BscScan](https://bscscan.com/address/0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE) | Official BSC aggregator (8 decimals) |
| **Chainlink USDT/USD** | `0xB97Ad0E74fa7d920791E90258A6E2085088b4320` | [BscScan](https://bscscan.com/address/0xB97Ad0E74fa7d920791E90258A6E2085088b4320) | Official BSC aggregator (8 decimals) |
| **USDT Token (BSC)** | `0x55d398326f99059fF775485246999027B3197955` | [BscScan](https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955) | 18 decimals on BNB Smart Chain |
| **Treasury Wallet** | `0xffa81f63219c75ea7312685d85ab11A4F092Bc31` | [BscScan](https://bscscan.com/address/0xffa81f63219c75ea7312685d85ab11A4F092Bc31) | Presale Owner / Fund Recipient |

---

## 2. Integrated Web Routes

- **`/mages`**: Unified MAGES Hub showing connected wallet balances (MAGES, WeZards NFTs, BNB, USDT), airdrop eligibility summary, presale status, recent on-chain transfers, and contract references.
- **`/mages/airdrop`**: Official holder airdrop claiming interface supporting MetaMask and EVM Web3 wallets. Displays protocol stats, user token IDs with on-chain claim status (`isTokenClaimed`), Merkle proof details, and dual claim execution (`claimExisting` and `claimFuture`).
- **`/mages/presale`**: Interactive public token presale with live Chainlink price feeds ($0.0034/MAGES, minimum purchase $10 USD). Includes live purchase calculator, 2% slippage protection, two-step USDT approval flow, and real-time validation against remaining allocation.
- **`/admin/mages`**: Protected contract owner dashboard that strictly validates connected wallet against on-chain `owner()` methods. Allows setting Merkle roots, finalizing eligibility, pausing/unpausing, starting/ending presales, and executing withdrawals with confirmation dialogs.
- **`/airdrop` & `/presale`**: Backward-compatible redirects seamlessly routing legacy visitors to the official `/mages/airdrop` and `/mages/presale` pages.

---

## 3. Merkle Leaf Specifications & Proof Engine

### Phase A — Existing Snapshot
```solidity
keccak256(abi.encode(
  uint256 chainId,         // 56
  address airdropAddress,  // 0x7B88a86FAf66ea06df05A89EEda19B09A9C4b90B
  uint8   phase,           // 0 (EXISTING_PHASE)
  uint256 tokenId,         // 1 to 2,556
  address beneficiary,     // Snapshot token owner
  uint256 rewardPerNFT     // 1000 * 10^18
))
```

- **Snapshot File:** `frontend/src/data/merkle/snapshot_phase_a.json` (2,556 tokens)
- **Phase A Merkle Root:** `0xfb347226c6c8d7e1a3d3467ef6b8ffc1c53e1b31c2fec531168e92f142db9f2c`
- **Proof Registry:** `frontend/src/data/merkle/merkle_phase_a_proofs.json` (2,528 unique wallets)

### Phase B — Future Minters
```solidity
keccak256(abi.encode(
  uint256 chainId,         // 56
  address airdropAddress,  // 0x7B88a86FAf66ea06df05A89EEda19B09A9C4b90B
  uint8   phase,           // 1 (FUTURE_PHASE)
  uint256 epoch,           // Epoch index (e.g. 1, 2, ...)
  uint256 tokenId,         // Newly minted token ID
  address beneficiary,     // Original minter
  uint256 rewardPerNFT     // 1000 * 10^18
))
```

- Proof hashing uses standard OpenZeppelin sorted-pair hashing (`a < b ? keccak(a, b) : keccak(b, a)`).

---

## 4. Contract Administration Guide

To initialize or administer the contracts, connect to `/admin/mages` using the owner wallet:

### Initializing Airdrop Phase A Root:
1. Connect with Airdrop Owner (`0x96795e12Db64b184B5F290f11D76B1DCf30910C5`).
2. Navigate to `/admin/mages`.
3. Under **Set Phase A Snapshot Merkle Root**, click **✦ Auto-Fill Generated Snapshot**.
   - Root: `0xfb347226c6c8d7e1a3d3467ef6b8ffc1c53e1b31c2fec531168e92f142db9f2c`
   - Eligible Count: `2556`
4. Click **Set Phase A Merkle Root** and confirm the transaction in MetaMask.
5. Users can immediately claim rewards at `/mages/airdrop`.

### Activating the Presale:
1. Connect with Presale Owner / Treasury (`0xffa81f63219c75ea7312685d85ab11A4F092Bc31`).
2. Navigate to `/admin/mages`.
3. Under **Presale Lifecycle Controls**, click **🚀 Start Public Presale**.
4. Confirm in MetaMask. The 30-day presale timer begins and purchases open.

---

## 5. Scripts

- `scripts/generate-snapshot.js`: Queries the official WeZards NFT contract on BSC Mainnet via multicall to generate `snapshot_phase_a.json`.
- `scripts/build-merkle-registry.js`: Builds the OpenZeppelin-compatible Merkle tree and generates proof lookups for all snapshot wallets.
- `scripts/generate-phase-b.js`: Incrementally processes future minters, checks the permanent token registry to prevent duplicate claims, and generates epoch Merkle roots.
