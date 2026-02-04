import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@xmarket/db';
import { ethers } from 'ethers';

/**
 * Link a wallet by verifying a signed message
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { address, message, signature } = await request.json();

    if (!address || !message || !signature) {
      return NextResponse.json({ error: 'Missing address, message, or signature' }, { status: 400 });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }

    // Check the message contains the correct user ID to prevent replay
    if (!message.includes(session.user.id)) {
      return NextResponse.json({ error: 'Invalid message payload' }, { status: 400 });
    }

    // Save wallet address
    await prisma.user.update({
      where: { id: session.user.id },
      data: { walletAddress: address.toLowerCase() },
    });

    return NextResponse.json({ success: true, walletAddress: address.toLowerCase() });
  } catch (error) {
    console.error('Error linking wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Unlink wallet
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { walletAddress: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
