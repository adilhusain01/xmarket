// Wallet hook using Zustand for state management

import { create } from 'zustand';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWallet = create<WalletState>((set) => ({
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,

  connect: async () => {
    set({ isConnecting: true, error: null });

    try {
      // For MVP, we'll use a simple approach: inject script and request accounts
      // This requires the provider proxy to be working

      // Request MetaMask connection via injected script
      const accounts = await requestAccounts();

      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        set({
          address,
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      } else {
        throw new Error('No accounts found');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      set({
        address: null,
        isConnected: false,
        isConnecting: false,
        error: errorMessage,
      });
    }
  },

  disconnect: () => {
    set({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  },
}));

// Helper to request accounts from MetaMask
async function requestAccounts(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // Send message to get active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        reject(new Error('No active tab'));
        return;
      }

      // Inject script to access window.ethereum
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          func: async () => {
            if (typeof window.ethereum === 'undefined') {
              throw new Error('MetaMask is not installed');
            }
            return await window.ethereum.request({ method: 'eth_requestAccounts' });
          },
        },
        (results) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (results && results[0]?.result) {
            resolve(results[0].result as string[]);
          } else {
            reject(new Error('Failed to get accounts'));
          }
        }
      );
    });
  });
}
