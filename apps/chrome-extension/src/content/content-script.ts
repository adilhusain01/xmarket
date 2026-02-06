// Content script for Twitter/X pages

import {
  extractTweetData,
  findTweetElements,
  getActionBar,
  hasBetButton,
  isValidTweet,
} from './tweet-detector';
import { MessageType, sendMessage, TweetContext } from '../shared/messaging';

console.log('[Xmarket] Content script loaded');

// Create and inject bet button
function createBetButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'xmarket-bet-button';
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
    <span>Bet</span>
  `;
  button.title = 'Find Polymarket bets for this tweet';

  return button;
}

// Handle bet button click
async function handleBetClick(tweetElement: HTMLElement) {
  const tweetData = extractTweetData(tweetElement);

  if (!tweetData) {
    console.error('[Xmarket] Could not extract tweet data');
    return;
  }

  console.log('[Xmarket] Tweet selected:', tweetData);

  try {
    // Open side panel synchronously to preserve the user gesture (prevents chrome restriction)
    try {
      if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
        // Call without awaiting so the call remains within the user gesture.
        // If it fails, we'll log but continue to store the tweet.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        (chrome.sidePanel as any).open();
      }
    } catch (openErr) {
      console.warn('[Xmarket] Could not open side panel from content script:', openErr);
    }

    // Store the selected tweet in the background
    await sendMessage(MessageType.TWEET_SELECTED, { tweet: tweetData });
  } catch (error) {
    console.error('[Xmarket] Error handling bet click:', error);
    
    // Only show alert if context is truly invalidated and can't recover
    if (error instanceof Error && 
        (error.message.includes('Extension context invalidated') ||
         error.message.includes('Receiving end does not exist'))) {
      // Don't show alert immediately - user can try again
      console.warn('[Xmarket] Extension connection lost. Try clicking again or reload the page.');
    }
  }
}

// Inject bet buttons into tweets
function injectBetButtons() {
  const tweets = findTweetElements();

  tweets.forEach((tweetElement) => {
    // Skip if already has button or not a valid tweet
    if (hasBetButton(tweetElement) || !isValidTweet(tweetElement)) {
      return;
    }

    // Find action bar
    const actionBar = getActionBar(tweetElement);
    if (!actionBar) return;

    // Create and inject button
    const betButton = createBetButton();
    betButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleBetClick(tweetElement);
    });

    // Inject at the end of action bar
    actionBar.appendChild(betButton);
  });
}

// Observer for dynamically loaded tweets
const observer = new MutationObserver((mutations) => {
  // Check if new tweets were added
  const hasTweets = mutations.some((mutation) => {
    return Array.from(mutation.addedNodes).some((node) => {
      if (node instanceof HTMLElement) {
        return (
          node.querySelector('[data-testid="tweet"]') ||
          node.getAttribute('data-testid') === 'tweet'
        );
      }
      return false;
    });
  });

  if (hasTweets) {
    // Debounce to avoid excessive injections
    setTimeout(injectBetButtons, 100);
  }
});

// Start observing
function startObserving() {
  console.log('[Xmarket] Starting observation...');

  // Inject buttons for existing tweets
  const initialCount = findTweetElements().length;
  console.log('[Xmarket] Found', initialCount, 'initial tweets');
  injectBetButtons();

  // Observe for new tweets
  const timeline = document.body;
  if (timeline) {
    observer.observe(timeline, {
      childList: true,
      subtree: true,
    });
    console.log('[Xmarket] Observer started, watching for new tweets');
  } else {
    console.error('[Xmarket] No document.body found');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startObserving);
} else {
  startObserving();
}

// Also re-inject when navigating on Twitter (SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(injectBetButtons, 500);
  }
}).observe(document, { subtree: true, childList: true });
