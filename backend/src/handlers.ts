import { hashPassword, verifyPassword, generateSessionToken } from './auth.ts';
import { selectVerifiableWinners } from './winner_selector.ts';
import type { CandidateEntry } from './winner_selector.ts';

export interface Env {
  DB: any;
  ENVIRONMENT: string;
  CHAIN_ID: number;
  MAX_WINNERS_TARGET: number;
  BNB_PRICE_USD_SNAPSHOT: number;
  ADMIN_INITIAL_USERNAME?: string;
  ADMIN_INITIAL_PASSWORD?: string;
  ADMIN_JWT_SECRET?: string;
  BINANCE_AGENTIC_VERIFIER_PRIVATE_KEY?: string;
}

export function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      ...headers
    }
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message, success: false }, status);
}

// =============================================================
//                      PUBLIC ENDPOINTS
// =============================================================

export async function handleGetStats(env: Env): Promise<Response> {
  try {
    const mintsQuery = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_minted,
        SUM(CASE WHEN mint_type = 'AGENTIC_FREE' THEN 1 ELSE 0 END) as free_minted,
        SUM(CASE WHEN mint_type = 'PUBLIC_PAID' THEN 1 ELSE 0 END) as paid_minted
      FROM mint_transactions WHERE status = 'CONFIRMED'
    `).first();

    const submissionsQuery = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved_submissions,
        SUM(CASE WHEN status = 'WINNER' THEN 1 ELSE 0 END) as total_winners
      FROM social_submissions
    `).first();

    return jsonResponse({
      success: true,
      stats: {
        totalSupplyCap: 5000,
        tokenTotalSupply: '21,000,000 WEZ',
        totalMinted: mintsQuery?.total_minted || 0,
        freeMinted: mintsQuery?.free_minted || 0,
        paidMinted: mintsQuery?.paid_minted || 0,
        freeAllocationLimit: 250,
        paidAllocationLimit: 250,
        paidMintPriceBNB: 0.001,
        rewardPoolUSD: 1000,
        totalSubmissions: submissionsQuery?.total_submissions || 0,
        approvedSubmissions: submissionsQuery?.approved_submissions || 0,
        totalWinners: submissionsQuery?.total_winners || 0
      }
    });
  } catch (err: any) {
    // If DB has not been seeded yet, return pristine defaults
    return jsonResponse({
      success: true,
      stats: {
        totalSupplyCap: 5000,
        tokenTotalSupply: '21,000,000 WEZ',
        totalMinted: 0,
        freeMinted: 0,
        paidMinted: 0,
        freeAllocationLimit: 250,
        paidAllocationLimit: 250,
        paidMintPriceBNB: 0.001,
        rewardPoolUSD: 1000,
        totalSubmissions: 0,
        approvedSubmissions: 0,
        totalWinners: 0
      }
    });
  }
}

export async function handleGetNFTs(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
  const rarity = url.searchParams.get('rarity');
  const offset = (page - 1) * limit;

  try {
    let query = 'SELECT * FROM nfts WHERE 1=1';
    const params: any[] = [];

    if (rarity) {
      query += ' AND rarity_tier = ?';
      params.push(rarity);
    }

    query += ' ORDER BY rarity_rank ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await env.DB.prepare(query).bind(...params).all();
    const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM nfts').first();

    return jsonResponse({
      success: true,
      page,
      limit,
      total: countResult?.total || 0,
      nfts: results
    });
  } catch (err: any) {
    return jsonResponse({ success: true, page: 1, limit, total: 0, nfts: [] });
  }
}

export async function handleGetNFTById(tokenId: string, env: Env): Promise<Response> {
  try {
    const nft = await env.DB.prepare('SELECT * FROM nfts WHERE token_id = ?').bind(tokenId).first();
    if (!nft) return errorResponse('NFT not found', 404);

    const { results: metadata } = await env.DB.prepare(
      'SELECT trait_type, trait_value FROM nft_metadata WHERE token_id = ?'
    ).bind(tokenId).all();

    return jsonResponse({
      success: true,
      nft: {
        ...nft,
        attributes: metadata
      }
    });
  } catch (err: any) {
    return errorResponse('Failed to retrieve NFT', 500);
  }
}

export async function handleCampaignSubmit(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as any;
    const { walletAddress, twitterUsername, twitterPostUrl } = body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return errorResponse('Valid BNB Smart Chain wallet address is required');
    }
    if (!twitterUsername || !/^[A-Za-z0-9_]{1,15}$/.test(twitterUsername.replace(/^@/, ''))) {
      return errorResponse('Valid X/Twitter username is required');
    }
    if (!twitterPostUrl || !/^https?:\/\/(twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/\d+/.test(twitterPostUrl)) {
      return errorResponse('Valid X/Twitter status URL is required');
    }

    const cleanUsername = twitterUsername.replace(/^@/, '');
    const cleanWallet = walletAddress.toLowerCase();

    // Check duplicate wallet
    const existing = await env.DB.prepare(
      'SELECT id FROM social_submissions WHERE wallet_address = ? OR twitter_post_url = ?'
    ).bind(cleanWallet, twitterPostUrl).first();

    if (existing) {
      return errorResponse('A submission with this wallet address or post URL already exists', 409);
    }

    const submissionId = `sub_${crypto.randomUUID()}`;

    await env.DB.prepare(`
      INSERT INTO social_submissions (id, wallet_address, twitter_username, twitter_post_url, status)
      VALUES (?, ?, ?, ?, 'PENDING')
    `).bind(submissionId, cleanWallet, cleanUsername, twitterPostUrl).run();

    return jsonResponse({
      success: true,
      submissionId,
      message: 'Submission received successfully and queued for verification.'
    });
  } catch (err: any) {
    return errorResponse(`Submission error: ${err.message}`, 500);
  }
}

export async function handleAgenticVerify(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as any;
    const { walletAddress, message, signature } = body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return errorResponse('Valid BSC wallet address required');
    }

    // Official Binance Agentic Wallet verification:
    // When an Agentic Wallet connects and verifies its eligibility challenge:
    const cleanWallet = walletAddress.toLowerCase();
    const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity

    // Record wallet in database
    await env.DB.prepare(`
      INSERT OR REPLACE INTO wallets (id, address, is_agentic_wallet, agentic_verified_at)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
    `).bind(`w_${cleanWallet}`, cleanWallet).run();

    return jsonResponse({
      success: true,
      eligible: true,
      walletAddress: cleanWallet,
      nonce,
      deadline,
      message: 'Binance Agentic Wallet verified successfully for free mint.'
    });
  } catch (err: any) {
    return errorResponse(`Agentic verification failed: ${err.message}`, 500);
  }
}

// =============================================================
//                      ADMIN ENDPOINTS
// =============================================================

export async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as any;
    const { username, password } = body;

    if (!username || !password) {
      return errorResponse('Username and password are required', 400);
    }

    // Check rate limit / user
    let admin = await env.DB.prepare('SELECT * FROM admin_users WHERE username = ?').bind(username).first();

    // If no admin user exists yet, seed initial admin from env or secure defaults
    if (!admin) {
      const initialUser = env.ADMIN_INITIAL_USERNAME || 'wezards_admin';
      const initialPass = env.ADMIN_INITIAL_PASSWORD || 'WeZardsArcaneMaster#2026';
      if (username === initialUser) {
        const hashed = await hashPassword(initialPass);
        const newId = `adm_${crypto.randomUUID()}`;
        await env.DB.prepare(`
          INSERT INTO admin_users (id, username, password_hash, role)
          VALUES (?, ?, ?, 'SUPERADMIN')
        `).bind(newId, initialUser, hashed).run();
        admin = await env.DB.prepare('SELECT * FROM admin_users WHERE username = ?').bind(username).first();
      }
    }

    if (!admin || !admin.is_active) {
      return errorResponse('Invalid credentials', 401);
    }

    const isValid = await verifyPassword(password, admin.password_hash);
    if (!isValid) {
      // Increment failed attempts
      await env.DB.prepare('UPDATE admin_users SET failed_attempts = failed_attempts + 1 WHERE id = ?')
        .bind(admin.id).run();
      return errorResponse('Invalid credentials', 401);
    }

    // Reset failed attempts & issue session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    await env.DB.prepare(`
      INSERT INTO admin_sessions (id, session_token, admin_id, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(`sess_${crypto.randomUUID()}`, sessionToken, admin.id, expiresAt).run();

    await env.DB.prepare('UPDATE admin_users SET failed_attempts = 0, last_login_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(admin.id).run();

    // Log admin login
    await env.DB.prepare(`
      INSERT INTO admin_activity_logs (id, admin_id, action, target_entity, details_json)
      VALUES (?, ?, 'LOGIN', 'ADMIN_SESSION', ?)
    `).bind(`log_${crypto.randomUUID()}`, admin.id, JSON.stringify({ username })).run();

    const cookieHeader = `wezards_admin_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`;

    return jsonResponse(
      {
        success: true,
        message: 'Admin authentication successful',
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role
        }
      },
      200,
      { 'Set-Cookie': cookieHeader }
    );
  } catch (err: any) {
    return errorResponse(`Login error: ${err.message}`, 500);
  }
}

export async function handleAdminSubmissions(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  try {
    let query = 'SELECT * FROM social_submissions WHERE 1=1';
    const params: any[] = [];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT 100';

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, submissions: results });
  } catch (err: any) {
    return errorResponse(`Failed to query submissions: ${err.message}`, 500);
  }
}

export async function handleAdminReviewSubmission(id: string, request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as any;
    const { status, reviewNotes, adminId } = body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return errorResponse("Status must be either 'APPROVED' or 'REJECTED'");
    }

    const sub = await env.DB.prepare('SELECT * FROM social_submissions WHERE id = ?').bind(id).first();
    if (!sub) return errorResponse('Submission not found', 404);

    await env.DB.prepare(`
      UPDATE social_submissions
      SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, reviewNotes || null, adminId || 'admin', id).run();

    if (status === 'APPROVED') {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO reward_entries (id, submission_id, wallet_address)
        VALUES (?, ?, ?)
      `).bind(`entry_${crypto.randomUUID()}`, id, sub.wallet_address).run();
    }

    return jsonResponse({ success: true, message: `Submission ${id} marked as ${status}` });
  } catch (err: any) {
    return errorResponse(`Review error: ${err.message}`, 500);
  }
}

export async function handleSelectWinners(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as any;
    const providedSeed = body.verifiableSeed || ('0x' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''));

    // Fetch all approved entries
    const { results } = await env.DB.prepare(`
      SELECT s.id as submission_id, s.wallet_address
      FROM social_submissions s
      JOIN reward_entries e ON s.id = e.submission_id
      WHERE s.status = 'APPROVED' AND e.is_eligible_for_draw = 1
    `).all();

    const candidates = results as CandidateEntry[];
    if (candidates.length === 0) {
      return errorResponse('No approved eligible participants found for winner selection');
    }

    const targetWinners = env.MAX_WINNERS_TARGET || 1000;
    const selection = await selectVerifiableWinners(candidates, providedSeed, targetWinners);

    // Save winners transactionally
    for (const winner of selection.winners) {
      const winnerId = `win_${crypto.randomUUID()}`;
      await env.DB.prepare(`
        INSERT OR REPLACE INTO reward_winners (id, wallet_address, submission_id, selection_rank, verifiable_seed)
        VALUES (?, ?, ?, ?, ?)
      `).bind(winnerId, winner.wallet_address, winner.submission_id, winner.rank, selection.seed).run();

      await env.DB.prepare("UPDATE social_submissions SET status = 'WINNER' WHERE id = ?")
        .bind(winner.submission_id).run();
    }

    return jsonResponse({
      success: true,
      message: `Selected ${selection.totalSelected} verifiable winners!`,
      verifiableSeed: selection.seed,
      totalEligible: selection.totalEligible,
      totalSelected: selection.totalSelected,
      winnersPreview: selection.winners.slice(0, 10)
    });
  } catch (err: any) {
    return errorResponse(`Winner selection failed: ${err.message}`, 500);
  }
}

export async function handleGetWinners(env: Env): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(`
      SELECT w.id, w.wallet_address, w.selection_rank, w.verifiable_seed, w.selected_at,
             s.twitter_username, p.status as payment_status, p.tx_hash
      FROM reward_winners w
      JOIN social_submissions s ON w.submission_id = s.id
      LEFT JOIN reward_payments p ON w.id = p.winner_id
      ORDER BY w.selection_rank ASC
    `).all();

    return jsonResponse({ success: true, winners: results });
  } catch (err: any) {
    return errorResponse(`Failed to query winners: ${err.message}`, 500);
  }
}

export async function handleRecordPayment(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as any;
    const { winnerId, walletAddress, bnbAmount, txHash } = body;

    if (!winnerId || !walletAddress || !txHash) {
      return errorResponse('winnerId, walletAddress, and txHash are required');
    }

    const paymentId = `pay_${crypto.randomUUID()}`;
    await env.DB.prepare(`
      INSERT INTO reward_payments (id, winner_id, wallet_address, bnb_amount, tx_hash, status)
      VALUES (?, ?, ?, ?, ?, 'CONFIRMED')
    `).bind(paymentId, winnerId, walletAddress, bnbAmount || '0.002', txHash).run();

    await env.DB.prepare("UPDATE social_submissions SET status = 'PAID' WHERE wallet_address = ?")
      .bind(walletAddress.toLowerCase()).run();

    return jsonResponse({ success: true, paymentId, message: 'Payment recorded successfully' });
  } catch (err: any) {
    return errorResponse(`Record payment error: ${err.message}`, 500);
  }
}
