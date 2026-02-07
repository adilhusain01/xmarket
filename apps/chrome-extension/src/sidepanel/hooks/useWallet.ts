// Wallet hook - MetaMask direct connection with chrome.storage persistence

import { create } from 'zustand';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  isInitialized: boolean;

  init: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const STORAGE_KEY = 'xmarket_wallet_address';

export const useWallet = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  isInitialized: false,

  // Restore saved address from chrome.storage on mount
  init: async () => {
    if (get().isInitialized) return;

    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const savedAddress = result[STORAGE_KEY];
      if (savedAddress) {
        set({
          address: savedAddress,
          isConnected: true,
          isInitialized: true,
        });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }
  },

  connect: async () => {
    set({ isConnecting: true, error: null });

    try {
      const accounts = await requestAccounts();

      if (accounts && accounts.length > 0) {
        const address = accounts[0];

        // Persist to chrome.storage
        await chrome.storage.local.set({ [STORAGE_KEY]: address });

        set({
          address,
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      } else {
        throw new Error('No accounts returned from MetaMask');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to connect wallet';

      let userMessage = msg;
      if (msg.includes('MetaMask is not installed') || msg.includes('ethereum is not defined')) {
        userMessage = 'MetaMask is not installed. Please install it from metamask.io';
      } else if (msg.includes('User rejected') || msg.includes('user rejected')) {
        userMessage = 'Connection rejected. Please try again.';
      } else if (msg.includes('No active tab')) {
        userMessage = 'No active tab found. Please open a webpage first.';
      }

      set({
        address: null,
        isConnected: false,
        isConnecting: false,
        error: userMessage,
      });
    }
  },

  disconnect: () => {
    // Clear from chrome.storage
    chrome.storage.local.remove(STORAGE_KEY);

    set({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  },
}));

// Helper to request accounts from MetaMask via chrome.scripting
async function requestAccounts(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        reject(new Error('No active tab'));
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          world: 'MAIN', // MetaMask injects window.ethereum into the MAIN world
          func: () => {
            // Return a promise-like structure since MAIN world async can be tricky
            if (typeof window.ethereum === 'undefined') {
              return { error: 'MetaMask is not installed' };
            }
            return window.ethereum
              .request({ method: 'eth_requestAccounts' })
              .then((accounts: string[]) => ({ accounts }))
              .catch((err: any) => ({ error: err?.message || 'User rejected connection' }));
          },
        },
        (results) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          const result = results?.[0]?.result as any;
          if (result?.error) {
            reject(new Error(result.error));
          } else if (result?.accounts?.length > 0) {
            resolve(result.accounts as string[]);
          } else {
            reject(new Error('No accounts returned from MetaMask'));
          }
        }
      );
    });
  });
}
