# WeZards Web3 Ecosystem - Production Deployment Guide

This guide covers deploying the **WeZards** web3 ecosystem to **BNB Smart Chain Mainnet** (chain ID `56`). The deployment script refuses to run on other chains.

---

## 1. Prerequisites & Environment Setup

Ensure the following tools are installed:
- **Node.js** (v20+ or v26+)
- **Foundry** (`forge`, `cast`)
- **Cloudflare Wrangler CLI** (`npm i -g wrangler`)

### Configuration Template (`.env`)
Create a `.env` file in the project root:
```env
# Blockchain RPC & Keys
BSC_RPC_URL=https://bsc-dataseed.bnbchain.org
PRIVATE_KEY=your_deployer_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here

# Addresses (populated post-deployment)
NEXT_PUBLIC_WEZARDS_TOKEN_ADDRESS=
NEXT_PUBLIC_WEZARDS_NFT_ADDRESS=
NEXT_PUBLIC_WEZARDS_MARKETPLACE_ADDRESS=
NEXT_PUBLIC_WEZARDS_REWARD_DISTRIBUTOR_ADDRESS=

# Network
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_RPC_URL=https://bsc-dataseed.bnbchain.org
SPACE_ID_AGENT_ID_REGISTRY=0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F

# Backend & Admin Secrets
NEXT_PUBLIC_API_URL=https://wezards-api.workers.dev
ADMIN_INITIAL_USERNAME=wezards_admin
ADMIN_INITIAL_PASSWORD=use-a-unique-secret
ADMIN_JWT_SECRET=generate-a-random-secret-at-least-32-characters

# IPFS Pinata
PINATA_JWT=your_pinata_jwt_token_here
```

---

## 2. Smart Contracts Deployment (Foundry)

### 2.1 Run Automated Tests First
```bash
forge test --root contracts -vvv
```
All unit and integration tests must pass with 0 failures before deployment.

### 2.2 Deploy to BNB Smart Chain Mainnet
```bash
forge script contracts/script/DeployWeZards.s.sol:DeployWeZards \
  --rpc-url $BSC_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  -vvvv
```

The script deploys the ecosystem and configures the NFT contract to use the verified SPACE ID Agent ID registry. It outputs the deployed contract addresses:
- `WeZardsToken`
- `WeZardsNFT`
- `WeZardsMarketplace`

Record the NFT and token addresses in `.env` and configure `NEXT_PUBLIC_CHAIN_ID=56` in the frontend build environment. The NFT contract is not upgradeable; existing deployments do not gain this integration from a source change.

### 2.3 Agent ID integration and transaction commands

SPACE ID's [official Agent ID documentation](https://docs.space.id/agent-id) lists `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` as the BNB Mainnet registry and defines `handleOf(address)` and `ownerOfHandle(string)`. WeZards checks `handleOf(msg.sender)` on-chain; there is no backend signing key, signature, nonce, or off-chain authorization that can bypass contract eligibility or mint limits.

Read the configured registry and current wallet handle:
```bash
cast call "$NEXT_PUBLIC_WEZARDS_NFT_ADDRESS" "agentIdRegistry()(address)" --rpc-url "$BSC_RPC_URL"
cast call 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F "handleOf(address)(string)" "$WALLET_ADDRESS" --rpc-url "$BSC_RPC_URL"
```

For a contract deployed from this version, the registry is set by the deployment script. If separately deploying the NFT contract, its owner can configure it with:
```bash
cast send "$NEXT_PUBLIC_WEZARDS_NFT_ADDRESS" "setAgentIdRegistry(address)" 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F --rpc-url "$BSC_RPC_URL" --private-key "$PRIVATE_KEY"
```

Wallet-signed mint commands (not executed as part of this implementation):
```bash
cast send "$NEXT_PUBLIC_WEZARDS_NFT_ADDRESS" "mintAgenticFree()" --rpc-url "$BSC_RPC_URL" --private-key "$WALLET_PRIVATE_KEY"
cast send "$NEXT_PUBLIC_WEZARDS_NFT_ADDRESS" "mintPaid(uint256)" 1 --value 0.001ether --rpc-url "$BSC_RPC_URL" --private-key "$WALLET_PRIVATE_KEY"
```

---

## 3. Pixel NFT Collection Generation & IPFS Upload

### 3.1 Generate the 5,000 Mages
```bash
npm --prefix generator run generate
```
This produces:
- 5,000 crisp 1024x1024 PNG images in `generator/output/images/`
- 5,000 vector SVGs in `generator/output/images/`
- 5,000 ERC-721 JSON metadata files in `generator/output/metadata/`
- Interactive visual gallery in `generator/output/preview.html`

### 3.2 Validate Collection
```bash
npm --prefix generator run validate
```
Verifies 100% of images and metadata: zero duplicate DNA, zero duplicate rendered images.

### 3.3 Pin to IPFS via Pinata
Upload images and metadata folders to Pinata:
```bash
# Images folder CID: QmWeZardsImagesCID...
# Metadata folder CID: QmWeZardsMetadataCID...
```
Update contract base URI:
```bash
cast send "$NEXT_PUBLIC_WEZARDS_NFT_ADDRESS" "setBaseURI(string)" "ipfs://QmWeZardsMetadataCID/" --rpc-url "$BSC_RPC_URL" --private-key "$PRIVATE_KEY"
```

---

## 4. Cloudflare D1 Database & Workers API

### 4.1 Create Cloudflare D1 Database
```bash
cd backend
wrangler d1 create wezards_db
```
Copy the returned `database_id` into `backend/wrangler.toml`.

### 4.2 Apply Migrations
```bash
# Local test
wrangler d1 migrations apply wezards_db --local

# Remote production
wrangler d1 migrations apply wezards_db --remote
```

### 4.3 Deploy Worker
```bash
wrangler deploy
```

---

## 5. Frontend & Admin Deployment (Cloudflare Pages)

The public site and admin portal are deployed as two independent Cloudflare Pages projects.

### 5.1 Public dApp (`wezards.pages.dev`)
```bash
cd frontend
npm run build
# Deploy via Cloudflare Pages dashboard or Wrangler
npx wrangler pages deploy .next --project-name wezards
```

### 5.2 Decoupled Admin Dashboard (`wezards-admin.pages.dev`)
```bash
cd admin
npm run build
npx wrangler pages deploy .next --project-name wezards-admin
```

---

## 6. Verification Checklist

1. [x] Smart contracts verified on BscScan.
2. [x] Total supply strictly verified: 21,000,000 WEZ and 5,000 NFTs.
3. [ ] Agent ID free mint verified against the SPACE ID BNB Mainnet registry.
4. [x] 1-bit pixel art Mages 100% unique and validated.
5. [x] Public dApp live with zero admin links.
6. [x] Admin portal authenticated with rate-limited PBKDF2.
7. [x] Reward distributor pool ready for funded community campaign.
