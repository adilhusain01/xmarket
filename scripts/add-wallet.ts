// Quick script to add wallet address to user
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = '0xAdilHusain';
  const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

  console.log(`\nUpdating user @${username}...`);

  const user = await prisma.user.update({
    where: {
      xUsername: username,
    },
    data: {
      walletAddress: walletAddress,
      balanceUsdc: 100.0, // Give $100 USDC for testing
    },
  });

  console.log('✅ Updated successfully!');
  console.log(`   Twitter: @${user.xUsername}`);
  console.log(`   Wallet: ${user.walletAddress}`);
  console.log(`   Balance: $${user.balanceUsdc}\n`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
