import { NextResponse } from 'next/server';
import { POLYMARKET_GAMMA_API } from '@xmarket/shared';

export async function GET() {
  try {
    const res = await fetch(
      `${POLYMARKET_GAMMA_API}/markets?active=true&order=volume&limit=20`
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Gamma API ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch Polymarket markets:', error);
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 });
  }
}
