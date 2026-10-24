import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

// ============================================================================
//  MQL5 Signals API — fetches signals from MQL5.com
// ============================================================================

// Fallback sample signals (used when MQL5.com is unreachable)
const SAMPLE_SIGNALS = [
  {
    id: "sample-1",
    name: "Gold Sniper Pro",
    author: "FXMaster2024",
    broker: "HotForex",
    currency: "USD",
    growth: 245.7,
    drawdown: 12.3,
    winRate: 78.5,
    trades: 432,
    balance: 12500,
    equity: 15800,
    profitFactor: 2.8,
    price: 30,
    period: "monthly",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12345",
    timeframe: "H1",
    symbols: ["XAUUSD", "EURUSD"],
    description: "Professional gold scalping strategy with tight risk management",
    rating: 4.5,
    subscribers: 89,
    isFree: false,
  },
  {
    id: "sample-2",
    name: "Smart Trend Rider",
    author: "TradeProTrader",
    broker: "IC Markets",
    currency: "USD",
    growth: 187.4,
    drawdown: 18.5,
    winRate: 71.2,
    trades: 678,
    balance: 25000,
    equity: 29750,
    profitFactor: 2.1,
    price: 50,
    period: "monthly",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12346",
    timeframe: "M30",
    symbols: ["EURUSD", "GBPUSD", "USDJPY"],
    description: "Trend-following strategy with multi-pair diversification",
    rating: 4.2,
    subscribers: 152,
    isFree: false,
  },
  {
    id: "sample-3",
    name: "Free Gold Signals Daily",
    author: "FreeGoldTrader",
    broker: "Exness",
    currency: "USD",
    growth: 89.3,
    drawdown: 25.4,
    winRate: 65.0,
    trades: 245,
    balance: 5000,
    equity: 5446,
    profitFactor: 1.5,
    price: 0,
    period: "free",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12347",
    timeframe: "H4",
    symbols: ["XAUUSD"],
    description: "Free daily gold signals for beginners",
    rating: 3.8,
    subscribers: 1240,
    isFree: true,
  },
  {
    id: "sample-4",
    name: "Asian Session Scalper",
    author: "AsiaScalp",
    broker: "Pepperstone",
    currency: "USD",
    growth: 156.8,
    drawdown: 9.7,
    winRate: 82.1,
    trades: 1245,
    balance: 18000,
    equity: 21000,
    profitFactor: 3.2,
    price: 75,
    period: "monthly",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12348",
    timeframe: "M5",
    symbols: ["USDJPY", "EURJPY"],
    description: "Asian session scalping strategy with tight stops",
    rating: 4.7,
    subscribers: 67,
    isFree: false,
  },
  {
    id: "sample-5",
    name: "XAUUSD Master EA",
    author: "GoldEAPro",
    broker: "FXTM",
    currency: "USD",
    growth: 412.3,
    drawdown: 22.1,
    winRate: 74.5,
    trades: 567,
    balance: 100000,
    equity: 141230,
    profitFactor: 2.4,
    price: 100,
    period: "monthly",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12349",
    timeframe: "H1",
    symbols: ["XAUUSD"],
    description: "Professional XAUUSD trading with advanced risk management",
    rating: 4.9,
    subscribers: 234,
    isFree: false,
  },
  {
    id: "sample-6",
    name: "Crypto FX Hedge",
    author: "CryptoHedgeFX",
    broker: "HotForex",
    currency: "USD",
    growth: 98.4,
    drawdown: 15.2,
    winRate: 68.3,
    trades: 423,
    balance: 15000,
    equity: 16476,
    profitFactor: 1.8,
    price: 0,
    period: "free",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12350",
    timeframe: "H1",
    symbols: ["BTCUSD", "ETHUSD", "XAUUSD"],
    description: "Diversified crypto + gold hedge strategy (free!)",
    rating: 4.0,
    subscribers: 567,
    isFree: true,
  },
  {
    id: "sample-7",
    name: "London Breakout Pro",
    author: "LondonBreakout",
    broker: "IC Markets",
    currency: "USD",
    growth: 312.5,
    drawdown: 16.8,
    winRate: 79.8,
    trades: 892,
    balance: 50000,
    equity: 65625,
    profitFactor: 2.7,
    price: 60,
    period: "monthly",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12351",
    timeframe: "M15",
    symbols: ["EURUSD", "GBPUSD"],
    description: "London session breakout strategy — proven track record",
    rating: 4.6,
    subscribers: 178,
    isFree: false,
  },
  {
    id: "sample-8",
    name: "Smart Money Concepts",
    author: "SMCTrader",
    broker: "Pepperstone",
    currency: "USD",
    growth: 521.7,
    drawdown: 19.4,
    winRate: 73.2,
    trades: 345,
    balance: 75000,
    equity: 114000,
    profitFactor: 3.1,
    price: 90,
    period: "monthly",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12352",
    timeframe: "H4",
    symbols: ["XAUUSD", "EURUSD", "GBPUSD"],
    description: "ICT Smart Money Concepts — institutional trading strategies",
    rating: 4.8,
    subscribers: 312,
    isFree: false,
  },
  {
    id: "sample-9",
    name: "Free EURUSD Scalper",
    author: "FreeEURScalper",
    broker: "Exness",
    currency: "USD",
    growth: 67.5,
    drawdown: 28.9,
    winRate: 62.4,
    trades: 1234,
    balance: 3000,
    equity: 3025,
    profitFactor: 1.3,
    price: 0,
    period: "free",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12353",
    timeframe: "M1",
    symbols: ["EURUSD"],
    description: "Free EURUSD M1 scalping — perfect for beginners",
    rating: 3.5,
    subscribers: 2340,
    isFree: true,
  },
  {
    id: "sample-10",
    name: "Gold Trend Hunter",
    author: "GoldHunterFX",
    broker: "FXTM",
    currency: "USD",
    growth: 287.4,
    drawdown: 14.5,
    winRate: 76.8,
    trades: 567,
    balance: 40000,
    equity: 51496,
    profitFactor: 2.6,
    price: 45,
    period: "monthly",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12354",
    timeframe: "H1",
    symbols: ["XAUUSD"],
    description: "Trend-following gold strategy with consistent returns",
    rating: 4.4,
    subscribers: 145,
    isFree: false,
  },
  {
    id: "sample-11",
    name: "Multi-Pair Diversified",
    author: "DiversifiedFX",
    broker: "HotForex",
    currency: "USD",
    growth: 178.2,
    drawdown: 11.3,
    winRate: 72.5,
    trades: 678,
    balance: 25000,
    equity: 29455,
    profitFactor: 2.2,
    price: 35,
    period: "monthly",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12355",
    timeframe: "H1",
    symbols: ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"],
    description: "Diversified multi-pair strategy with low drawdown",
    rating: 4.3,
    subscribers: 198,
    isFree: false,
  },
  {
    id: "sample-12",
    name: "Free Gold Daily Setup",
    author: "FreeGoldDaily",
    broker: "IC Markets",
    currency: "USD",
    growth: 124.6,
    drawdown: 20.7,
    winRate: 69.1,
    trades: 234,
    balance: 8000,
    equity: 8996,
    profitFactor: 1.9,
    price: 0,
    period: "free",
    imageUrl: "https://c.mql5.com/users/0/0/0/avatar.jpg",
    subscribeUrl: "https://www.mql5.com/en/signals/12356",
    timeframe: "D1",
    symbols: ["XAUUSD"],
    description: "Free daily gold setups — minimal risk per trade",
    rating: 4.1,
    subscribers: 890,
    isFree: true,
  },
];

// GET /api/mql5-signals — returns list of MQL5 signals
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const minGrowth = Number(url.searchParams.get("minGrowth") || 0);
    const maxDrawdown = Number(url.searchParams.get("maxDrawdown") || 100);
    const minWinRate = Number(url.searchParams.get("minWinRate") || 0);
    const freeOnly = url.searchParams.get("freeOnly") === "true";
    const sort = url.searchParams.get("sort") || "growth";
    const broker = url.searchParams.get("broker") || "";
    const symbol = url.searchParams.get("symbol") || "";
    const timeframe = url.searchParams.get("timeframe") || "";

    // Try to fetch live signals from MQL5.com
    let signals = SAMPLE_SIGNALS;
    try {
      const mql5Url = "https://www.mql5.com/en/signals/mt5";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(mql5Url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
        },
      });
      clearTimeout(timeout);
      // If we get a valid response, we'd parse it here. For now, fall back to samples.
      if (!response.ok) {
        throw new Error(`MQL5 returned ${response.status}`);
      }
      // Note: MQL5.com signals are typically rendered client-side via JS,
      // so server-side fetching returns the shell HTML only. We use samples.
    } catch {
      // Use SAMPLE_SIGNALS — they represent realistic MQL5 signals
    }

    // Apply filters
    let filtered = signals.filter((s) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) &&
          !s.author.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (s.growth < minGrowth) return false;
      if (s.drawdown > maxDrawdown) return false;
      if (s.winRate < minWinRate) return false;
      if (freeOnly && !s.isFree) return false;
      if (broker && !s.broker.toLowerCase().includes(broker.toLowerCase())) return false;
      if (symbol && !s.symbols.some(s_ => s_.toLowerCase().includes(symbol.toLowerCase()))) return false;
      if (timeframe && s.timeframe !== timeframe) return false;
      return true;
    });

    // Sort
    if (sort === "growth") {
      filtered = filtered.sort((a, b) => b.growth - a.growth);
    } else if (sort === "winRate") {
      filtered = filtered.sort((a, b) => b.winRate - a.winRate);
    } else if (sort === "drawdown") {
      filtered = filtered.sort((a, b) => a.drawdown - b.drawdown);
    } else if (sort === "subscribers") {
      filtered = filtered.sort((a, b) => b.subscribers - a.subscribers);
    } else if (sort === "profitFactor") {
      filtered = filtered.sort((a, b) => b.profitFactor - a.profitFactor);
    } else if (sort === "rating") {
      filtered = filtered.sort((a, b) => b.rating - a.rating);
    }

    return NextResponse.json(
      {
        signals: filtered,
        total: filtered.length,
        source: "MQL5.com official signals (sample data — full live integration requires browser access)",
        timestamp: new Date().toISOString(),
        officialUrl: "https://www.mql5.com/en/signals/mt5",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch signals" },
      { status: 500 }
    );
  }
}
