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
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [error, setError] = useState<string>('');

  const parseBetCommand = (input: string): { amount: number; side?: 'yes' | 'no' } | null => {
    // Parse commands like: "5$ on yes", "$10 yes", "20 no", "yes 15", etc.
    const cleaned = input.toLowerCase().trim();
    
    // Extract amount (look for numbers with optional $)
    const amountMatch = cleaned.match(/\$?\s*(\d+(?:\.\d+)?)/);
    if (!amountMatch) return null;
    
    const amount = parseFloat(amountMatch[1]);
    if (isNaN(amount) || amount <= 0) return null;
    
    // Extract side (yes/no) - optional, will use selectedSide if not specified
    const hasYes = /\byes\b/.test(cleaned);
    const hasNo = /\bno\b/.test(cleaned);
    
    if (hasYes && !hasNo) return { amount, side: 'yes' };
    if (hasNo && !hasYes) return { amount, side: 'no' };
    
    // No side specified in command, return just amount
    return { amount };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[BetForm] 📝 Form submitted', { betInput });
    setError('');

    if (!betInput.trim()) {
      console.warn('[BetForm] ✗ Empty input');
      setError('Enter a bet command (e.g., "5$ on yes")');
      return;
    }

    const parsed = parseBetCommand(betInput);
    console.log('[BetForm] 🔍 Parsed command:', parsed);
    
    if (!parsed) {
      console.warn('[BetForm] ✗ Invalid format');
      setError('Invalid format. Try "5 yes" or just "5"');
      return;
    }

    // Use side from command if specified, otherwise use selected side
    const finalSide = parsed.side || selectedSide;

    console.log(`[BetForm] ✅ Valid bet: $${parsed.amount} on ${finalSide.toUpperCase()}`);
    console.log('[BetForm] → Calling onSubmit callback...');
    onSubmit(finalSide, parsed.amount);
  };

  return (
    <form onSubmit={handleSubmit} className="bet-form">
      {/* Side Selection */}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Select Outcome</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setSelectedSide('yes')}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: selectedSide === 'yes' ? '2px solid #10b981' : '1px solid #d1d5db',
              background: selectedSide === 'yes' ? '#ecfdf5' : '#fff',
              color: selectedSide === 'yes' ? '#065f46' : '#6b7280',
              borderRadius: 6,
              fontWeight: selectedSide === 'yes' ? 600 : 400,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ✓ Yes
          </button>
          <button
            type="button"
            onClick={() => setSelectedSide('no')}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: selectedSide === 'no' ? '2px solid #ef4444' : '1px solid #d1d5db',
              background: selectedSide === 'no' ? '#fef2f2' : '#fff',
              color: selectedSide === 'no' ? '#991b1b' : '#6b7280',
              borderRadius: 6,
              fontWeight: selectedSide === 'no' ? 600 : 400,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ✗ No
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="betInput">
          Bet Amount
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
          placeholder='e.g., "5$" or "10" or "5 yes"'
          disabled={isLoading}
          autoComplete="off"
        />
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          Enter amount or include side: "5$ yes" • "$10 no" • "20"
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
        💡 <strong>Real Transactions:</strong> You'll sign USDC approval and trade execution via MetaMask.
      </div>
    </form>
  );
}
