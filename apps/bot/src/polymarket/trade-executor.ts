import { BetRequest, BetResult } from '@xmarket/shared';
import { ethers } from 'ethers';
import { ClobClient } from './clob-client.js';

/**
 * Trade executor for Polymarket CLOB API
 * Uses custodial wallet approach - platform holds funds
 */
export class TradeExecutor {
  private wallet: ethers.Wallet | null = null;
  private clobClient: ClobClient | null = null;
  private useMockMode: boolean = false;

  constructor() {
    if (process.env.PLATFORM_WALLET_PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(process.env.PLATFORM_WALLET_PRIVATE_KEY);

      // Initialize CLOB client
      this.clobClient = new ClobClient(process.env.PLATFORM_WALLET_PRIVATE_KEY, {
        apiKey: process.env.POLYMARKET_API_KEY,
        apiSecret: process.env.POLYMARKET_API_SECRET,
        apiPassphrase: process.env.POLYMARKET_API_PASSPHRASE,
      });

      console.log('✅ Trade executor initialized with wallet:', this.wallet.address);
    } else {
      console.warn('⚠️  Platform wallet not configured, using mock mode');
      this.useMockMode = true;
    }
  }

  /**
   * Place a bet on a market
   */
  async placeBet(request: BetRequest): Promise<BetResult> {
    if (!this.clobClient || this.useMockMode) {
      return this.placeMockBet(request);
    }

    try {
      console.log('Executing trade:', request);

      // Get market token IDs (Yes and No tokens)
      const { yesTokenId, noTokenId } = await this.getMarketTokens(request.marketId);
      const tokenId = request.side === 'yes' ? yesTokenId : noTokenId;

      // Get current market price
      const prices = await this.clobClient.getMarketPrice(tokenId);
      const currentPrice = prices.ask; // We're buying, so use ask price

      // Create market order (buy at current ask price)
      const order = await this.clobClient.createMarketOrder({
        tokenId,
        side: 'BUY',
        amount: request.amount,
      });

      // Calculate shares based on actual fill
      const shares = request.amount / currentPrice;

      return {
        success: true,
        orderId: order.id || order.orderId,
        shares,
        price: currentPrice,
      };
    } catch (error) {
      console.error('Error placing bet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Place a mock bet (for testing without real API)
   */
  private async placeMockBet(request: BetRequest): Promise<BetResult> {
    console.log('Executing MOCK trade:', request);

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockPrice = request.side === 'yes' ? 0.45 : 0.55;
    const mockShares = request.amount / mockPrice;

    return {
      success: true,
      orderId: this.generateMockOrderId(),
      shares: mockShares,
      price: mockPrice,
    };
  }

  /**
   * Generate a mock order ID (for testing)
   */
  private generateMockOrderId(): string {
    return '0x' + Math.random().toString(16).slice(2, 18).padEnd(64, '0');
  }

  /**
   * Get token IDs for a market
   * In reality, you'd fetch this from the Gamma API or store it
   */
  private async getMarketTokens(
    marketId: string
  ): Promise<{ yesTokenId: string; noTokenId: string }> {
    // For now, using the market ID as base
    // In production, fetch from Gamma API
    return {
      yesTokenId: `${marketId}_yes`,
      noTokenId: `${marketId}_no`,
    };
  }

  /**
   * Get current market prices
   */
  async getMarketPrices(marketId: string): Promise<{ yes: number; no: number } | null> {
    if (!this.clobClient || this.useMockMode) {
      return { yes: 0.45, no: 0.55 };
    }

    try {
      const { yesTokenId, noTokenId } = await this.getMarketTokens(marketId);

      const [yesPrices, noPrices] = await Promise.all([
        this.clobClient.getMarketPrice(yesTokenId),
        this.clobClient.getMarketPrice(noTokenId),
      ]);

      return {
        yes: yesPrices.ask,
        no: noPrices.ask,
      };
    } catch (error) {
      console.error('Error fetching market prices:', error);
      return null;
    }
  }

  /**
   * Get user's open orders
   */
  async getOpenOrders(): Promise<any[]> {
    if (!this.clobClient || this.useMockMode) {
      return [];
    }

    try {
      return await this.clobClient.getOpenOrders();
    } catch (error) {
      console.error('Error fetching open orders:', error);
      return [];
    }
  }

  /**
   * Get user's positions
   */
  async getPositions(): Promise<any[]> {
    if (!this.clobClient || this.useMockMode) {
      return [];
    }

    try {
      return await this.clobClient.getPositions();
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.clobClient || this.useMockMode) {
      return false;
    }

    try {
      await this.clobClient.cancelOrder(orderId);
      return true;
    } catch (error) {
      console.error('Error canceling order:', error);
      return false;
    }
  }
}
