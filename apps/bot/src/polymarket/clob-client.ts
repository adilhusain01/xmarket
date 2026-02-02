import { ethers } from 'ethers';
import axios, { AxiosInstance } from 'axios';
import { POLYMARKET_CLOB_API } from '@xmarket/shared';

/**
 * Polymarket CLOB API Client
 * Implements authentication and order management
 */
export class ClobClient {
  private client: AxiosInstance;
  private wallet: ethers.Wallet;
  private apiKey?: string;
  private apiSecret?: string;
  private apiPassphrase?: string;

  constructor(privateKey: string, config?: {
    apiKey?: string;
    apiSecret?: string;
    apiPassphrase?: string;
  }) {
    this.wallet = new ethers.Wallet(privateKey);
    this.apiKey = config?.apiKey;
    this.apiSecret = config?.apiSecret;
    this.apiPassphrase = config?.apiPassphrase;

    this.client = axios.create({
      baseURL: POLYMARKET_CLOB_API,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(async (config) => {
      const timestamp = Date.now();
      const signature = await this.signRequest(config.url || '', timestamp);

      config.headers['POLY-ADDRESS'] = this.wallet.address;
      config.headers['POLY-SIGNATURE'] = signature;
      config.headers['POLY-TIMESTAMP'] = timestamp.toString();

      if (this.apiKey) {
        config.headers['POLY-API-KEY'] = this.apiKey;
      }

      return config;
    });
  }

  /**
   * Sign a request for authentication
   */
  private async signRequest(url: string, timestamp: number): Promise<string> {
    const message = `${timestamp}${url}`;
    return await this.wallet.signMessage(message);
  }

  /**
   * Get order book for a market
   */
  async getOrderBook(tokenId: string): Promise<any> {
    try {
      const response = await this.client.get(`/book`, {
        params: { token_id: tokenId },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching order book:', error);
      throw error;
    }
  }

  /**
   * Get current market prices
   */
  async getMarketPrice(tokenId: string): Promise<{ bid: number; ask: number }> {
    try {
      const orderBook = await this.getOrderBook(tokenId);

      // Get best bid (highest buy price)
      const bestBid = orderBook.bids?.[0]?.price || 0;

      // Get best ask (lowest sell price)
      const bestAsk = orderBook.asks?.[0]?.price || 1;

      return {
        bid: parseFloat(bestBid),
        ask: parseFloat(bestAsk),
      };
    } catch (error) {
      console.error('Error fetching market price:', error);
      return { bid: 0, ask: 1 };
    }
  }

  /**
   * Create a market order
   */
  async createMarketOrder(params: {
    tokenId: string;
    side: 'BUY' | 'SELL';
    amount: number;
  }): Promise<any> {
    try {
      // Get current market price
      const prices = await this.getMarketPrice(params.tokenId);
      const price = params.side === 'BUY' ? prices.ask : prices.bid;

      // Create limit order at market price
      return await this.createLimitOrder({
        tokenId: params.tokenId,
        side: params.side,
        price,
        size: params.amount / price,
      });
    } catch (error) {
      console.error('Error creating market order:', error);
      throw error;
    }
  }

  /**
   * Create a limit order
   */
  async createLimitOrder(params: {
    tokenId: string;
    side: 'BUY' | 'SELL';
    price: number;
    size: number;
  }): Promise<any> {
    try {
      const order = {
        token_id: params.tokenId,
        price: params.price.toString(),
        size: params.size.toString(),
        side: params.side,
        type: 'LIMIT',
        timestamp: Date.now(),
      };

      // Sign the order
      const signature = await this.signOrder(order);

      const response = await this.client.post('/order', {
        ...order,
        signature,
        owner: this.wallet.address,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating limit order:', error);
      throw error;
    }
  }

  /**
   * Sign an order
   */
  private async signOrder(order: any): Promise<string> {
    // Create EIP-712 structured data for order signing
    const domain = {
      name: 'Polymarket',
      version: '1',
      chainId: 137, // Polygon
    };

    const types = {
      Order: [
        { name: 'token_id', type: 'string' },
        { name: 'price', type: 'string' },
        { name: 'size', type: 'string' },
        { name: 'side', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
      ],
    };

    const value = {
      token_id: order.token_id,
      price: order.price,
      size: order.size,
      side: order.side,
      timestamp: order.timestamp,
    };

    // Sign using EIP-712
    return await this.wallet.signTypedData(domain, types, value);
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<any> {
    try {
      const response = await this.client.get(`/order/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order status:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<any> {
    try {
      const response = await this.client.delete(`/order/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }

  /**
   * Get user's open orders
   */
  async getOpenOrders(): Promise<any> {
    try {
      const response = await this.client.get('/orders', {
        params: { owner: this.wallet.address },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching open orders:', error);
      throw error;
    }
  }

  /**
   * Get user's positions
   */
  async getPositions(): Promise<any> {
    try {
      const response = await this.client.get('/positions', {
        params: { owner: this.wallet.address },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  }
}
