import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@xmarket/db';

/**
 * Get deposit information for the user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        walletAddress: true,
        balanceUsdc: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      platformWallet: process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS,
      userWallet: user.walletAddress,
      currentBalance: user.balanceUsdc.toNumber(),
      instructions: [
        'Send USDC (on Polygon network) to the platform wallet address above',
        'Make sure to send from your linked wallet address',
        'Deposits are automatically credited within a few minutes',
        'Minimum deposit: $1 USDC',
      ],
    });
  } catch (error) {
    console.error('Error fetching deposit info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Update user's wallet address
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Update user's wallet address
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { walletAddress: walletAddress.toLowerCase() },
    });

    return NextResponse.json({
      success: true,
      walletAddress: user.walletAddress,
    });
  } catch (error) {
    console.error('Error updating wallet address:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
