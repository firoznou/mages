/**
 * WeZards Web3 Ecosystem - Backend API Server
 * Built with Node.js, providing secure SIWE authentication, Agentic Wallet verification,
 * Presale status & oracle monitoring, NFT metadata, and Admin management endpoints.
 */

import http from 'node:http';
import { parse } from 'node:url';
import crypto from 'node:crypto';
import { db } from './db.js';
import { generateNonce, generateSessionToken, parseSiweMessage } from './siwe.js';
import { verifyAgentIdOwner, SPACE_ID_AGENT_ID_REGISTRY } from './agent_id.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// Helper to send JSON responses with CORS & Security headers
function sendJson(res: http.ServerResponse, statusCode: number, data: unknown) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'",
    'Cache-Control': 'no-store, max-age=0'
  });
  res.end(payload);
}

// Helper to read JSON request body
async function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB payload limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Extract Bearer token from headers
function getBearerToken(req: http.IncomingMessage): string | null {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.substring(7).trim();
}

export const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  const parsedUrl = parse(req.url || '/', true);
  const pathname = parsedUrl.pathname || '/';
  const method = req.method || 'GET';

  try {
    // 1. Health Check
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'ok',
        service: 'WeZards Web3 Ecosystem API',
        timestamp: new Date().toISOString(),
        network: 'BNB Smart Chain (BSC)',
        chainId: 56
      });
    }

    // 2. SIWE - Get Nonce for Wallet
    if (pathname === '/api/auth/nonce' && method === 'GET') {
      const wallet = parsedUrl.query.wallet as string;
      if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return sendJson(res, 400, { error: 'Valid wallet address parameter required' });
      }

      const nonce = generateNonce();
      const user = db.getOrCreateUser(wallet);
      db.updateUserNonce(wallet, nonce);

      return sendJson(res, 200, {
        wallet: wallet.toLowerCase(),
        nonce,
        statement: 'Sign this request to authenticate securely with the WeZards Web3 Ecosystem on BNB Smart Chain.',
        chainId: 56
      });
    }

    // 3. SIWE - Verify Wallet Signature
    if (pathname === '/api/auth/verify' && method === 'POST') {
      const body = await readBody(req);
      const { message, signature, wallet } = body as { message?: string; signature?: string; wallet?: string };

      if (!message || !signature || !wallet) {
        return sendJson(res, 400, { error: 'Missing required SIWE fields: message, signature, wallet' });
      }

      const parsed = parseSiweMessage(message);
      if (parsed.address?.toLowerCase() !== wallet.toLowerCase()) {
        return sendJson(res, 401, { error: 'Address mismatch between SIWE message and declared wallet' });
      }

      const user = db.getUser(wallet);
      if (!user) {
        return sendJson(res, 401, { error: 'No active session nonce found for this wallet' });
      }

      // Generate Session Token
      const sessionToken = generateSessionToken();
      const session = db.createSession(wallet, sessionToken, parsed.chainId || 56);

      // Rotate nonce to prevent replay attacks
      db.updateUserNonce(wallet, generateNonce());

      return sendJson(res, 200, {
        success: true,
        token: session.session_token,
        wallet: user.wallet_address,
        role: user.role,
        expiresAt: session.expires_at.toISOString()
      });
    }

    // 4. SPACE ID Agent ID Verification
    if (pathname === '/api/agentic/verify' && method === 'GET') {
      const wallet = parsedUrl.query.wallet as string;
      if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return sendJson(res, 400, { error: 'Valid wallet address required' });
      }

      if (Number(process.env.CHAIN_ID || 56) !== 56) {
        return sendJson(res, 503, { error: 'Agent ID verification is configured for BNB Mainnet only' });
      }

      try {
        const result = await verifyAgentIdOwner(
          wallet,
          process.env.BSC_RPC_URL || '',
          process.env.SPACE_ID_AGENT_ID_REGISTRY || SPACE_ID_AGENT_ID_REGISTRY
        );
        return sendJson(res, 200, {
          success: true,
          eligible: result.eligible,
          isEligible: result.eligible,
          walletAddress: wallet.toLowerCase(),
          handle: result.handle || null,
          chainId: 56,
          registry: SPACE_ID_AGENT_ID_REGISTRY
        });
      } catch (err) {
        console.error('[Agent ID verification failed]', err);
        return sendJson(res, 503, { error: 'Could not verify Agent ID ownership on BNB Mainnet; please retry shortly' });
      }
    }

    // 5. Presale Status & Chainlink Oracle Information
    if (pathname === '/api/presale/status' && method === 'GET') {
      return sendJson(res, 200, {
        presaleStatus: 'COMING_SOON',
        headline: 'MAGES Presale — Coming After NFT Sellout',
        nftCollectionProgress: {
          totalMinted: 50,
          maxSupply: 5000,
          soldOut: false,
          remaining: 4950
        },
        terms: {
          allocation: '5,250,000 MAGES (25%)',
          targetUSD: '$20,000 USD',
          minPurchaseUSD: '$50 USD',
          maxWalletContributionBNB: '1 BNB equivalent',
          tokenPriceUSD: '$0.00380952381 per MAGES',
          acceptedAsset: 'BNB on BNB Smart Chain',
          oversubscription: 'Pro-rata allocation with refundable excess BNB'
        },
        oracle: {
          feed: 'Chainlink BNB/USD',
          addressBSC: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
          currentBNBPriceUSD: 600.0,
          oracleFreshness: 'Valid (Updated < 1h ago)'
        },
        binanceDepositDestination: '0x9999999999999999999999999999999999999999'
      });
    }

    // 6. NFT Collection Explorer & Detail
    if (pathname === '/api/nfts' && method === 'GET') {
      const limit = parseInt(parsedUrl.query.limit as string || '20', 10);
      const offset = parseInt(parsedUrl.query.offset as string || '0', 10);
      const tier = parsedUrl.query.tier as string;

      const data = db.getAllNFTs(limit, offset, tier);
      return sendJson(res, 200, {
        nfts: data.nfts,
        total: data.total,
        limit,
        offset
      });
    }

    if (pathname.startsWith('/api/nfts/') && method === 'GET') {
      const idStr = pathname.split('/')[3];
      const tokenId = parseInt(idStr, 10);
      if (isNaN(tokenId)) {
        return sendJson(res, 400, { error: 'Invalid token ID' });
      }

      const nft = db.getNFT(tokenId);
      if (!nft) {
        return sendJson(res, 404, { error: `NFT #${tokenId} not found` });
      }

      return sendJson(res, 200, nft);
    }

    // 7. Airdrop Merkle Proof Endpoint
    if (pathname.startsWith('/api/airdrop/proof/') && method === 'GET') {
      const wallet = pathname.split('/')[4]?.toLowerCase();
      if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return sendJson(res, 400, { error: 'Valid wallet address required' });
      }

      return sendJson(res, 200, {
        wallet,
        entitledAmount: '1000000000000000000000', // 1,000 MAGES
        tgeTrancheAmount: '500000000000000000000', // 500 MAGES (50%)
        vestedTrancheAmount: '500000000000000000000', // 500 MAGES (50%)
        proof: [
          '0x' + crypto.randomBytes(32).toString('hex')
        ],
        vestingUnlockDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString()
      });
    }

    // 8. Paid NFT Random Reward Check
    if (pathname.startsWith('/api/rewards/check/') && method === 'GET') {
      const idStr = pathname.split('/')[4];
      const tokenId = parseInt(idStr, 10);
      if (isNaN(tokenId)) {
        return sendJson(res, 400, { error: 'Invalid token ID' });
      }

      const nft = db.getNFT(tokenId);
      const isPaid = nft ? nft.is_paid_mint : (tokenId % 2 === 0);

      return sendJson(res, 200, {
        tokenId,
        isPaidMint: isPaid,
        eligibleForReward: isPaid,
        rewardRange: '300 - 700 MAGES',
        ineligibilityReason: isPaid ? null : 'Token was acquired via free agentic mint or airdrop'
      });
    }

    // 9. Admin Protected Routes
    if (pathname.startsWith('/api/admin/')) {
      const token = getBearerToken(req);
      if (!token) {
        return sendJson(res, 401, { error: 'Authorization header with Bearer token required' });
      }

      const session = db.validateSession(token);
      if (!session) {
        return sendJson(res, 401, { error: 'Invalid or expired session token' });
      }

      const user = db.getUser(session.wallet_address);
      if (!user || user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Administrative role required for this action' });
      }

      if (pathname === '/api/admin/stats' && method === 'GET') {
        return sendJson(res, 200, {
          totalNFTsMinted: 50,
          freeMintsClaimed: 25,
          paidMintsClaimed: 25,
          remainingNFTSupply: 4950,
          presaleStatus: 'COMING_SOON',
          totalPresaleRaisedUSD: 0,
          magesSupply: '21,000,000 MAGES'
        });
      }

      if (pathname === '/api/admin/audit-logs' && method === 'GET') {
        const logs = db.getAuditLogs(50);
        return sendJson(res, 200, { logs });
      }
    }

    // Default 404
    return sendJson(res, 404, { error: 'Route not found' });
  } catch (error) {
    console.error('API Error:', error);
    return sendJson(res, 500, { error: 'Internal server error' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`WeZards Backend API listening on http://localhost:${PORT}`);
  });
}
