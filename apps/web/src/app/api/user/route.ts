import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@xmarket/db';

export async function GET(request: NextRequest) {
  try {
    // In a real app, you'd get the user from the session
    // For now, returning mock data
    return NextResponse.json({
      balanceUsdc: 100.0,
      activeBets: 0,
      totalVolume: 0,
      xUsername: null,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { xUserId, xUsername, walletAddress } = body;

    // Create or update user
    const user = await prisma.user.upsert({
      where: { xUserId },
      create: {
        xUserId,
        xUsername,
        walletAddress,
      },
      update: {
        xUsername,
        walletAddress,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
