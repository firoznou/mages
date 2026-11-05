import {
  Env,
  jsonResponse,
  errorResponse,
  handleGetStats,
  handleGetNFTs,
  handleGetNFTById,
  handleCampaignSubmit,
  handleAgenticVerify,
  handleAdminLogin,
  handleAdminSubmissions,
  handleAdminReviewSubmission,
  handleSelectWinners,
  handleGetWinners,
  handleRecordPayment
} from './handlers.ts';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    try {
      // 1. PUBLIC ROUTES
      if (method === 'GET' && url.pathname === '/api/stats') {
        return await handleGetStats(env);
      }

      if (method === 'GET' && url.pathname === '/api/nfts') {
        return await handleGetNFTs(request, env);
      }

      const nftMatch = url.pathname.match(/^\/api\/nfts\/(\d+)$/);
      if (method === 'GET' && nftMatch) {
        return await handleGetNFTById(nftMatch[1], env);
      }

      if (method === 'POST' && url.pathname === '/api/campaign/submit') {
        return await handleCampaignSubmit(request, env);
      }

      if (method === 'POST' && url.pathname === '/api/agentic/verify') {
        return await handleAgenticVerify(request, env);
      }

      // 2. ADMIN AUTH ROUTES
      if (method === 'POST' && url.pathname === '/api/admin/login') {
        return await handleAdminLogin(request, env);
      }

      if (method === 'POST' && url.pathname === '/api/admin/logout') {
        return jsonResponse(
          { success: true, message: 'Logged out successfully' },
          200,
          { 'Set-Cookie': 'wezards_admin_session=; Path=/; HttpOnly; Max-Age=0' }
        );
      }

      // 3. ADMIN PROTECTED ROUTES
      if (method === 'GET' && url.pathname === '/api/admin/submissions') {
        return await handleAdminSubmissions(request, env);
      }

      const reviewMatch = url.pathname.match(/^\/api\/admin\/submissions\/([^/]+)\/review$/);
      if (method === 'POST' && reviewMatch) {
        return await handleAdminReviewSubmission(reviewMatch[1], request, env);
      }

      if (method === 'POST' && url.pathname === '/api/admin/campaign/select-winners') {
        return await handleSelectWinners(request, env);
      }

      if (method === 'GET' && url.pathname === '/api/admin/winners') {
        return await handleGetWinners(env);
      }

      if (method === 'POST' && url.pathname === '/api/admin/payments/record') {
        return await handleRecordPayment(request, env);
      }

      // 404 Route Not Found
      return errorResponse(`Endpoint ${method} ${url.pathname} not found`, 404);
    } catch (err: any) {
      console.error('[Worker Unhandled Error]', err);
      return errorResponse(`Internal Server Error: ${err.message}`, 500);
    }
  }
};
