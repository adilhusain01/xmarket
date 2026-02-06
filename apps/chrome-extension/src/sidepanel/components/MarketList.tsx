// Market list component

import React from 'react';
import { formatMarket } from '../lib/market-matcher';

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

interface MarketListProps {
  markets: Market[];
  selectedMarketId: string | null;
  onSelectMarket: (marketId: string) => void;
}

export function MarketList({ markets, selectedMarketId, onSelectMarket }: MarketListProps) {
  if (markets.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-title">No markets found</div>
        <div className="empty-state-description">
          Try selecting a different tweet with more specific event predictions.
        </div>
      </div>
    );
  }

  return (
    <div>
      {markets.map((market) => {
        const formatted = formatMarket(market);
        const isSelected = market.id === selectedMarketId;

        return (
          <div
            key={market.id}
            className={`market-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectMarket(market.id)}
          >
            <div className="market-question">{formatted.question}</div>
            <div className="market-prices">
              <div className="market-price">
                <span className="market-price-label">Yes:</span>
                <span className="market-price-value">{formatted.yesPrice}</span>
              </div>
              <div className="market-price">
                <span className="market-price-label">No:</span>
                <span className="market-price-value">{formatted.noPrice}</span>
              </div>
            </div>
            <div className="market-meta">Volume: {formatted.volume}</div>
          </div>
        );
      })}
    </div>
  );
}
