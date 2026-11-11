-- 1. Create Minting Gift Claims Table
CREATE TABLE IF NOT EXISTS minting_gift_claims (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    twitter_username TEXT,
    twitter_post_url TEXT NOT NULL,
    holding_tokens_balance TEXT DEFAULT '0',
    screenshot_data TEXT,
    screenshot_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'DISTRIBUTED')),
    notes TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gift_wallet ON minting_gift_claims(wallet_address);
CREATE INDEX IF NOT EXISTS idx_gift_status ON minting_gift_claims(status);
CREATE INDEX IF NOT EXISTS idx_gift_created_at ON minting_gift_claims(created_at);

-- 2. Create Mint Transactions Table (For On-Chain Sync)
CREATE TABLE IF NOT EXISTS mint_transactions (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    token_id INTEGER NOT NULL,
    mint_type TEXT NOT NULL,
    bnb_price TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'CONFIRMED',
    block_number INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
