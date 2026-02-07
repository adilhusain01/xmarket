import { sendMessage, MessageType } from '../../shared/messaging';

// Market matching service - improved keyword-based search

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
  singleMatches: number;
  bigramMatches: number;
  matchRatio: number;
}

// Minimal stop words - only truly generic words
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'has', 'have', 'had',
  'do', 'does', 'did', 'this', 'that', 'it', 'its', 'not', 'no', 'so', 'if',
  'just', 'about', 'get', 'got', 'than', 'then', 'now', 'how', 'all', 'will',
  'can', 'would', 'could', 'should', 'may', 'might', 'here', 'there', 'what',
  'when', 'where', 'who', 'which', 'why', 'from', 'up', 'out', 'into', 'over',
  'after', 'before', 'between', 'under', 'again', 'also', 'been', 'being',
  'very', 'too', 'really', 'much', 'many', 'some', 'any', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'such', 'only', 'same', 'own',
  // Common tweet/news filler words that match everything
  'says', 'said', 'told', 'heard', 'think', 'thinks', 'know', 'like', 'going',
  'gonna', 'want', 'wants', 'need', 'needs', 'make', 'makes', 'made', 'take',
  'new', 'just', 'still', 'even', 'back', 'way', 'day', 'week', 'year',
  'time', 'people', 'right', 'good', 'great', 'big', 'long', 'high', 'low',
  'last', 'first', 'next', 'look', 'come', 'see', 'let', 'give', 'keep',
]);

// Extract keywords from tweet text
function extractKeywords(text: string): { words: string[]; bigrams: string[] } {
  // Remove URLs
  let cleaned = text.replace(/https?:\/\/\S+/g, '');
  // Remove @mentions
  cleaned = cleaned.replace(/@\w+/g, '');
  // Remove hashtags symbol but keep text
  cleaned = cleaned.replace(/#/g, '');
  // Convert to lowercase
  cleaned = cleaned.toLowerCase();

  // Split into words, keep alphanumeric (including numbers like "2028", "100k")
  const allWords = cleaned
    .split(/\s+/)
    .map((w) => w.replace(/[^\w]/g, ''))
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  // Deduplicate words
  const words = [...new Set(allWords)];

  // Extract bigrams (consecutive word pairs) for better matching
  const bigrams: string[] = [];
  for (let i = 0; i < allWords.length - 1; i++) {
    const bigram = `${allWords[i]} ${allWords[i + 1]}`;
    bigrams.push(bigram);
  }
  const uniqueBigrams = [...new Set(bigrams)];

  return { words, bigrams: uniqueBigrams };
}

// Calculate keyword overlap score - no synonyms, clean scoring
function calculateKeywordScore(
  words: string[],
  bigrams: string[],
  marketText: string
): { score: number; singleMatches: number; bigramMatches: number } {
  const marketLower = marketText.toLowerCase();

  let score = 0;
  let singleMatches = 0;
  let bigramMatches = 0;

  // Score bigrams (worth more - they indicate topic specificity)
  for (const bigram of bigrams) {
    if (marketLower.includes(bigram)) {
      score += 5;
      bigramMatches++;
    }
  }

  // Score individual words
  for (const word of words) {
    // Exact word boundary match
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(marketLower)) {
      score += 3;
      singleMatches++;
    }
    // Substring match (weaker)
    else if (marketLower.includes(word)) {
      score += 1;
      singleMatches++;
    }
  }

  // Normalize by keyword count to avoid bias toward long tweets
  const keywordCount = words.length + bigrams.length;
  if (keywordCount > 0) {
    score = score / Math.sqrt(keywordCount);
  }

  return { score, singleMatches, bigramMatches };
}

// Fetch markets by asking the background service worker (avoids CORS issues)
async function fetchMarkets(keywords: string[]): Promise<Market[]> {
  try {
    const response = await sendMessage(MessageType.SEARCH_MARKETS, {
      keywords,
      isTestnet: false,
    });
    if (response?.error) {
      throw new Error(response.error);
    }

    return response.markets || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Xmarket] Error requesting markets from background:', errorMessage);

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
  _isTestnet: boolean = false
): Promise<Market[]> {
  try {
    const { words, bigrams } = extractKeywords(tweetText);
    console.log('[Xmarket] Extracted keywords:', words);
    console.log('[Xmarket] Extracted bigrams:', bigrams);

    // Fetch markets (always mainnet)
    const markets = await fetchMarkets(words);
    console.log('[Xmarket] Fetched markets from API:', markets.length);

    if (markets.length === 0) {
      console.warn('[Xmarket] No markets returned from API');
      return [];
    }

    // Filter to binary markets only
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

    // If no keywords extracted, return empty (not random markets)
    if (words.length === 0) {
      console.log('[Xmarket] No keywords extracted from tweet, returning empty');
      return [];
    }

    // Score markets based on keyword overlap
    const scored: ScoredMarket[] = binaryMarkets.map((market) => {
      const questionResult = calculateKeywordScore(words, bigrams, market.question);
      const descResult = market.description
        ? calculateKeywordScore(words, bigrams, market.description)
        : { score: 0, singleMatches: 0, bigramMatches: 0 };

      // Combine scores with question weighted higher
      const totalScore = questionResult.score * 2.5 + descResult.score;
      const totalSingleMatches = questionResult.singleMatches + descResult.singleMatches;
      const totalBigramMatches = questionResult.bigramMatches + descResult.bigramMatches;

      // Match ratio: what fraction of the tweet's keywords appear in the market
      const matchRatio = words.length > 0 ? totalSingleMatches / words.length : 0;

      return {
        market,
        score: totalScore,
        singleMatches: totalSingleMatches,
        bigramMatches: totalBigramMatches,
        matchRatio,
      };
    });

    // Dynamic minimum matches: at least 20% of keywords, minimum 2, max 5
    const minMatches = Math.max(2, Math.min(5, Math.ceil(words.length * 0.2)));

    console.log(`[Xmarket] Filtering: require >= ${minMatches} single matches (${words.length} keywords) or >= 1 bigram`);

    // Filter: require proportional keyword overlap OR bigram match
    const matches = scored
      .filter((s) => s.singleMatches >= minMatches || s.bigramMatches >= 1)
      .sort((a, b) => {
        // Sort by match ratio first (how relevant), then by score, then volume
        if (Math.abs(b.matchRatio - a.matchRatio) > 0.1) return b.matchRatio - a.matchRatio;
        if (b.score !== a.score) return b.score - a.score;
        return parseFloat(b.market.volume || '0') - parseFloat(a.market.volume || '0');
      })
      .slice(0, 10)
      .map((s) => s.market);

    console.log('[Xmarket] Keyword matched markets:', matches.length);

    // No fallback to random markets - return empty if no real matches
    if (matches.length === 0) {
      console.log('[Xmarket] No matching markets found for this tweet');
      return [];
    }

    console.log('[Xmarket] Top matches:', matches.slice(0, 3).map(m => ({
      question: m.question.substring(0, 60),
      volume: m.volume,
      score: scored.find(s => s.market.id === m.id)?.score.toFixed(2),
    })));

    return matches;
  } catch (error) {
    console.error('[Xmarket] Error in findMarketsForTweet:', error);
    throw error;
  }
}

// Format market for display - with proper parsing
export function formatMarket(market: Market) {
  // Parse outcomePrices - API returns as JSON string: "[\"0.52\",\"0.48\"]"
  let prices: number[] = [0.5, 0.5];
  let pricesParsed = false;

  try {
    const pricesData = typeof market.outcomePrices === 'string'
      ? JSON.parse(market.outcomePrices)
      : market.outcomePrices;

    if (Array.isArray(pricesData) && pricesData.length === 2) {
      const p0 = parseFloat(pricesData[0]);
      const p1 = parseFloat(pricesData[1]);
      if (!isNaN(p0) && !isNaN(p1)) {
        prices = [p0, p1];
        pricesParsed = true;
      } else {
        console.warn('[Xmarket] outcomePrices contain NaN for market:', market.id, pricesData);
      }
    } else {
      console.warn('[Xmarket] outcomePrices unexpected format for market:', market.id, pricesData);
    }
  } catch (err) {
    console.warn('[Xmarket] Failed to parse outcomePrices for market:', market.id, market.outcomePrices, err);
  }

  // Also try tokens array as backup for prices
  if (!pricesParsed && market.tokens) {
    try {
      const tokensData = typeof market.tokens === 'string'
        ? JSON.parse(market.tokens)
        : market.tokens;

      if (Array.isArray(tokensData) && tokensData.length >= 2) {
        const yesToken = tokensData.find((t: any) => t.outcome === 'Yes');
        const noToken = tokensData.find((t: any) => t.outcome === 'No');
        if (yesToken?.price && noToken?.price) {
          prices = [parseFloat(yesToken.price), parseFloat(noToken.price)];
          pricesParsed = true;
        }
      }
    } catch (err) {
      console.warn('[Xmarket] Failed to parse tokens for market:', market.id, err);
    }
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
    pricesParsed,
  };
}
