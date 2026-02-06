// Main Side Panel App

import React, { useEffect, useState } from 'react';
import { getStorageItem, setStorageItem } from '../shared/storage';
import { TweetContext } from './components/TweetContext';
import { MarketList } from './components/MarketList';
import { WalletStatus } from './components/WalletStatus';
import { BetForm } from './components/BetForm';
import { BetFlowStatus } from './components/BetFlowStatus';
import { findMarketsForTweet } from './lib/market-matcher';
import { useBetFlow } from './hooks/useBetFlow';
import { verifyTwitterUser, type UserVerificationResult } from './lib/user-service';

interface Tweet {
  tweetId: string;
  text: string;
  author?: string;
  authorHandle?: string;
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
  const [isTestnet, setIsTestnet] = useState(false);
  
  // User verification state
  const [userVerification, setUserVerification] = useState<UserVerificationResult | null>(null);
  const [isVerifyingUser, setIsVerifyingUser] = useState(false);

  // Hooks
  const { preparation, isLoading, error, prepare, execute, reset } = useBetFlow();
  
  // Get wallet address from verification or use placeholder
  const walletAddress = userVerification?.walletAddress || '0x0000000000000000000000000000000000000000' as `0x${string}`;

  // Load tweet from storage on mount
  useEffect(() => {
    loadTweetFromStorage();
    
    // Listen for storage changes (when a new tweet is selected)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.lastTweet) {
        const newTweet = changes.lastTweet.newValue;
        if (newTweet) {
          console.log('[Xmarket] New tweet selected, updating side panel');
          setTweet(newTweet);
          // Reset state for the new tweet
          setMarkets([]);
          setSelectedMarketId(null);
          reset();
        }
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [reset]);

  // Load markets when tweet changes
  useEffect(() => {
    if (tweet) {
      console.log('[Xmarket] Loading markets for tweet:', tweet.tweetId);
      loadMarkets(tweet.text);
      
      // Verify user when tweet loads (if we have author handle)
      if (tweet.authorHandle) {
        verifyUser(tweet.authorHandle);
      }
    }
  }, [tweet, isTestnet]); // Also reload when testnet mode changes

  async function loadTweetFromStorage() {
    const lastTweet = await getStorageItem('lastTweet');
    if (lastTweet) {
      setTweet(lastTweet);
    }
  }

  async function verifyUser(twitterHandle: string) {
    setIsVerifyingUser(true);
    setUserVerification(null);
    
    try {
      const result = await verifyTwitterUser(twitterHandle);
      setUserVerification(result);
      
      if (!result.isRegistered) {
        console.warn(`[Xmarket] User @${twitterHandle} not registered:`, result.error);
      }
    } catch (error) {
      console.error('[Xmarket] User verification error:', error);
      setUserVerification({
        isRegistered: false,
        error: 'Failed to verify user. Please try again.',
      });
    } finally {
      setIsVerifyingUser(false);
    }
  }

  async function loadMarkets(tweetText: string) {
    setIsLoadingMarkets(true);
    try {
      const foundMarkets = await findMarketsForTweet(tweetText, isTestnet);
      setMarkets(foundMarkets);

      // Auto-select first market
      if (foundMarkets.length > 0) {
        setSelectedMarketId(foundMarkets[0].id);
      }
    } catch (error) {
      console.error('Error loading markets:', error);
    } finally {
      setIsLoadingMarkets(false);
    }
  }

  async function handleBetSubmit(side: 'yes' | 'no', amount: number) {
    if (!selectedMarketId) return;
    
    // Check if user is verified before allowing bet
    if (!userVerification?.isRegistered || !userVerification.walletAddress) {
      alert('Please register at xmarket.com before placing bets.');
      return;
    }

    // Prepare the bet (check balances, get bridge route if needed)
    // Using verified custodial wallet address
    await prepare(amount, userVerification.walletAddress, isTestnet);
  }

  async function handleExecuteBridge() {
    // Bridge will be executed by backend using custodial wallet
    alert(
      'Bridge execution requires wallet interaction. This will be implemented in the next phase.'
    );

    // TODO: Get wallet client and execute bridge
    // const walletClient = await getWalletClient();
    // await execute(walletClient, isTestnet);
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="app-title">Xmarket</div>
        <div className="app-subtitle">Bet on Polymarket from Twitter</div>
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={isTestnet}
              onChange={(e) => {
                setIsTestnet(e.target.checked);
                // Reset markets and preparation when switching modes
                setMarkets([]);
                setSelectedMarketId(null);
                reset();
                // Reload markets if we have a tweet
                if (tweet) {
                  loadMarkets(tweet.text);
                }
              }}
            />
            <span>Testnet Mode</span>
          </label>
        </div>
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
            <div className="empty-state-icon">🐦</div>
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
            ) : (
              <MarketList
                markets={markets}
                selectedMarketId={selectedMarketId}
                onSelectMarket={setSelectedMarketId}
              />
            )}
          </div>
        )}

        {/* Wallet Status */}
        {tweet && markets.length > 0 && (
          <>
            {isVerifyingUser ? (
              <div className="section">
                <div className="status-message status-info">
                  <div className="loading">
                    <div className="spinner"></div>
                    Verifying your account...
                  </div>
                </div>
              </div>
            ) : userVerification?.isRegistered ? (
              <WalletStatus />
            ) : (
              <div className="section">
                <div className="status-message status-error">
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ Registration Required</div>
                  <div style={{ fontSize: 12, marginBottom: 8 }}>
                    {userVerification?.error || 'Please register at xmarket.com to place bets.'}
                  </div>
                </div>
                <a 
                  href="https://xmarket.com/auth/signup" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-full"
                  style={{ textDecoration: 'none', textAlign: 'center' }}
                >
                  Register Now
                </a>
              </div>
            )}
          </>
        )}

        {/* Bet Form */}
        {tweet && markets.length > 0 && selectedMarketId && userVerification?.isRegistered && (
          <>
            {/* Show bet flow status if we have preparation result */}
            {preparation && (
              <BetFlowStatus
                preparation={preparation}
                onExecuteBridge={
                  preparation.status === 'needs-bridge' ? handleExecuteBridge : undefined
                }
                isExecuting={isLoading}
              />
            )}

            {/* Show error if any */}
            {error && !preparation && (
              <div className="status-message status-error">
                <div style={{ fontWeight: 600 }}>Error</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{error}</div>
              </div>
            )}

            {/* Show bet form if ready or no preparation yet */}
            {(!preparation || preparation.status === 'idle' || preparation.status === 'ready') && (
              <BetForm
                marketId={selectedMarketId}
                walletAddress={walletAddress}
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
