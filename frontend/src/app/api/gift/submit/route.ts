import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress, twitterUsername, twitterPostUrl, holdingTokensBalance, screenshotData, screenshotUrl } = body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Valid BNB Smart Chain wallet address is required' }, { status: 400 });
    }

    if (!twitterPostUrl || !/^https?:\/\/(twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/\d+/.test(twitterPostUrl)) {
      return NextResponse.json({ error: 'Valid X/Twitter status URL is required' }, { status: 400 });
    }

    const claimId = `gift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // If Cloudflare D1 environment is available directly
    const d1 = (process.env as any).DB || (process.env as any)['datasets-wezards'];
    if (d1 && typeof d1.prepare === 'function') {
      try {
        await d1.prepare(`
          INSERT INTO minting_gift_claims (
            id, wallet_address, twitter_username, twitter_post_url,
            holding_tokens_balance, screenshot_data, screenshot_url, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `).bind(
          claimId,
          walletAddress.toLowerCase(),
          (twitterUsername || '').replace(/^@/, ''),
          twitterPostUrl,
          holdingTokensBalance || '0',
          screenshotData || null,
          screenshotUrl || null
        ).run();
      } catch (err: any) {
        console.error('D1 direct insert error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Minting gift claim recorded successfully. Pending review.',
      claimId,
      walletAddress: walletAddress.toLowerCase(),
      status: 'PENDING',
      timestamp: new Date().toISOString()
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Submission failed' }, { status: 500 });
  }
}

