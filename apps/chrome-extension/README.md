# Xmarket Chrome Extension

Chrome extension for placing Polymarket bets directly from Twitter/X.

## Features

- Click "Bet" button on any tweet to find related Polymarket markets
- View matching markets in a side panel
- Check USDC balances across multiple chains (Ethereum, Polygon, Arbitrum, Base, Optimism)
- Automatic bridging via LiFi if funds are on a different chain
- Testnet mode for safe testing

## Development

### Prerequisites

- Node.js >= 18
- Chrome browser
- MetaMask or another Web3 wallet extension

### Install Dependencies

From the monorepo root:

```bash
npm install
```

### Build the Extension

```bash
cd apps/chrome-extension
npm run build
```

This creates a `dist/` folder with the built extension.

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` folder from `apps/chrome-extension/dist`

### Development Mode

For development with hot reload:

```bash
npm run dev
```

Then load the extension as described above. Changes will automatically rebuild.

## Usage

1. Navigate to [twitter.com](https://twitter.com) or [x.com](https://x.com)
2. Find a tweet about a prediction event (e.g., "Will Trump win 2028?")
3. Click the "Bet" button that appears on the tweet
4. Side panel opens showing related Polymarket markets
5. Select a market
6. Connect your wallet
7. Enter bet amount and select YES or NO
8. The extension will:
   - Check your USDC balance on Polygon
   - If insufficient, scan other chains for USDC
   - Show bridge route if bridging is needed
   - Allow you to confirm and execute the bridge
   - (Future: Actually place the bet on Polymarket)

## Architecture

### Content Script (`src/content/`)
- Runs on Twitter/X pages
- Detects tweet elements
- Injects "Bet" buttons
- Extracts tweet text and metadata

### Background Service Worker (`src/background/`)
- Handles messages between content script and side panel
- Manages extension state
- Opens side panel on demand

### Side Panel (`src/sidepanel/`)
- React app for the betting interface
- Searches for related Polymarket markets
- Connects to wallet
- Manages bet flow (balance check + bridge)

### Libraries (`src/sidepanel/lib/`)
- **market-matcher.ts** - Keyword-based market search
- **balance-checker.ts** - Multi-chain USDC balance checker
- **lifi-bridge.ts** - Cross-chain bridge integration
- **bet-service.ts** - Orchestrates balance check + bridge flow

## Configuration

### Testnet Mode

Toggle testnet mode in the extension header. This switches between:
- **Mainnet**: Real Polymarket markets on Polygon mainnet
- **Testnet**: Test markets on Polygon Amoy testnet

### Environment

The extension doesn't use `.env` files. Instead, settings are stored in `chrome.storage.local`:
- `walletAddress` - Connected wallet address
- `isTestnet` - Testnet mode flag
- `lastTweet` - Last selected tweet
- `lastMarkets` - Last searched markets

## Known Limitations

### MVP Phase 1 Limitations

1. **Wallet Connection**: Currently uses a simplified wallet connection. Full wallet client integration is in progress.
2. **Bridge Execution**: Shows bridge route but doesn't execute yet (needs full wallet client).
3. **Actual Bet Placement**: Extension prepares the bet but doesn't place orders on Polymarket yet.
4. **Icon Placeholders**: Extension icons need to be created (currently using placeholder README).

### Future Enhancements

- [ ] Complete wallet client integration for bridge execution
- [ ] Polymarket CLOB integration for actual bet placement
- [ ] Position tracking and notifications
- [ ] Bet history
- [ ] AI-powered semantic market search (currently uses keyword matching)
- [ ] Support for non-binary markets
- [ ] Quick bet presets

## Project Structure

```
apps/chrome-extension/
├── src/
│   ├── background/
│   │   └── service-worker.ts       # Background script
│   ├── content/
│   │   ├── content-script.ts       # Inject bet buttons
│   │   ├── tweet-detector.ts       # Extract tweet data
│   │   └── styles.css              # Button styles
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── main.tsx                # React entry point
│   │   ├── App.tsx                 # Main app component
│   │   ├── styles.css              # Global styles
│   │   ├── components/             # React components
│   │   │   ├── TweetContext.tsx
│   │   │   ├── MarketList.tsx
│   │   │   ├── BetForm.tsx
│   │   │   ├── BetFlowStatus.tsx
│   │   │   └── WalletStatus.tsx
│   │   ├── hooks/                  # React hooks
│   │   │   ├── useWallet.ts
│   │   │   └── useBetFlow.ts
│   │   └── lib/                    # Core logic
│   │       ├── market-matcher.ts
│   │       ├── balance-checker.ts
│   │       ├── lifi-bridge.ts
│   │       └── bet-service.ts
│   ├── inject/
│   │   └── provider-proxy.ts       # Access window.ethereum
│   └── shared/
│       ├── messaging.ts            # Chrome messaging types
│       └── storage.ts              # Chrome storage helpers
├── public/
│   └── icons/                      # Extension icons
├── manifest.json                   # Chrome extension manifest
├── package.json
├── tsconfig.json
├── vite.config.ts                  # Vite + CRXJS config
└── README.md
```

## Dependencies

- **React 18** - UI framework
- **Zustand** - State management
- **Viem** - Ethereum interactions
- **@lifi/sdk** - Cross-chain bridge routing
- **@xmarket/shared** - Shared types and constants (from monorepo)
- **@crxjs/vite-plugin** - Chrome extension bundler

## Troubleshooting

### Extension doesn't load
- Make sure you've run `npm run build` first
- Check that "Developer mode" is enabled in `chrome://extensions/`
- Look for errors in the extension's service worker console

### Bet buttons don't appear on tweets
- Check the content script is injected (inspect element on a tweet)
- Look for errors in the page console (F12 developer tools)
- Try refreshing the Twitter/X page

### Side panel doesn't open
- Check the background service worker console for errors
- Right-click extension icon → "Inspect" to see service worker logs

### Markets don't load
- Check browser console for API errors
- Verify Polymarket Gamma API is accessible: `https://gamma-api.polymarket.com/markets`
- Try different tweet text with more specific keywords

### Wallet connection fails
- Make sure MetaMask (or another Web3 wallet) is installed
- Check that the wallet extension is enabled
- Look for permission errors in console

## License

MIT
