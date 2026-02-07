
export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">Xmarket</h1>
          <a href="#extension" className="btn-primary">
            Download Extension
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold mb-6">
            Bet on Polymarket
            <br />
            <span className="text-primary-600">Directly from X</span>
          </h2>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Install our Chrome extension and bet on Polymarket markets directly from any tweet.
            Connect your wallet and bet in seconds.
          </p>

          <div className="flex gap-4 justify-center">
            <a
              href="https://github.com/adilhusain01/xmarket/releases/latest/download/xmarket-extension.zip"
              className="btn-primary text-lg px-8 py-3"
            >
              Download Extension
            </a>
            <a
              href="#how-to-install"
              className="btn-secondary text-lg px-8 py-3"
            >
              How to Install
            </a>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">1. Install Extension</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Add Xmarket Chrome extension to your browser and connect your MetaMask wallet.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">2. Browse Twitter</h3>
            <p className="text-gray-600 dark:text-gray-300">
              See a tweet about politics, sports, or current events? Click the "Bet" button that appears on relevant tweets.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">3. Place Your Bet</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Type natural language bets like "5$ on yes" or "$10 no" in the side panel. We handle the rest.
            </p>
          </div>
        </div>

        {/* Download Section */}
        <div className="mt-24" id="extension">
          <h3 className="text-3xl font-bold text-center mb-4">Get the Extension</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-xl mx-auto">
            Download the latest build, unzip, and load it into Chrome. Always up to date with every push.
          </p>
          <div className="max-w-md mx-auto text-center">
            <a
              href="https://github.com/adilhusain01/xmarket/releases/latest/download/xmarket-extension.zip"
              className="btn-primary text-lg px-10 py-4 inline-block"
            >
              Download xmarket-extension.zip
            </a>
          </div>
        </div>

        {/* Install Instructions */}
        <div className="mt-16" id="how-to-install">
          <h3 className="text-3xl font-bold text-center mb-12">How to Install</h3>
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="card">
              <div className="flex items-start gap-3">
                <div className="text-3xl">1.</div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Download & Unzip</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Click the download button above. Unzip <span className="font-mono text-sm">xmarket-extension.zip</span> to get the <span className="font-mono text-sm">xmarket-extension</span> folder.
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-start gap-3">
                <div className="text-3xl">2.</div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Load in Chrome</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Open <span className="font-mono text-sm">chrome://extensions</span> in Chrome. Enable <strong>Developer mode</strong> (top right toggle). Click <strong>Load unpacked</strong> and select the <span className="font-mono text-sm">xmarket-extension</span> folder.
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-start gap-3">
                <div className="text-3xl">3.</div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Go to X.com</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Browse Twitter/X as usual. You{"'"}ll see a <strong>Bet</strong> button on every tweet. Click it to open the Xmarket side panel with matching Polymarket markets.
                  </p>
                </div>
              </div>
            </div>

            <div className="card bg-primary-50 dark:bg-primary-900/20">
              <div className="flex items-start gap-3">
                <div className="text-3xl">4.</div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Connect & Bet</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Connect your MetaMask wallet, pick a market, and type your bet naturally:
                    <br />
                    <span className="font-mono text-sm mt-2 inline-block">&quot;5$ on yes&quot;</span> or <span className="font-mono text-sm">&quot;$10 no&quot;</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-2 gap-8">
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Smart Market Matching</h3>
            <p className="text-gray-600 dark:text-gray-300">
              AI-powered semantic matching finds the most relevant Polymarket markets for any tweet,
              even with fuzzy topics.
            </p>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Instant Execution</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Bets are executed immediately on Polymarket's CLOB with real-time confirmations.
            </p>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Context-Aware Betting</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Our extension analyzes tweet context to automatically find the most relevant Polymarket markets.
            </p>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Secure & Transparent</h3>
            <p className="text-gray-600 dark:text-gray-300">
              All transactions are on-chain. View your full history and withdraw anytime.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-24">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600 dark:text-gray-400">
          <p>© 2024 Xmarket. Built for prediction market enthusiasts.</p>
          <div className="mt-4 space-x-4">
            <a href="#" className="hover:text-primary-600">
              Terms
            </a>
            <a href="#" className="hover:text-primary-600">
              Privacy
            </a>
            <a href="#" className="hover:text-primary-600">
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
