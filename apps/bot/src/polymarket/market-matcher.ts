import { Market, MarketSearchResult, POLYMARKET_GAMMA_API } from '@xmarket/shared';
import OpenAI from 'openai';

export class MarketMatcher {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /**
   * Fetch a single market by ID from Polymarket
   */
  async fetchMarketById(marketId: string): Promise<Market | null> {
    try {
      const response = await fetch(`${POLYMARKET_GAMMA_API}/markets/${marketId}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
      }

      const item = await response.json();

      // Transform to our Market type
      return {
        id: (item as any).condition_id || (item as any).conditionId || (item as any).id,
        question: (item as any).question || (item as any).title,
        description: (item as any).description,
        outcomes: (item as any).outcomes || (item as any).tokens?.map((t: any) => t.outcome) || ['Yes', 'No'],
        outcomePrices:
          (item as any).outcomePrices ||
          (item as any).tokens?.map((t: any) => parseFloat(t.price) || 0.5) ||
          [0.5, 0.5],
        volume: parseFloat((item as any).volume) || 0,
        liquidity: parseFloat((item as any).liquidity) || 0,
        active: (item as any).active !== false && !(item as any).closed,
        endDate: (item as any).endDate || (item as any).end_date_iso || (item as any).endDateIso,
        tags: (item as any).tags || [],
      };
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error);
      return null;
    }
  }

  /**
   * Find markets matching the query
   */
  async findMarkets(query: string): Promise<MarketSearchResult[]> {
    try {
      // Fetch active markets from Gamma API
      const markets = await this.fetchActiveMarkets();

      // Filter for binary markets only
      const binaryMarkets = markets.filter((m) => m.outcomes.length === 2);

      // Score and rank markets
      const scoredMarkets = await this.scoreMarkets(query, binaryMarkets);

      // Return top 3 results
      return scoredMarkets.slice(0, 3);
    } catch (error) {
      console.error('Error finding markets:', error);
      return [];
    }
  }

  /**
   * Fetch active markets from Polymarket Gamma API
   */
  private async fetchActiveMarkets(): Promise<Market[]> {
    try {
      // Gamma API v2 endpoint
      const response = await fetch(
        `${POLYMARKET_GAMMA_API}/markets?limit=100&closed=false&order=volume&offset=0`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both array and object responses
      const markets = Array.isArray(data) ? data : (data as any)?.data || [];

      // Transform to our Market type
      return markets.map((item: any) => ({
        id: item.condition_id || item.conditionId || item.id,
        question: item.question || item.title,
        description: item.description,
        outcomes: item.outcomes || item.tokens?.map((t: any) => t.outcome) || ['Yes', 'No'],
        outcomePrices:
          item.outcomePrices ||
          item.tokens?.map((t: any) => parseFloat(t.price) || 0.5) ||
          [0.5, 0.5],
        volume: parseFloat(item.volume) || 0,
        liquidity: parseFloat(item.liquidity) || 0,
        active: item.active !== false && !item.closed,
        endDate: item.endDate || item.end_date_iso || item.endDateIso,
        tags: item.tags || [],
      }));
    } catch (error) {
      console.error('Error fetching markets from Gamma API:', error);
      return [];
    }
  }

  /**
   * Score markets based on relevance to query
   */
  private async scoreMarkets(
    query: string,
    markets: Market[]
  ): Promise<MarketSearchResult[]> {
    const results: MarketSearchResult[] = [];

    for (const market of markets) {
      let score = 0;

      // Keyword matching in title
      const titleScore = this.calculateKeywordScore(
        query.toLowerCase(),
        market.question.toLowerCase()
      );
      score += titleScore * 10;

      // Keyword matching in description
      if (market.description) {
        const descScore = this.calculateKeywordScore(
          query.toLowerCase(),
          market.description.toLowerCase()
        );
        score += descScore * 5;
      }

      // Boost by volume (higher volume = more popular)
      if (market.volume) {
        score += Math.log10(market.volume + 1);
      }

      // Semantic similarity using embeddings (if OpenAI is available)
      if (this.openai) {
        const semanticScore = await this.calculateSemanticScore(query, market.question);
        score += semanticScore * 20;
      }

      results.push({ market, relevanceScore: score });
    }

    // Sort by score descending
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate keyword matching score
   */
  private calculateKeywordScore(query: string, text: string): number {
    const queryWords = query.split(/\s+/);
    let matches = 0;

    for (const word of queryWords) {
      if (word.length < 3) continue; // Skip very short words
      if (text.includes(word)) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }

  /**
   * Calculate semantic similarity using OpenAI embeddings
   */
  private async calculateSemanticScore(query: string, marketQuestion: string): Promise<number> {
    if (!this.openai) return 0;

    try {
      const [queryEmbedding, questionEmbedding] = await Promise.all([
        this.getEmbedding(query),
        this.getEmbedding(marketQuestion),
      ]);

      return this.cosineSimilarity(queryEmbedding, questionEmbedding);
    } catch (error) {
      console.error('Error calculating semantic score:', error);
      return 0;
    }
  }

  /**
   * Get embedding for text using OpenAI
   */
  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.openai) return [];

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
