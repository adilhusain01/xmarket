import { sendMessage, MessageType } from '../../shared/messaging';

// Market matching service - keyword-based search

interface Market {
  id: string;
  question: string;
  description?: string;
  outcomes: string | string[];
  outcomePrices?: string | string[];
  tokens?: string | Array<{
    outcome: string;
    price: string;
    token_id: string;
  }>;
  volume?: string;
  liquidity?: string;
  end_date_iso?: string;
  image?: string;
}

interface ScoredMarket {
  market: Market;
  score: number;
}

// Extract keywords from tweet text
function extractKeywords(text: string): string[] {
  // Remove URLs
  let cleaned = text.replace(/https?:\/\/\S+/g, '');

  // Remove @mentions
  cleaned = cleaned.replace(/@\w+/g, '');

  // Remove hashtags but keep the text
  cleaned = cleaned.replace(/#/g, '');

  // Convert to lowercase
  cleaned = cleaned.toLowerCase();

  // Important terms that should always be kept (crypto, tech, politics, etc.)
  const importantTerms = new Set([
    'btc', 'eth', 'ai', 'gpt', 'fed', 'sec', 'gdp', 'cpi', 'nyc', 'la', 'uk', 'us',
    'nft', 'dao', 'web3', 'defi', 'nba', 'nfl', 'mlb', 'ufc', 'elon'
  ]);

  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'can', 'this', 'that',
  ]);

  // Split into words and filter
  const words = cleaned
    .split(/\s+/)
    .map((w) => w.replace(/[^\w]/g, ''))
    .filter((w) => {
      if (w.length === 0) return false;
      // Keep important terms regardless of length
      if (importantTerms.has(w)) return true;
      // Keep words longer than 2 chars that aren't stop words
      return w.length > 2 && !stopWords.has(w);
    });

  return words;
}

// Calculate keyword overlap score
function calculateKeywordScore(keywords: string[], marketText: string): number {
  const marketLower = marketText.toLowerCase();

  // Keyword synonyms and expansions for better matching
  const synonyms: Record<string, string[]> = {
    'bitcoin': ['btc', 'bitcoin'],
    'btc': ['btc', 'bitcoin'],
    'ethereum': ['eth', 'ethereum'],
    'eth': ['eth', 'ethereum'],
    'crypto': ['cryptocurrency', 'crypto', 'bitcoin', 'btc', 'eth', 'ethereum'],
    'price': ['price', 'reach', 'hit', 'above', 'below'],
    'trump': ['donald', 'trump', 'president'],
    'election': ['election', 'vote', 'presidential'],
  };

  let score = 0;
  let matchCount = 0;

  keywords.forEach((keyword) => {
    // Get all variations of this keyword
    const variations = synonyms[keyword] || [keyword];
    
    let keywordMatched = false;
    
    variations.forEach((variation) => {
      // Exact word match
      const regex = new RegExp(`\\b${variation}\\b`, 'gi');
      const matches = marketLower.match(regex);
      if (matches) {
        score += matches.length * 3; // Weight exact matches higher
        keywordMatched = true;
      }
      // Partial match (substring)
      else if (marketLower.includes(variation)) {
        score += 1;
        keywordMatched = true;
      }
    });
    
    if (keywordMatched) {
      matchCount++;
    }
  });

  // Boost score if multiple keywords match
  if (matchCount > 1) {
    score *= 1.5;
  }

  return score;
}

// Fetch markets by asking the background service worker (avoids CORS issues)
async function fetchMarkets(isTestnet: boolean, keywords: string[]): Promise<Market[]> {
  try {
    const response = await sendMessage(MessageType.SEARCH_MARKETS, { 
      keywords, 
      isTestnet 
    });
    if (response?.error) {
      throw new Error(response.error);
    }

    return response.markets || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Xmarket] Error requesting markets from background:', errorMessage);
    
    // Provide more context for common errors
    if (errorMessage.includes('context')) {
      throw new Error('Extension connection lost. Please reload the page.');
    } else if (errorMessage.includes('fetch')) {
      throw new Error('Failed to fetch markets. Please check your internet connection.');
    }
    
    throw error;
  }
}

// Find markets matching tweet content
export async function findMarketsForTweet(
  tweetText: string,
  isTestnet: boolean = false
): Promise<Market[]> {
  try {
    // Extract keywords from tweet
    const keywords = extractKeywords(tweetText);
    console.log('[Xmarket] Extracted keywords:', keywords);
    console.log('[Xmarket] Original tweet text:', tweetText);

    // Fetch markets (API doesn't support search, so we fetch all and filter)
    const markets = await fetchMarkets(isTestnet, keywords);
    console.log('[Xmarket] Fetched markets from API:', markets.length);

    if (markets.length === 0) {
      console.warn('[Xmarket] No markets returned from API');
      return [];
    }

    // Filter to binary markets only
    // Note: API returns outcomes as JSON string, not array
    const binaryMarkets = markets.filter((m) => {
      try {
        const outcomes = typeof m.outcomes === 'string' 
          ? JSON.parse(m.outcomes) 
          : m.outcomes;
        return outcomes.length === 2 && 
               outcomes.includes('Yes') && 
               outcomes.includes('No');
      } catch {
        return false;
      }
    });

    console.log('[Xmarket] Binary markets:', binaryMarkets.length);

    // If no keywords, return top by volume
    if (keywords.length === 0) {
      console.log('[Xmarket] No keywords, returning top markets by volume');
      return binaryMarkets
        .sort((a, b) => parseFloat(b.volume || '0') - parseFloat(a.volume || '0'))
        .slice(0, 10);
    }

    // Score markets based on keyword overlap
    const scored: ScoredMarket[] = binaryMarkets.map((market) => {
      const questionScore = calculateKeywordScore(keywords, market.question);
      const descScore = market.description
        ? calculateKeywordScore(keywords, market.description)
        : 0;

      // Combine scores with question weighted higher
      let totalScore = questionScore * 2.5 + descScore;
      
      // Boost crypto/blockchain-related markets if keywords include related terms
      const hasCryptoKeyword = keywords.some(k => 
        ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'defi', 'nft', 
         'web3', 'token', 'dao', 'l2', 'layer', 'chain', 'monad', 'solana', 'base', 
         'arbitrum', 'optimism', 'polygon', 'avalanche', 'cosmos'].includes(k.toLowerCase())
      );
      const isCryptoMarket = /bitcoin|btc|crypto|ethereum|eth|blockchain|defi|web3|nft|token|solana|base|arbitrum|polygon/i.test(market.question);
      if (hasCryptoKeyword && isCryptoMarket) {
        totalScore *= 2; // Double the score for crypto keyword + crypto market
      }

      return {
        market,
        score: totalScore,
      };
    });

    // Filter to matches and sort by score, then volume
    const matches = scored
      .filter((s) => s.score > 1.0) // Raise threshold to reduce noise
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return parseFloat(b.market.volume || '0') - parseFloat(a.market.volume || '0');
      })
      .slice(0, 10)
      .map((s) => s.market);

    console.log('[Xmarket] Keyword matched markets:', matches.length);
    
    // If no keyword matches, use smart fallback
    if (matches.length === 0) {
      console.log('[Xmarket] No keyword matches');
      
      // If tweet had crypto keywords, show crypto markets by volume
      const hasCryptoKeyword = keywords.some(k => 
        ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'defi', 'nft', 
         'web3', 'token', 'dao', 'l2', 'layer', 'chain', 'monad', 'solana', 'base'].includes(k.toLowerCase())
      );
      
      if (hasCryptoKeyword) {
        console.log('[Xmarket] Showing crypto markets as fallback');
        const cryptoMarkets = binaryMarkets.filter(m => 
          /bitcoin|btc|crypto|ethereum|eth|blockchain|defi|web3|nft|token|solana|base|arbitrum|polygon/i.test(m.question)
        );
        if (cryptoMarkets.length > 0) {
          return cryptoMarkets
            .sort((a, b) => parseFloat(b.volume || '0') - parseFloat(a.volume || '0'))
            .slice(0, 10);
        }
      }
      
      // Otherwise show top markets by volume
      console.log('[Xmarket] Showing top markets by volume');
      return binaryMarkets
        .sort((a, b) => parseFloat(b.volume || '0') - parseFloat(a.volume || '0'))
        .slice(0, 10);
    }

    console.log('[Xmarket] Top matches:', matches.slice(0, 3).map(m => ({ 
      question: m.question.substring(0, 60), 
      volume: m.volume,
      score: scored.find(s => s.market.id === m.id)?.score.toFixed(2)
    })));
    
    return matches;
  } catch (error) {
    console.error('[Xmarket] Error in findMarketsForTweet:', error);
    throw error;
  }
}

// Format market for display
export function formatMarket(market: Market) {
  // Parse outcomePrices if it's a JSON string
  let prices: number[] = [0.5, 0.5];
  try {
    const pricesData = typeof market.outcomePrices === 'string'
      ? JSON.parse(market.outcomePrices)
      : market.outcomePrices;
    
    if (Array.isArray(pricesData) && pricesData.length === 2) {
      prices = [parseFloat(pricesData[0]), parseFloat(pricesData[1])];
    }
  } catch (err) {
    console.warn('[Xmarket] Failed to parse outcomePrices for market:', market.id, err);
  }

  const volume = market.volume ? parseFloat(market.volume) : 0;
  const formattedVolume = volume > 1000000
    ? `$${(volume / 1000000).toFixed(1)}M`
    : volume > 1000
    ? `$${(volume / 1000).toFixed(0)}K`
    : `$${volume.toFixed(0)}`;

  return {
    id: market.id,
    question: market.question,
    yesPrice: (prices[0] * 100).toFixed(0) + '%',
    noPrice: (prices[1] * 100).toFixed(0) + '%',
    volume: formattedVolume,
    endDate: market.end_date_iso,
    image: market.image,
  };
}
