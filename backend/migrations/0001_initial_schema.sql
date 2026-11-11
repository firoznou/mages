-- ============================================================
-- WeZards Ecosystem - Cloudflare D1 Relational SQLite Schema
-- Migration: 0001_initial_schema.sql
-- ============================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'BLOCKED', 'RESTRICTED'))
);

-- 2. WALLETS
CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    address TEXT NOT NULL UNIQUE,
    chain_id INTEGER DEFAULT 97,
    is_agentic_wallet INTEGER DEFAULT 0,
    agentic_verification_method TEXT,
    agentic_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
CREATE INDEX IF NOT EXISTS idx_wallets_is_agentic ON wallets(is_agentic_wallet);

-- 3. NFTS
CREATE TABLE IF NOT EXISTS nfts (
    id TEXT PRIMARY KEY,
    token_id INTEGER NOT NULL UNIQUE,
    owner_address TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    dna_hash TEXT NOT NULL UNIQUE,
    rarity_rank INTEGER NOT NULL,
    rarity_tier TEXT NOT NULL CHECK(rarity_tier IN ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary')),
    rarity_score REAL NOT NULL,
    mint_transaction_hash TEXT,
    minted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_nfts_token_id ON nfts(token_id);
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner_address);
CREATE INDEX IF NOT EXISTS idx_nfts_rarity_tier ON nfts(rarity_tier);
CREATE INDEX IF NOT EXISTS idx_nfts_rarity_rank ON nfts(rarity_rank);

-- 4. NFT_METADATA (Normalized Traits)
CREATE TABLE IF NOT EXISTS nft_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id INTEGER NOT NULL,
    trait_type TEXT NOT NULL,
    trait_value TEXT NOT NULL,
    FOREIGN KEY (token_id) REFERENCES nfts(token_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_metadata_token_id ON nft_metadata(token_id);
CREATE INDEX IF NOT EXISTS idx_metadata_trait ON nft_metadata(trait_type, trait_value);

-- 5. MINT_TRANSACTIONS
CREATE TABLE IF NOT EXISTS mint_transactions (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    token_id INTEGER NOT NULL,
    mint_type TEXT NOT NULL CHECK(mint_type IN ('AGENTIC_FREE', 'PUBLIC_PAID', 'RESERVED')),
    bnb_price TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('PENDING', 'CONFIRMED', 'FAILED')),
    block_number INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mint_tx_wallet ON mint_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_mint_tx_hash ON mint_transactions(tx_hash);

-- 6. TOKEN_TRANSACTIONS
CREATE TABLE IF NOT EXISTS token_transactions (
    id TEXT PRIMARY KEY,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    tx_type TEXT NOT NULL CHECK(tx_type IN ('TRANSFER', 'ALLOCATION', 'BURN')),
    block_number INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_token_tx_hash ON token_transactions(tx_hash);

-- 7. SOCIAL_SUBMISSIONS
CREATE TABLE IF NOT EXISTS social_submissions (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    twitter_username TEXT NOT NULL,
    twitter_post_url TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'WINNER', 'PAID')),
    review_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_submissions_wallet ON social_submissions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON social_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_twitter_user ON social_submissions(twitter_username);

-- 8. REWARD_ENTRIES
CREATE TABLE IF NOT EXISTS reward_entries (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL UNIQUE,
    wallet_address TEXT NOT NULL UNIQUE,
    is_eligible_for_draw INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES social_submissions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reward_entries_wallet ON reward_entries(wallet_address);

-- 9. REWARD_WINNERS
CREATE TABLE IF NOT EXISTS reward_winners (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    submission_id TEXT NOT NULL,
    selection_rank INTEGER NOT NULL UNIQUE,
    verifiable_seed TEXT NOT NULL,
    selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES social_submissions(id)
);
CREATE INDEX IF NOT EXISTS idx_reward_winners_wallet ON reward_winners(wallet_address);
CREATE INDEX IF NOT EXISTS idx_reward_winners_rank ON reward_winners(selection_rank);

-- 10. REWARD_PAYMENTS
CREATE TABLE IF NOT EXISTS reward_payments (
    id TEXT PRIMARY KEY,
    winner_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    bnb_amount TEXT NOT NULL,
    usd_value REAL DEFAULT 1.00,
    tx_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('PENDING', 'CONFIRMED', 'FAILED')),
    block_number INTEGER,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (winner_id) REFERENCES reward_winners(id)
);
CREATE INDEX IF NOT EXISTS idx_payments_wallet ON reward_payments(wallet_address);
CREATE INDEX IF NOT EXISTS idx_payments_tx_hash ON reward_payments(tx_hash);

-- 11. ADMIN_USERS
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OPERATOR' CHECK(role IN ('SUPERADMIN', 'OPERATOR')),
    is_active INTEGER DEFAULT 1,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username);

-- 12. ADMIN_SESSIONS
CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    session_token TEXT NOT NULL UNIQUE,
    admin_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);

-- 13. ADMIN_ACTIVITY_LOGS
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT,
    details_json TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin_users(id)
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON admin_activity_logs(created_at);

-- 14. GENERATION_JOBS
CREATE TABLE IF NOT EXISTS generation_jobs (
    id TEXT PRIMARY KEY,
    job_name TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    completed_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    summary_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. SYSTEM_SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default System Settings
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES
('TOKEN_TOTAL_SUPPLY', '21000000', 'Total supply cap for WeZardsToken'),
('NFT_TOTAL_SUPPLY', '5000', 'Hard cap for WeZards NFT collection'),
('AGENTIC_FREE_MINT_LIMIT', '250', 'Binance Agentic Wallet free allocation'),
('PUBLIC_PAID_MINT_LIMIT', '250', 'Public paid mint allocation'),
('PAID_MINT_PRICE_BNB', '0.001', 'Price in BNB per paid mint'),
('CAMPAIGN_WINNERS_COUNT', '1000', 'Target winner count for reward campaign'),
('CAMPAIGN_REWARD_USD', '1.00', 'Target reward per winner in USD equivalent'),
('CAMPAIGN_STATUS', 'ACTIVE', 'Current state of reward campaign');
