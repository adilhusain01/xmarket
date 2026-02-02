import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">Xmarket</h1>
          <Link href="/dashboard" className="btn-primary">
            Launch App
          </Link>
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
            Discover and place bets on prediction markets without leaving X/Twitter.
            Simple commands, instant execution.
          </p>

          <div className="flex gap-4 justify-center">
            <Link href="/dashboard" className="btn-primary text-lg px-8 py-3">
              Get Started
            </Link>
            <a
              href="https://twitter.com/xmarketbot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-lg px-8 py-3"
            >
              Follow @XmarketBot
            </a>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold mb-2">1. Connect</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Link your X account and connect your wallet. Deposit USDC to get started.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">2. Discover</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Tweet @XmarketBot with "find [topic]" to search prediction markets.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">3. Bet</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Reply "bet [amount] yes/no" to place your bet instantly.
            </p>
          </div>
        </div>

        {/* Example */}
        <div className="mt-24">
          <h3 className="text-3xl font-bold text-center mb-12">See It In Action</h3>
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="card bg-gray-50 dark:bg-gray-900">
              <p className="font-semibold mb-2">You:</p>
              <p className="text-gray-700 dark:text-gray-300">
                @XmarketBot find Trump 2028
              </p>
            </div>

            <div className="card bg-primary-50 dark:bg-primary-900/20">
              <p className="font-semibold mb-2">@XmarketBot:</p>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {`📊 "Will Trump win 2028 election?"

Yes: $0.45 | No: $0.55
Volume: $2.3M | ID: #12345

💡 Reply "bet [amount] yes" or "bet [amount] no" to place a bet`}
              </p>
            </div>

            <div className="card bg-gray-50 dark:bg-gray-900">
              <p className="font-semibold mb-2">You:</p>
              <p className="text-gray-700 dark:text-gray-300">
                @XmarketBot bet 10 yes
              </p>
            </div>

            <div className="card bg-primary-50 dark:bg-primary-900/20">
              <p className="font-semibold mb-2">@XmarketBot:</p>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {`✅ Bet placed! $10.00 on YES @ $0.45

📈 Shares: 22.22
💰 Balance: $90.00

Good luck! 🍀`}
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-2 gap-8">
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Smart Market Matching</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Our AI-powered search uses semantic matching to find the most relevant markets,
              even with fuzzy queries.
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
              The bot remembers your last search, so you can bet without specifying the market ID.
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
