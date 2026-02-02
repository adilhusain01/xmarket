import { ethers } from 'ethers';
import { prisma } from '@xmarket/db';
import { USDC_CONTRACT_ADDRESS, USDC_DECIMALS, TRANSACTION_TYPE } from '@xmarket/shared';

/**
 * Wallet service for managing deposits and withdrawals
 * Monitors the platform wallet for incoming USDC transfers
 */
export class WalletService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private usdcContract: ethers.Contract;
  private isMonitoring: boolean = false;

  constructor() {
    const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY!;
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    // USDC ERC20 ABI (minimal)
    const erc20Abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address owner) view returns (uint256)',
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ];

    this.usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, erc20Abi, this.wallet);

    console.log('✅ Wallet service initialized');
    console.log('📍 Platform wallet:', this.wallet.address);
  }

  /**
   * Start monitoring deposits to the platform wallet
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('Wallet monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('👂 Monitoring USDC deposits to platform wallet...');

    // Listen for Transfer events to our wallet
    this.usdcContract.on(
      this.usdcContract.filters.Transfer(null, this.wallet.address),
      async (from: string, to: string, amount: bigint, event: any) => {
        console.log(`\n💰 Deposit detected: ${ethers.formatUnits(amount, USDC_DECIMALS)} USDC`);
        console.log(`   From: ${from}`);
        console.log(`   Tx: ${event.log.transactionHash}`);

        await this.processDeposit(from, amount, event.log.transactionHash);
      }
    );

    // Also poll for historical deposits every 5 minutes
    setInterval(() => this.checkMissedDeposits(), 5 * 60 * 1000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.usdcContract.removeAllListeners();
    this.isMonitoring = false;
    console.log('Stopped wallet monitoring');
  }

  /**
   * Process a deposit
   */
  private async processDeposit(
    fromAddress: string,
    amount: bigint,
    txHash: string
  ): Promise<void> {
    try {
      // Check if already processed
      const existing = await prisma.transaction.findFirst({
        where: { txHash },
      });

      if (existing) {
        console.log('⚠️  Deposit already processed');
        return;
      }

      // Find user by wallet address
      const user = await prisma.user.findFirst({
        where: { walletAddress: fromAddress.toLowerCase() },
      });

      if (!user) {
        console.warn(`⚠️  No user found for wallet ${fromAddress}`);
        // Could store in pending deposits table for manual review
        return;
      }

      const amountUsdc = parseFloat(ethers.formatUnits(amount, USDC_DECIMALS));

      // Update user balance and create transaction record
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            balanceUsdc: {
              increment: amountUsdc,
            },
          },
        }),
        prisma.transaction.create({
          data: {
            userId: user.id,
            type: TRANSACTION_TYPE.DEPOSIT,
            amountUsdc,
            txHash,
          },
        }),
      ]);

      console.log(`✅ Credited ${amountUsdc} USDC to user ${user.xUsername}`);
    } catch (error) {
      console.error('Error processing deposit:', error);
    }
  }

  /**
   * Check for missed deposits (e.g., if bot was down)
   */
  private async checkMissedDeposits(): Promise<void> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = currentBlock - 1000; // Check last ~30 minutes

      const filter = this.usdcContract.filters.Transfer(null, this.wallet.address);
      const events = await this.usdcContract.queryFilter(filter, fromBlock, currentBlock);

      for (const event of events) {
        const [from, to, amount] = event.args as [string, string, bigint];
        await this.processDeposit(from, amount, event.transactionHash);
      }
    } catch (error) {
      console.error('Error checking missed deposits:', error);
    }
  }

  /**
   * Process a withdrawal request
   */
  async processWithdrawal(userId: string, amount: number): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (!user.walletAddress) {
        return { success: false, error: 'No wallet address linked' };
      }

      if (user.balanceUsdc.toNumber() < amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Convert to USDC units
      const amountUsdc = ethers.parseUnits(amount.toString(), USDC_DECIMALS);

      // Execute transfer
      const tx = await this.usdcContract.transfer(user.walletAddress, amountUsdc);
      await tx.wait();

      // Update balance and create transaction record
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            balanceUsdc: {
              decrement: amount,
            },
          },
        }),
        prisma.transaction.create({
          data: {
            userId,
            type: TRANSACTION_TYPE.WITHDRAWAL,
            amountUsdc: -amount,
            txHash: tx.hash,
          },
        }),
      ]);

      console.log(`✅ Withdrawal complete: ${amount} USDC to ${user.walletAddress}`);

      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get platform wallet balance
   */
  async getPlatformBalance(): Promise<number> {
    try {
      const balance = await this.usdcContract.balanceOf(this.wallet.address);
      return parseFloat(ethers.formatUnits(balance, USDC_DECIMALS));
    } catch (error) {
      console.error('Error fetching platform balance:', error);
      return 0;
    }
  }

  /**
   * Get total user balances (for reconciliation)
   */
  async getTotalUserBalances(): Promise<number> {
    try {
      const result = await prisma.user.aggregate({
        _sum: {
          balanceUsdc: true,
        },
      });
      return result._sum.balanceUsdc?.toNumber() || 0;
    } catch (error) {
      console.error('Error fetching total user balances:', error);
      return 0;
    }
  }
}
