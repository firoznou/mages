-- ============================================================
-- WeZards Ecosystem - Cloudflare D1 Relational SQLite Schema
-- Migration: 0003_minting_gift_claims.sql
-- Twitter #agentID #lfg #wezards Minting Gift & Token Proof Claims
-- ============================================================

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

