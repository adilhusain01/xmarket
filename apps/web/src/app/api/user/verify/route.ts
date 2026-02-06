import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@xmarket/db';

/**
 * POST /api/user/verify
 * Verify if a Twitter user is registered and return their wallet address
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { twitterHandle } = body;

    if (!twitterHandle || typeof twitterHandle !== 'string') {
      return NextResponse.json(
        { error: 'Twitter handle is required' },
        { status: 400 }
      );
    }

    // Clean the handle (remove @ if present)
    const cleanHandle = twitterHandle.replace('@', '').toLowerCase();

    console.log(`[API] Verifying Twitter user: @${cleanHandle}`);

    // Find user by Twitter username
    const user = await prisma.user.findFirst({
      where: {
        xUsername: {
          equals: cleanHandle,
          mode: 'insensitive', // Case-insensitive search
        },
      },
      select: {
        id: true,
        xUsername: true,
        walletAddress: true,
        balanceUsdc: true,
      },
    });

    if (!user) {
      console.log(`[API] User @${cleanHandle} not found`);
      return NextResponse.json(
        { error: 'User not registered' },
        { status: 404 }
      );
    }

    if (!user.walletAddress) {
      console.log(`[API] User @${cleanHandle} has no wallet address`);
      return NextResponse.json(
        { error: 'No wallet linked to account' },
        { status: 404 }
      );
    }

    console.log(`[API] User verified: @${cleanHandle} → ${user.walletAddress}`);

    return NextResponse.json({
      isRegistered: true,
      walletAddress: user.walletAddress,
      balance: user.balanceUsdc.toString(),
    });
  } catch (error) {
    console.error('[API] Error verifying user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
