-- WeZards Web3 Ecosystem: PostgreSQL Database Schema
-- Production Ready Migration for BNB Smart Chain Platform

-- 1. Users and Wallets
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'operator')),
    nonce VARCHAR(64) NOT NULL,
    is_agentic_wallet BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. SIWE Authentication Sessions
CREATE TABLE IF NOT EXISTS siwe_sessions (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    session_token VARCHAR(128) UNIQUE NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 56,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_siwe_sessions_token ON siwe_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_siwe_sessions_wallet ON siwe_sessions(wallet_address);

-- 3. NFTs & Metadata
CREATE TABLE IF NOT EXISTS nfts (
    token_id INTEGER PRIMARY KEY CHECK (token_id >= 1 AND token_id <= 5000),
    owner_address VARCHAR(42) NOT NULL,
    is_paid_mint BOOLEAN NOT NULL DEFAULT FALSE,
    mint_type VARCHAR(20) NOT NULL CHECK (mint_type IN ('free_agentic', 'team_free', 'paid', 'airdrop')),
    price_paid_bnb NUMERIC(24, 18) DEFAULT 0,
    mint_tx_hash VARCHAR(66),
    mint_block_number BIGINT,
    minted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner_address);
CREATE INDEX IF NOT EXISTS idx_nfts_paid ON nfts(is_paid_mint);

CREATE TABLE IF NOT EXISTS nft_metadata (
    token_id INTEGER PRIMARY KEY REFERENCES nfts(token_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_uri VARCHAR(255) NOT NULL,
    dna VARCHAR(66) UNIQUE NOT NULL,
    rarity_score NUMERIC(10, 2) NOT NULL,
    rarity_rank INTEGER NOT NULL,
    rarity_tier VARCHAR(20) NOT NULL CHECK (rarity_tier IN ('Legendary', 'Epic', 'Rare', 'Uncommon', 'Common')),
    attributes_json JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nft_metadata_tier ON nft_metadata(rarity_tier);
CREATE INDEX IF NOT EXISTS idx_nft_metadata_rank ON nft_metadata(rarity_rank);

-- 4. Presale Contributions & Settlements
CREATE TABLE IF NOT EXISTS presale_contributions (
    id SERIAL PRIMARY KEY,
    contributor_address VARCHAR(42) NOT NULL,
    amount_bnb NUMERIC(24, 18) NOT NULL CHECK (amount_bnb > 0),
    amount_usd NUMERIC(24, 18) NOT NULL CHECK (amount_usd >= 50.0),
    bnb_price_usd NUMERIC(24, 18) NOT NULL,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    block_number BIGINT NOT NULL,
    contributed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_presale_contributor ON presale_contributions(contributor_address);

CREATE TABLE IF NOT EXISTS presale_settlements (
    id SERIAL PRIMARY KEY,
    total_raised_usd NUMERIC(24, 18) NOT NULL,
    total_raised_bnb NUMERIC(24, 18) NOT NULL,
    total_accepted_bnb NUMERIC(24, 18) NOT NULL,
    total_refund_liabilities NUMERIC(24, 18) NOT NULL DEFAULT 0,
    is_oversubscribed BOOLEAN NOT NULL DEFAULT FALSE,
    finalized_by VARCHAR(42) NOT NULL,
    finalized_tx_hash VARCHAR(66),
    finalized_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. MAGES Airdrop Snapshots & Claims
CREATE TABLE IF NOT EXISTS airdrop_snapshots (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    entitled_mages NUMERIC(30, 18) NOT NULL,
    rarity_points INTEGER NOT NULL DEFAULT 0,
    merkle_proof JSONB NOT NULL,
    tge_claimed BOOLEAN DEFAULT FALSE,
    tge_claimed_at TIMESTAMP WITH TIME ZONE,
    vested_claimed BOOLEAN DEFAULT FALSE,
    vested_claimed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_airdrop_wallet ON airdrop_snapshots(wallet_address);

-- 6. Paid NFT Random MAGES Rewards
CREATE TABLE IF NOT EXISTS paid_nft_rewards (
    id SERIAL PRIMARY KEY,
    token_id INTEGER UNIQUE NOT NULL REFERENCES nfts(token_id),
    claimant_address VARCHAR(42) NOT NULL,
    reward_mages NUMERIC(24, 18) NOT NULL CHECK (reward_mages >= 500 * 10^18 AND reward_mages <= 1500 * 10^18),
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rewards_claimant ON paid_nft_rewards(claimant_address);

-- 7. Admin Activity & Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id SERIAL PRIMARY KEY,
    admin_wallet VARCHAR(42) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_resource VARCHAR(100),
    parameters_json JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_wallet);

-- 8. System Settings & Configuration
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by VARCHAR(42),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial System Parameters
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
    ('NFT_COLLECTION_CAP', '5000', 'Hard max supply for WeZards NFT collection'),
    ('PRESALE_STATUS', 'COMING_SOON', 'Presale state: COMING_SOON, ACTIVE, FINALIZED'),
    ('PRESALE_TARGET_USD', '20000', 'Presale target raise in USD'),
    ('PRESALE_MIN_PURCHASE_USD', '50', 'Minimum purchase per contribution in USD'),
    ('PRESALE_MAX_WALLET_BNB', '1.0', 'Maximum cumulative contribution per wallet in BNB'),
    ('MAGES_TOTAL_SUPPLY', '21000000', 'Fixed total supply of MAGES token'),
    ('BINANCE_DEPOSIT_DESTINATION', '0x9999999999999999999999999999999999999999', 'Admin-verified Binance deposit account')
ON CONFLICT (setting_key) DO NOTHING;

