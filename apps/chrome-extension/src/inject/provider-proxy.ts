// Provider proxy - injected into page context to access window.ethereum

// This script runs in the page context (not extension context)
// It allows the extension to access window.ethereum via message passing

console.log('[Xmarket] Provider proxy injected');

// Listen for requests from content script
window.addEventListener('message', async (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return;

  const { type, data, id } = event.data;

  if (type !== 'XMARKET_WALLET_REQUEST') return;

  console.log('[Xmarket] Provider proxy received request:', data.method);

  try {
    if (!window.ethereum) {
      throw new Error('No wallet provider found. Please install MetaMask or another Web3 wallet.');
    }

    // Execute the request on window.ethereum
    const result = await window.ethereum.request({
      method: data.method,
      params: data.params,
    });

    // Send response back to content script
    window.postMessage(
      {
        type: 'XMARKET_WALLET_RESPONSE',
        id,
        result,
      },
      '*'
    );
  } catch (error) {
    console.error('[Xmarket] Provider proxy error:', error);
    window.postMessage(
      {
        type: 'XMARKET_WALLET_RESPONSE',
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      '*'
    );
  }
});

// Notify that provider is ready
window.postMessage({ type: 'XMARKET_PROVIDER_READY' }, '*');
