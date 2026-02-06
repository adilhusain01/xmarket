// Chrome storage helpers

export interface StorageData {
  // Wallet
  walletAddress?: string;
  isTestnet?: boolean;

  // Last selected tweet
  lastTweet?: {
    tweetId: string;
    text: string;
    author?: string;
  };

  // Last searched markets
  lastMarkets?: any[];

  // Settings
  settings?: {
    autoOpenSidePanel: boolean;
    testnetMode: boolean;
  };
}

// Get item from storage
export async function getStorageItem<K extends keyof StorageData>(
  key: K
): Promise<StorageData[K] | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

// Set item in storage
export async function setStorageItem<K extends keyof StorageData>(
  key: K,
  value: StorageData[K]
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      resolve();
    });
  });
}

// Get multiple items
export async function getStorageItems<K extends keyof StorageData>(
  keys: K[]
): Promise<Pick<StorageData, K>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result as Pick<StorageData, K>);
    });
  });
}

// Set multiple items
export async function setStorageItems(
  items: Partial<StorageData>
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      resolve();
    });
  });
}

// Clear storage
export async function clearStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.clear(() => {
      resolve();
    });
  });
}

// Watch for storage changes
export function onStorageChange(
  callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      callback(changes);
    }
  });
}
