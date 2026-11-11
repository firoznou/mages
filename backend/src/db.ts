/**
 * WeZards Database Layer
 * In-memory state store with PostgreSQL interface support for production environments.
 */

export interface UserRecord {
  id: number;
  wallet_address: string;
  role: 'user' | 'admin' | 'operator';
  nonce: string;
  is_agentic_wallet: boolean;
  created_at: Date;
}

export interface SiweSessionRecord {
  id: number;
  wallet_address: string;
  session_token: string;
  chain_id: number;
  issued_at: Date;
  expires_at: Date;
  is_revoked: boolean;
}

export interface NFTRecord {
  token_id: number;
  owner_address: string;
  is_paid_mint: boolean;
  mint_type: 'free_agentic' | 'team_free' | 'paid' | 'airdrop';
  price_paid_bnb: number;
  mint_tx_hash: string;
  name: string;
  rarity_score: number;
  rarity_rank: number;
  rarity_tier: 'Legendary' | 'Epic' | 'Rare' | 'Uncommon' | 'Common';
  attributes: Array<{ trait_type: string; value: string }>;
}

export interface PresaleContributionRecord {
  id: number;
  contributor_address: string;
  amount_bnb: number;
  amount_usd: number;
  bnb_price_usd: number;
  tx_hash: string;
  contributed_at: Date;
}

export interface AdminAuditRecord {
  id: number;
  admin_wallet: string;
  action: string;
  target_resource?: string;
  parameters?: Record<string, unknown>;
  created_at: Date;
}

class WeZardsDatabase {
  private users = new Map<string, UserRecord>();
  private sessions = new Map<string, SiweSessionRecord>();
  private nfts = new Map<number, NFTRecord>();
  private presaleContributions: PresaleContributionRecord[] = [];
  private auditLogs: AdminAuditRecord[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Initial Admin user
    const adminAddress = '0x1111111111111111111111111111111111111111'.toLowerCase();
    this.users.set(adminAddress, {
      id: 1,
      wallet_address: adminAddress,
      role: 'admin',
      nonce: 'admin_initial_nonce',
      is_agentic_wallet: false,
      created_at: new Date()
    });

    // Seed sample NFTs matching the 5,000 generated collection
    const tiers: Array<NFTRecord['rarity_tier']> = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
    for (let id = 1; id <= 60; id++) {
      const tier = tiers[id % tiers.length];
      const isPaid = id % 2 === 0;
      this.nfts.set(id, {
        token_id: id,
        owner_address: isPaid ? '0x3333333333333333333333333333333333333333' : '0x2222222222222222222222222222222222222222',
        is_paid_mint: isPaid,
        mint_type: isPaid ? 'paid' : 'free_agentic',
        price_paid_bnb: isPaid ? 0.001 : 0,
        mint_tx_hash: `0x${'a'.repeat(64)}`,
        name: `WeZards #${String(id).padStart(4, '0')}`,
        rarity_score: Number((50 + (60 - id) * 1.5).toFixed(2)),
        rarity_rank: id,
        rarity_tier: tier,
        attributes: [
          { trait_type: 'Color Palette', value: 'Retro Gray' },
          { trait_type: 'Hat', value: 'Classic Conical' },
          { trait_type: 'Robe', value: 'Flowing High Collar' },
          { trait_type: 'Staff', value: 'Spiral Crook Staff' },
          { trait_type: 'Art Style', value: 'Classic 8-Bit Pixel Art' }
        ]
      });
    }
  }

  // Users
  getUser(wallet: string): UserRecord | undefined {
    return this.users.get(wallet.toLowerCase());
  }

  getOrCreateUser(wallet: string, isAgentic = false): UserRecord {
    const key = wallet.toLowerCase();
    let user = this.users.get(key);
    if (!user) {
      user = {
        id: this.users.size + 1,
        wallet_address: key,
        role: 'user',
        nonce: Math.random().toString(36).substring(2, 15),
        is_agentic_wallet: isAgentic,
        created_at: new Date()
      };
      this.users.set(key, user);
    }
    return user;
  }

  updateUserNonce(wallet: string, newNonce: string): void {
    const user = this.getUser(wallet);
    if (user) {
      user.nonce = newNonce;
    }
  }

  // Sessions
  createSession(wallet: string, token: string, chainId: number, durationHours = 24): SiweSessionRecord {
    const session: SiweSessionRecord = {
      id: this.sessions.size + 1,
      wallet_address: wallet.toLowerCase(),
      session_token: token,
      chain_id: chainId,
      issued_at: new Date(),
      expires_at: new Date(Date.now() + durationHours * 3600 * 1000),
      is_revoked: false
    };
    this.sessions.set(token, session);
    return session;
  }

  validateSession(token: string): SiweSessionRecord | null {
    const session = this.sessions.get(token);
    if (!session || session.is_revoked || session.expires_at < new Date()) {
      return null;
    }
    return session;
  }

  // NFTs
  getNFT(tokenId: number): NFTRecord | undefined {
    return this.nfts.get(tokenId);
  }

  getAllNFTs(limit = 50, offset = 0, tierFilter?: string): { nfts: NFTRecord[]; total: number } {
    let list = Array.from(this.nfts.values());
    if (tierFilter && tierFilter !== 'all') {
      list = list.filter(n => n.rarity_tier.toLowerCase() === tierFilter.toLowerCase());
    }
    return {
      nfts: list.slice(offset, offset + limit),
      total: list.length
    };
  }

  // Presale Contributions
  addPresaleContribution(entry: Omit<PresaleContributionRecord, 'id' | 'contributed_at'>): PresaleContributionRecord {
    const record: PresaleContributionRecord = {
      ...entry,
      id: this.presaleContributions.length + 1,
      contributed_at: new Date()
    };
    this.presaleContributions.push(record);
    return record;
  }

  getPresaleContributions(wallet?: string): PresaleContributionRecord[] {
    if (wallet) {
      const target = wallet.toLowerCase();
      return this.presaleContributions.filter(c => c.contributor_address.toLowerCase() === target);
    }
    return [...this.presaleContributions];
  }

  // Audit Logs
  logAudit(entry: Omit<AdminAuditRecord, 'id' | 'created_at'>): void {
    this.auditLogs.unshift({
      ...entry,
      id: this.auditLogs.length + 1,
      created_at: new Date()
    });
  }

  getAuditLogs(limit = 50): AdminAuditRecord[] {
    return this.auditLogs.slice(0, limit);
  }
}

export const db = new WeZardsDatabase();

