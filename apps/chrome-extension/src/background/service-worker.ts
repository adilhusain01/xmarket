// Background service worker

import { Message, MessageType } from '../shared/messaging';
import { setStorageItem } from '../shared/storage';

console.log('[Xmarket] Service worker loaded');

// Service Worker Keepalive - Prevent premature termination
const KEEPALIVE_ALARM = 'xmarket-keepalive';

function startKeepalive() {
  // Create an alarm that fires every 25 seconds
  chrome.alarms.create(KEEPALIVE_ALARM, {
    periodInMinutes: 0.4167, // ~25 seconds (25/60)
  });
  
  console.log('[Xmarket] Keepalive alarm created');
}

// Listen to alarm events to keep service worker alive
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEPALIVE_ALARM) {
    // Simple operation to keep context alive
    chrome.storage.local.get('_keepalive', () => {
      if (chrome.runtime.lastError) {
        console.warn('[Xmarket] Keepalive check failed:', chrome.runtime.lastError);
      }
    });
  }
});

// Start keepalive on load
startKeepalive();

// Log installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Xmarket] Extension installed:', details.reason);
  if (details.reason === 'install') {
    console.log('[Xmarket] Welcome! Extension installed successfully.');
  }
  // Restart keepalive after installation
  startKeepalive();
});

// Handle messages from content script and side panel
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.log('[Xmarket] Received message:', message.type, 'from tab:', sender.tab?.id);

  (async () => {
    try {
      switch (message.type) {
        case MessageType.TWEET_SELECTED: {
          // Store the selected tweet
          const tweet = message.payload.tweet;
          console.log('[Xmarket] Storing new tweet:', tweet.tweetId);
          await setStorageItem('lastTweet', tweet);
          console.log('[Xmarket] Tweet stored successfully, side panel should update');
          sendResponse({ success: true });
          break;
        }

        case MessageType.OPEN_SIDE_PANEL: {
          // Open side panel for the current tab
          if (sender.tab?.id) {
            await chrome.sidePanel.open({ tabId: sender.tab.id });
          } else {
            // If called from side panel, get active tab
            const [tab] = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            });
            if (tab.id) {
              await chrome.sidePanel.open({ tabId: tab.id });
            }
          }
          sendResponse({ success: true });
          break;
        }

        case MessageType.SEARCH_MARKETS: {
          // Fetch markets from Polymarket Gamma API from the background (avoids CORS)
          const { keywords, isTestnet } = message.payload as any;
          const apiUrl = 'https://gamma-api.polymarket.com/markets';
          
          console.log('[Xmarket] Fetching markets (keywords for filtering:', keywords, ')');
          
          // Retry fetch with exponential backoff
          const maxRetries = 3;
          let lastError: Error | null = null;
          
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
              
              // Use volume filter to get only meaningful markets (faster, smaller payload)
              // This reduces from 500 to ~200 markets with actual trading activity
              const url = `${apiUrl}?limit=500&active=true&closed=false&volume_num_min=5000`;
              
              console.log('[Xmarket] Fetching from URL:', url);
              
              const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                  'Accept': 'application/json',
                },
              });
              
              clearTimeout(timeoutId);
              
              if (!res.ok) {
                throw new Error(`Failed to fetch markets: ${res.status} ${res.statusText}`);
              }
              
              const markets = await res.json();
              console.log(`[Xmarket] Successfully fetched ${markets.length} markets`);
              sendResponse({ markets });
              return; // Success, exit
            } catch (error) {
              lastError = error instanceof Error ? error : new Error(String(error));
              console.warn(`[Xmarket] Fetch attempt ${attempt + 1} failed:`, lastError.message);
              
              // If not the last attempt, wait before retrying
              if (attempt < maxRetries - 1) {
                const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
          
          // All retries failed
          console.error('[Xmarket] Error fetching markets in background after retries:', lastError);
          sendResponse({ 
            error: lastError?.message || 'Failed to fetch markets after multiple attempts'
          });
          break;
        }

        case MessageType.CONNECT_WALLET:
        case MessageType.GET_BALANCES:
        case MessageType.PREPARE_BET:
        case MessageType.EXECUTE_BRIDGE: {
          // Forward to side panel
          // These will be handled directly by the side panel's state management
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[Xmarket] Error handling message:', error);
      sendResponse({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })();

  // Return true to indicate async response
  return true;
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Xmarket] Extension icon clicked, tab:', tab.id);
  if (tab.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
      console.log('[Xmarket] Side panel opened successfully');
    } catch (error) {
      console.error('[Xmarket] Failed to open side panel:', error);
    }
  } else {
    console.error('[Xmarket] No tab ID available');
  }
});

// Set default side panel behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .then(() => console.log('[Xmarket] Side panel behavior set'))
  .catch((error) => console.error('[Xmarket] Side panel behavior error:', error));
