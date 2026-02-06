// Test script to verify database connection and add a test user
import { prisma } from '../src/index';

async function main() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    // Check if any users exist
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}\n`);

    // Create a test user for demo purposes
    const testTwitterHandle = 'simplykashif';
    const testWalletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

    const existingUser = await prisma.user.findFirst({
      where: {
        xUsername: {
          equals: testTwitterHandle,
          mode: 'insensitive',
        },
      },
    });

    if (existingUser) {
      console.log(`✅ Test user @${testTwitterHandle} already exists`);
      console.log(`   Wallet: ${existingUser.walletAddress}`);
      console.log(`   Balance: $${existingUser.balanceUsdc.toString()}\n`);
    } else {
      console.log(`➕ Creating test user @${testTwitterHandle}...`);
      
      const newUser = await prisma.user.create({
        data: {
          xUserId: '1234567890', // Mock Twitter user ID
          xUsername: testTwitterHandle,
          walletAddress: testWalletAddress,
          balanceUsdc: 100.0, // Give them $100 USDC for testing
        },
      });

      console.log(`✅ Test user created successfully!`);
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Twitter: @${newUser.xUsername}`);
      console.log(`   Wallet: ${newUser.walletAddress}`);
      console.log(`   Balance: $${newUser.balanceUsdc.toString()}\n`);
    }

    // List all users
    console.log('📋 All registered users:');
    const allUsers = await prisma.user.findMany({
      select: {
        xUsername: true,
        walletAddress: true,
        balanceUsdc: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (allUsers.length === 0) {
      console.log('   (none)\n');
    } else {
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. @${user.xUsername || 'unknown'}`);
        console.log(`      Wallet: ${user.walletAddress || 'none'}`);
        console.log(`      Balance: $${user.balanceUsdc.toString()}`);
        console.log(`      Created: ${user.createdAt.toISOString()}\n`);
      });
    }

    console.log('✨ Database test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
