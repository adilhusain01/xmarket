// Main Side Panel App

import React, { useEffect, useState } from 'react';
import { getStorageItem } from '../shared/storage';
import { TweetContext } from './components/TweetContext';
import { MarketList } from './components/MarketList';
import { WalletStatus } from './components/WalletStatus';
import { BetForm } from './components/BetForm';
import { BetFlowStatus } from './components/BetFlowStatus';
import { findMarketsForTweet } from './lib/market-matcher';
import { useBetFlow } from './hooks/useBetFlow';
import { useWallet } from './hooks/useWallet';

interface Tweet {
  tweetId: string;
  text: string;
  author?: string;
  authorHandle?: string;
  loggedInUser?: string;
}

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

function App() {
  // State
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);

  // Wallet hook (MetaMask)
  const { address, isConnected, init: initWallet } = useWallet();

  // Bet flow hook
  const { preparation, isLoading, error, prepare, reset } = useBetFlow();

  // Initialize wallet on mount (restore saved address)
  useEffect(() => {
    initWallet();
  }, []);

  // Load tweet from storage on mount
  useEffect(() => {
    loadTweetFromStorage();

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.lastTweet) {
        const newTweet = changes.lastTweet.newValue;
        if (newTweet) {
          console.log('[Xmarket] New tweet selected, updating side panel');
          setTweet(newTweet);
          setMarkets([]);
          setSelectedMarketId(null);
          reset();
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [reset]);

  // Load markets when tweet changes
  useEffect(() => {
    if (tweet) {
      console.log('[Xmarket] Loading markets for tweet:', tweet.tweetId);
      loadMarkets(tweet.text);
    }
  }, [tweet]);

  async function loadTweetFromStorage() {
    const lastTweet = await getStorageItem('lastTweet');
    if (lastTweet) {
      setTweet(lastTweet);
    }
  }

  async function loadMarkets(tweetText: string) {
    setIsLoadingMarkets(true);
    try {
      const foundMarkets = await findMarketsForTweet(tweetText);
      setMarkets(foundMarkets);

      if (foundMarkets.length > 0) {
        setSelectedMarketId(foundMarkets[0].id);
      }
    } catch (error) {
      console.error('Error loading markets:', error);
    } finally {
      setIsLoadingMarkets(false);
    }
  }

  async function handleBetSubmit(_side: 'yes' | 'no', amount: number) {
    if (!selectedMarketId || !address) return;

    await prepare(amount, address as `0x${string}`, false);
  }

  async function handleExecuteBridge() {
    alert(
      'Bridge execution requires wallet interaction. This will be implemented in the next phase.'
    );
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="app-title">Xmarket</div>
        <div className="app-subtitle">Bet on Polymarket from Twitter</div>
      </div>

      <div className="app-content">
        {/* Tweet Context */}
        {tweet && (
          <div className="section">
            <div className="section-title">Selected Tweet</div>
            <TweetContext
              tweetId={tweet.tweetId}
              text={tweet.text}
              author={tweet.author}
              authorHandle={tweet.authorHandle}
            />
          </div>
        )}

        {!tweet && (
          <div className="empty-state">
            <div className="empty-state-icon">&#x1F426;</div>
            <div className="empty-state-title">No Tweet Selected</div>
            <div className="empty-state-description">
              Click the "Bet" button on any tweet to get started.
            </div>
          </div>
        )}

        {/* Markets */}
        {tweet && (
          <div className="section">
            <div className="section-title">Related Markets</div>
            {isLoadingMarkets ? (
              <div className="loading">
                <div className="spinner"></div>
                Finding markets...
              </div>
            ) : markets.length > 0 ? (
              <MarketList
                markets={markets}
                selectedMarketId={selectedMarketId}
                onSelectMarket={setSelectedMarketId}
              />
            ) : (
              <div className="status-message" style={{
                background: '#fefce8',
                border: '1px solid #fde68a',
                color: '#92400e',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No Related Markets Found</div>
                <div style={{ fontSize: 12 }}>
                  Try selecting a tweet about a specific topic like politics, crypto, sports, or current events.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wallet Status */}
        {tweet && markets.length > 0 && (
          <WalletStatus />
        )}

        {/* Bet Form */}
        {tweet && markets.length > 0 && selectedMarketId && isConnected && address && (
          <>
            {preparation && (
              <BetFlowStatus
                preparation={preparation}
                onExecuteBridge={
                  preparation.status === 'needs-bridge' ? handleExecuteBridge : undefined
                }
                isExecuting={isLoading}
              />
            )}

            {error && !preparation && (
              <div className="status-message status-error">
                <div style={{ fontWeight: 600 }}>Error</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{error}</div>
              </div>
            )}

            {(!preparation || preparation.status === 'idle' || preparation.status === 'ready') && (
              <BetForm
                marketId={selectedMarketId}
                walletAddress={address}
                onSubmit={handleBetSubmit}
                isLoading={isLoading}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
