import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@xmarket/db';

/**
 * Request a withdrawal
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.walletAddress) {
      return NextResponse.json(
        { error: 'No wallet address linked. Please connect your wallet first.' },
        { status: 400 }
      );
    }

    if (user.balanceUsdc.toNumber() < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Create pending withdrawal transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'withdrawal',
        amountUsdc: -amount,
        metadata: {
          status: 'pending',
          toAddress: user.walletAddress,
        },
      },
    });

    // In production, you would:
    // 1. Send this to a queue for processing
    // 2. Have the bot service process withdrawals
    // 3. Update transaction with txHash when complete

    // For now, return pending status
    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      status: 'pending',
      message: 'Withdrawal request submitted. Processing may take a few minutes.',
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get withdrawal history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const withdrawals = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: 'withdrawal',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
