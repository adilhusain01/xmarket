// Bet form component - simplified text input version

import React, { useState } from 'react';

interface BetFormProps {
  marketId: string;
  walletAddress: string;
  onSubmit: (side: 'yes' | 'no', amount: number) => void;
  isLoading: boolean;
}

export function BetForm({ marketId, walletAddress, onSubmit, isLoading }: BetFormProps) {
  const [betInput, setBetInput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const parseBetCommand = (input: string): { amount: number; side: 'yes' | 'no' } | null => {
    // Parse commands like: "5$ on yes", "$10 yes", "20 no", "yes 15", etc.
    const cleaned = input.toLowerCase().trim();
    
    // Extract amount (look for numbers with optional $)
    const amountMatch = cleaned.match(/\$?\s*(\d+(?:\.\d+)?)/);
    if (!amountMatch) return null;
    
    const amount = parseFloat(amountMatch[1]);
    if (isNaN(amount) || amount <= 0) return null;
    
    // Extract side (yes/no)
    const hasYes = /\byes\b/.test(cleaned);
    const hasNo = /\bno\b/.test(cleaned);
    
    if (hasYes && !hasNo) return { amount, side: 'yes' };
    if (hasNo && !hasYes) return { amount, side: 'no' };
    
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!betInput.trim()) {
      setError('Enter a bet command (e.g., "5$ on yes")');
      return;
    }

    const parsed = parseBetCommand(betInput);
    if (!parsed) {
      setError('Invalid format. Try: "5$ on yes" or "$10 no"');
      return;
    }

    console.log(`[BetForm] 🎲 Placing bet: $${parsed.amount} on ${parsed.side.toUpperCase()}`);
    onSubmit(parsed.side, parsed.amount);
  };

  return (
    <form onSubmit={handleSubmit} className="section">
      <div className="section-title">Place Your Bet</div>

      <div className="form-group">
        <label className="form-label" htmlFor="betInput">
          Quick Bet Command
        </label>
        <input
          id="betInput"
          type="text"
          className="form-input"
          value={betInput}
          onChange={(e) => {
            setBetInput(e.target.value);
            setError('');
          }}
          placeholder='e.g., "5$ on yes" or "$10 no"'
          disabled={isLoading}
          autoComplete="off"
        />
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          Examples: "5$ on yes" • "$10 yes" • "20 no" • "yes 15"
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: 8, 
          background: '#fee', 
          border: '1px solid #fcc',
          borderRadius: 4,
          fontSize: 12,
          color: '#c00',
          marginBottom: 8
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-full"
        disabled={isLoading || !marketId || !walletAddress || !betInput.trim()}
      >
        {isLoading ? (
          <>
            <div className="spinner" style={{ marginRight: 8 }}></div>
            Processing bet...
          </>
        ) : (
          'Place Bet'
        )}
      </button>

      <div style={{ 
        fontSize: 11, 
        color: '#666', 
        marginTop: 8,
        padding: 8,
        background: '#f5f5f5',
        borderRadius: 4
      }}>
        💡 <strong>Real Balance Checks:</strong> Extension will check your actual USDC balances across all chains and find bridge routes if needed.
      </div>
    </form>
  );
}
