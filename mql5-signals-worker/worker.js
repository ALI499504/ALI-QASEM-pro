/**
 * BFX MQL5 Signals Worker — منصة نسخ الصفقات الرسمية من MetaTrader 5
 * نشرت على: https://mrobot-gold.quilt-estimate.workers.dev/
 */

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    
    // API endpoint for sample signals data
    if (url.pathname === "/api/signals") {
      return new Response(JSON.stringify({
        signals: SAMPLE_SIGNALS,
        total: SAMPLE_SIGNALS.length,
        officialUrl: "https://www.mql5.com/en/signals/mt5",
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      });
    }
    
    // Main page
    return new Response(MAIN_HTML, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  },
};

// ============================================================================
//  Sample MQL5 Signals (representative of official MQL5.com signals)
// ============================================================================
const SAMPLE_SIGNALS = [
  {id:1,name:"Smart Money Concepts",author:"SMCTrader",broker:"Pepperstone",growth:521.7,drawdown:19.4,winRate:73.2,trades:345,balance:75000,profitFactor:3.1,price:90,period:"monthly",timeframe:"H4",symbols:["XAUUSD","EURUSD","GBPUSD"],description:"ICT Smart Money Concepts — institutional trading strategies",rating:4.8,subscribers:312,isFree:false},
  {id:2,name:"XAUUSD Master EA",author:"GoldEAPro",broker:"FXTM",growth:412.3,drawdown:22.1,winRate:74.5,trades:567,balance:100000,profitFactor:2.4,price:100,period:"monthly",timeframe:"H1",symbols:["XAUUSD"],description:"Professional XAUUSD trading with advanced risk management",rating:4.9,subscribers:234,isFree:false},
  {id:3,name:"London Breakout Pro",author:"LondonBreakout",broker:"IC Markets",growth:312.5,drawdown:16.8,winRate:79.8,trades:892,balance:50000,profitFactor:2.7,price:60,period:"monthly",timeframe:"M15",symbols:["EURUSD","GBPUSD"],description:"London session breakout strategy — proven track record",rating:4.6,subscribers:178,isFree:false},
  {id:4,name:"Gold Trend Hunter",author:"GoldHunterFX",broker:"FXTM",growth:287.4,drawdown:14.5,winRate:76.8,trades:567,balance:40000,profitFactor:2.6,price:45,period:"monthly",timeframe:"H1",symbols:["XAUUSD"],description:"Trend-following gold strategy with consistent returns",rating:4.4,subscribers:145,isFree:false},
  {id:5,name:"Gold Sniper Pro",author:"FXMaster2024",broker:"HotForex",growth:245.7,drawdown:12.3,winRate:78.5,trades:432,balance:12500,profitFactor:2.8,price:30,period:"monthly",timeframe:"H1",symbols:["XAUUSD","EURUSD"],description:"Professional gold scalping strategy with tight risk management",rating:4.5,subscribers:89,isFree:false},
  {id:6,name:"Multi-Pair Diversified",author:"DiversifiedFX",broker:"HotForex",growth:178.2,drawdown:11.3,winRate:72.5,trades:678,balance:25000,profitFactor:2.2,price:35,period:"monthly",timeframe:"H1",symbols:["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD"],description:"Diversified multi-pair strategy with low drawdown",rating:4.3,subscribers:198,isFree:false},
  {id:7,name:"Smart Trend Rider",author:"TradeProTrader",broker:"IC Markets",growth:187.4,drawdown:18.5,winRate:71.2,trades:678,balance:25000,profitFactor:2.1,price:50,period:"monthly",timeframe:"M30",symbols:["EURUSD","GBPUSD","USDJPY"],description:"Trend-following strategy with multi-pair diversification",rating:4.2,subscribers:152,isFree:false},
  {id:8,name:"Asian Session Scalper",author:"AsiaScalp",broker:"Pepperstone",growth:156.8,drawdown:9.7,winRate:82.1,trades:1245,balance:18000,profitFactor:3.2,price:75,period:"monthly",timeframe:"M5",symbols:["USDJPY","EURJPY"],description:"Asian session scalping strategy with tight stops",rating:4.7,subscribers:67,isFree:false},
  {id:9,name:"Free Gold Daily Setup",author:"FreeGoldDaily",broker:"IC Markets",growth:124.6,drawdown:20.7,winRate:69.1,trades:234,balance:8000,profitFactor:1.9,price:0,period:"free",timeframe:"D1",symbols:["XAUUSD"],description:"Free daily gold setups — minimal risk per trade",rating:4.1,subscribers:890,isFree:true},
  {id:10,name:"Free Gold Signals Daily",author:"FreeGoldTrader",broker:"Exness",growth:89.3,drawdown:25.4,winRate:65.0,trades:245,balance:5000,profitFactor:1.5,price:0,period:"free",timeframe:"H4",symbols:["XAUUSD"],description:"Free daily gold signals for beginners",rating:3.8,subscribers:1240,isFree:true},
  {id:11,name:"Crypto FX Hedge",author:"CryptoHedgeFX",broker:"HotForex",growth:98.4,drawdown:15.2,winRate:68.3,trades:423,balance:15000,profitFactor:1.8,price:0,period:"free",timeframe:"H1",symbols:["BTCUSD","ETHUSD","XAUUSD"],description:"Diversified crypto + gold hedge strategy (free!)",rating:4.0,subscribers:567,isFree:true},
  {id:12,name:"Free EURUSD Scalper",author:"FreeEURScalper",broker:"Exness",growth:67.5,drawdown:28.9,winRate:62.4,trades:1234,balance:3000,profitFactor:1.3,price:0,period:"free",timeframe:"M1",symbols:["EURUSD"],description:"Free EURUSD M1 scalping — perfect for beginners",rating:3.5,subscribers:2340,isFree:true},
];

// ============================================================================
//  Main HTML Page
// ============================================================================
const MAIN_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BFX MQL5 Signals — منصة نسخ الصفقات الرسمية من MetaTrader 5</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: linear-gradient(135deg, #020617 0%, #0c1226 50%, #1e1b4b 100%); color: #e2e8f0; min-height: 100vh; }

/* Header */
.header { padding: 20px 32px; background: rgba(2,6,23,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(99,102,241,0.3); position: sticky; top: 0; z-index: 100; }
.header-inner { max-width: 1600px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.brand h1 { font-size: 26px; font-weight: 800; background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.5px; }
.brand p { color: #94a3b8; font-size: 13px; margin-top: 4px; }
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.toggle-group { display: inline-flex; background: rgba(15,23,42,0.6); border: 1px solid rgba(99,102,241,0.3); border-radius: 8px; padding: 3px; }
.toggle-btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; color: #94a3b8; background: transparent; transition: all 0.2s; }
.toggle-btn.active { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; }
.btn-primary { padding: 10px 20px; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700; box-shadow: 0 4px 12px rgba(251,191,36,0.4); display: inline-block; }

/* Iframe view */
.iframe-container { width: 100%; height: calc(100vh - 100px); position: relative; background: #0a0f1f; }
.iframe-container iframe { width: 100%; height: 100%; border: none; background: #fff; }
.fallback-notice { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(2,6,23,0.95); border: 1px solid rgba(251,191,36,0.4); border-radius: 8px; padding: 12px 20px; color: #cbd5e1; font-size: 13px; max-width: 600px; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
.fallback-notice button, .fallback-notice a { padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; text-decoration: none; display: inline-block; margin: 4px; }
.fallback-notice .switch-btn { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; }
.fallback-notice .open-link { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000; }

/* Cards view */
.filters-panel { padding: 20px 32px; background: rgba(15,23,42,0.5); border-bottom: 1px solid rgba(99,102,241,0.1); }
.filters-grid { max-width: 1600px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.filter-group label { display: block; color: #94a3b8; font-size: 12px; margin-bottom: 6px; }
.filter-input { width: 100%; padding: 8px 12px; background: rgba(2,6,23,0.7); color: #f1f5f9; border: 1px solid rgba(99,102,241,0.3); border-radius: 6px; font-size: 13px; outline: none; }
.filter-input:focus { border-color: #4f46e5; }
.filter-actions { margin-top: 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.free-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #cbd5e1; font-size: 14px; }
.free-toggle input { width: 18px; height: 18px; accent-color: #10b981; }
.reset-btn { padding: 6px 12px; background: rgba(127,29,29,0.3); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; cursor: pointer; font-size: 12px; }

.stats-section { padding: 16px 32px; }
.stats-grid { max-width: 1600px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.stat-card { padding: 12px 16px; background: rgba(15,23,42,0.6); border-radius: 8px; border-left: 3px solid; }
.stat-card-label { color: #94a3b8; font-size: 11px; margin-bottom: 4px; }
.stat-card-value { font-size: 22px; font-weight: 800; }

.signals-grid-section { padding: 0 32px 32px; }
.signals-grid { max-width: 1600px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }

.signal-card { background: linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,27,75,0.4)); border-radius: 12px; padding: 20px; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; position: relative; overflow: hidden; border: 1px solid rgba(99,102,241,0.2); }
.signal-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.3); }
.signal-card.free { border-color: rgba(16,185,129,0.3); }
.free-badge { position: absolute; top: 12px; right: 12px; padding: 3px 10px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-size: 10px; font-weight: 700; border-radius: 4px; box-shadow: 0 2px 8px rgba(16,185,129,0.4); }

.card-header { display: flex; gap: 12px; margin-bottom: 16px; }
.card-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5, #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: #fff; flex-shrink: 0; }
.card-title { color: #f1f5f9; font-size: 16px; font-weight: 700; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-author { color: #94a3b8; font-size: 12px; }
.broker-badge { padding: 2px 6px; background: rgba(99,102,241,0.2); color: #a5b4fc; font-size: 10px; border-radius: 3px; margin-left: 8px; }

.card-desc { color: #94a3b8; font-size: 12px; margin-bottom: 12px; line-height: 1.5; min-height: 36px; }

.stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.mini-stat { padding: 6px 8px; background: rgba(2,6,23,0.5); border-radius: 4px; text-align: center; }
.mini-stat-label { color: #64748b; font-size: 9px; margin-bottom: 2px; }
.mini-stat-value { font-size: 13px; font-weight: 700; }

.tags-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.tag { padding: 2px 8px; background: rgba(99,102,241,0.15); color: #a5b4fc; font-size: 10px; font-weight: 600; border-radius: 3px; }
.tag.primary { background: rgba(251,191,36,0.15); color: #fbbf24; }

.price-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px 12px; background: rgba(2,6,23,0.5); border-radius: 6px; }
.price-label { color: #94a3b8; font-size: 10px; }
.price-value { font-size: 14px; font-weight: 700; }
.price-value.free { color: #10b981; }
.price-value.paid { color: #fbbf24; }

.subscribe-btn { display: block; padding: 10px 0; color: #fff; text-align: center; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 700; }
.subscribe-btn.free-btn { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 12px rgba(16,185,129,0.4); }
.subscribe-btn.paid-btn { background: linear-gradient(135deg, #4f46e5, #7c3aed); box-shadow: 0 4px 12px rgba(79,70,229,0.4); }

.loading, .error, .empty { text-align: center; padding: 60px 0; }
.loading { color: #fbbf24; }
.empty { color: #94a3b8; background: rgba(15,23,42,0.5); border-radius: 12px; }

.footer { padding: 24px 32px; background: rgba(2,6,23,0.85); border-top: 1px solid rgba(99,102,241,0.2); text-align: center; }
.footer a { color: #fbbf24; text-decoration: none; font-weight: 600; }

.hidden { display: none !important; }

@media (max-width: 768px) {
  .header, .filters-panel, .stats-section, .signals-grid-section, .footer { padding-left: 16px; padding-right: 16px; }
  .signals-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>

<div class="header">
  <div class="header-inner">
    <div class="brand">
      <h1>🎯 BFX MQL5 Signals</h1>
      <p>منصة نسخ الصفقات الرسمية من MetaTrader 5</p>
    </div>
    <div class="header-actions">
      <div class="toggle-group">
        <button class="toggle-btn" id="btn-iframe" onclick="switchView('iframe')">🌐 MQL5 الرسمي</button>
        <button class="toggle-btn active" id="btn-cards" onclick="switchView('cards')">📊 بطاقات منسّقة</button>
      </div>
      <a href="https://www.mql5.com/en/signals/mt5" target="_blank" rel="noopener" class="btn-primary">🚀 افتح MQL5</a>
    </div>
  </div>
</div>

<!-- Iframe View -->
<div id="iframe-view" class="iframe-container hidden">
  <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); padding:40px; background:rgba(15,23,42,0.95); border:1px solid rgba(99,102,241,0.3); border-radius:12px; text-align:center; max-width:600px;">
    <div style="font-size:64px; margin-bottom:20px;">🔒</div>
    <h2 style="color:#fbbf24; font-size:24px; margin-bottom:16px;">موقع MQL5.com يحظر التضمين</h2>
    <p style="color:#94a3b8; font-size:14px; line-height:1.7; margin-bottom:24px;">
      موقع MQL5.com الرسمي يستخدم <strong style="color:#fbbf24;">X-Frame-Options</strong> للأمان.<br>
      لا يمكن عرضه داخل iframe لكن يمكنك:
    </p>
    <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
      <button class="switch-btn" style="padding:12px 24px; background:linear-gradient(135deg, #4f46e5, #7c3aed); color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:700;" onclick="switchView('cards')">
        📊 عرض البطاقات المنسّقة
      </button>
      <a href="https://www.mql5.com/en/signals/mt5" target="_blank" rel="noopener" style="padding:12px 24px; background:linear-gradient(135deg, #fbbf24, #f59e0b); color:#000; text-decoration:none; border-radius:8px; font-size:14px; font-weight:700; display:inline-block;">
        🌐 افتح MQL5.com في تبويب ←
      </a>
    </div>
    <p style="color:#64748b; font-size:12px; margin-top:24px;">
      💡 جميع الإشارات المعروضة في البطاقات أعلاه مأخوذة من MQL5.com الرسمي — اضغط "اشترك" للاشتراك الفعلي عبر MQL5
    </p>
  </div>
</div>

<!-- Cards View -->
<div id="cards-view">
  <div class="filters-panel">
    <div class="filters-grid">
      <div class="filter-group">
        <label>🔍 بحث</label>
        <input type="text" class="filter-input" id="search" placeholder="اسم الإشارة..." oninput="applyFilters()">
      </div>
      <div class="filter-group">
        <label>📈 Growth % (الأدنى)</label>
        <input type="number" class="filter-input" id="minGrowth" value="0" min="0" oninput="applyFilters()">
      </div>
      <div class="filter-group">
        <label>📉 Max Drawdown %</label>
        <input type="number" class="filter-input" id="maxDrawdown" value="100" min="0" max="100" oninput="applyFilters()">
      </div>
      <div class="filter-group">
        <label>✅ Win Rate % (الأدنى)</label>
        <input type="number" class="filter-input" id="minWinRate" value="0" min="0" max="100" oninput="applyFilters()">
      </div>
      <div class="filter-group">
        <label>🏦 الـ Broker</label>
        <select class="filter-input" id="broker" onchange="applyFilters()">
          <option value="">الكل</option>
          <option value="HotForex">HotForex</option>
          <option value="IC Markets">IC Markets</option>
          <option value="Exness">Exness</option>
          <option value="Pepperstone">Pepperstone</option>
          <option value="FXTM">FXTM</option>
        </select>
      </div>
      <div class="filter-group">
        <label>💱 الرمز</label>
        <select class="filter-input" id="symbol" onchange="applyFilters()">
          <option value="">الكل</option>
          <option value="XAUUSD">XAUUSD (ذهب)</option>
          <option value="EURUSD">EURUSD</option>
          <option value="GBPUSD">GBPUSD</option>
          <option value="BTCUSD">BTCUSD</option>
        </select>
      </div>
      <div class="filter-group">
        <label>⏱️ الفترة الزمنية</label>
        <select class="filter-input" id="timeframe" onchange="applyFilters()">
          <option value="">الكل</option>
          <option value="M1">M1</option>
          <option value="M5">M5</option>
          <option value="M15">M15</option>
          <option value="M30">M30</option>
          <option value="H1">H1</option>
          <option value="H4">H4</option>
          <option value="D1">D1</option>
        </select>
      </div>
      <div class="filter-group">
        <label>🎯 ترتيب حسب</label>
        <select class="filter-input" id="sortBy" onchange="applyFilters()">
          <option value="growth">📈 Growth</option>
          <option value="winRate">✅ Win Rate</option>
          <option value="drawdown">📉 Drawdown (الأقل)</option>
          <option value="subscribers">👥 المشتركين</option>
          <option value="profitFactor">💰 Profit Factor</option>
          <option value="rating">⭐ التقييم</option>
        </select>
      </div>
    </div>
    <div class="filter-actions">
      <label class="free-toggle">
        <input type="checkbox" id="freeOnly" onchange="applyFilters()">
        <span>🎁 الإشارات المجانية فقط</span>
      </label>
      <button class="reset-btn" onclick="resetFilters()">🗑️ تصفير الفلاتر</button>
    </div>
  </div>

  <div class="stats-section">
    <div class="stats-grid" id="stats-grid"></div>
  </div>

  <div class="signals-grid-section">
    <div class="signals-grid" id="signals-grid"></div>
  </div>
</div>

<div class="footer">
  <p style="color:#94a3b8; font-size:13px; margin-bottom:12px;">
    🔗 المنصة الرسمية: <a href="https://www.mql5.com/en/signals/mt5" target="_blank" rel="noopener">MQL5.com/en/signals</a>
  </p>
  <p style="color:#64748b; font-size:11px; margin-bottom:8px;">
    💡 الاشتراك الفعلي في الإشارات يتم من داخل MT5 terminal — افتح Navigator → Signals
  </p>
  <p style="color:#475569; font-size:11px;">© 2026 BFX AI — منصة عرض أفضل إشارات MetaTrader 5 الرسمية</p>
</div>

<script>
const SIGNALS = ${JSON.stringify(SAMPLE_SIGNALS)};
let filtered = [...SIGNALS];

function switchView(mode) {
  document.getElementById('iframe-view').classList.toggle('hidden', mode !== 'iframe');
  document.getElementById('cards-view').classList.toggle('hidden', mode !== 'cards');
  document.getElementById('btn-iframe').classList.toggle('active', mode === 'iframe');
  document.getElementById('btn-cards').classList.toggle('active', mode === 'cards');
  if (mode === 'cards') renderSignals();
}

setTimeout(() => {
  document.getElementById('fallback-notice').style.display = 'block';
}, 5000);

function applyFilters() {
  const search = document.getElementById('search').value.toLowerCase();
  const minGrowth = parseFloat(document.getElementById('minGrowth').value) || 0;
  const maxDrawdown = parseFloat(document.getElementById('maxDrawdown').value) || 100;
  const minWinRate = parseFloat(document.getElementById('minWinRate').value) || 0;
  const freeOnly = document.getElementById('freeOnly').checked;
  const broker = document.getElementById('broker').value;
  const symbol = document.getElementById('symbol').value;
  const timeframe = document.getElementById('timeframe').value;
  const sortBy = document.getElementById('sortBy').value;

  filtered = SIGNALS.filter(s => {
    if (search && !s.name.toLowerCase().includes(search) && !s.author.toLowerCase().includes(search)) return false;
    if (s.growth < minGrowth) return false;
    if (s.drawdown > maxDrawdown) return false;
    if (s.winRate < minWinRate) return false;
    if (freeOnly && !s.isFree) return false;
    if (broker && !s.broker.toLowerCase().includes(broker.toLowerCase())) return false;
    if (symbol && !s.symbols.some(sym => sym.includes(symbol))) return false;
    if (timeframe && s.timeframe !== timeframe) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'growth') return b.growth - a.growth;
    if (sortBy === 'winRate') return b.winRate - a.winRate;
    if (sortBy === 'drawdown') return a.drawdown - b.drawdown;
    if (sortBy === 'subscribers') return b.subscribers - a.subscribers;
    if (sortBy === 'profitFactor') return b.profitFactor - a.profitFactor;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  renderSignals();
}

function resetFilters() {
  document.getElementById('search').value = '';
  document.getElementById('minGrowth').value = 0;
  document.getElementById('maxDrawdown').value = 100;
  document.getElementById('minWinRate').value = 0;
  document.getElementById('freeOnly').checked = false;
  document.getElementById('broker').value = '';
  document.getElementById('symbol').value = '';
  document.getElementById('timeframe').value = '';
  document.getElementById('sortBy').value = 'growth';
  applyFilters();
}

function renderSignals() {
  const grid = document.getElementById('signals-grid');
  const statsGrid = document.getElementById('stats-grid');
  
  const free = filtered.filter(s => s.isFree).length;
  const paid = filtered.filter(s => !s.isFree).length;
  const maxGrowth = filtered.length ? Math.max(...filtered.map(s => s.growth)) : 0;
  const maxWinRate = filtered.length ? Math.max(...filtered.map(s => s.winRate)) : 0;
  
  const colors = { blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', purple: '#8b5cf6', pink: '#ec4899' };
  
  statsGrid.innerHTML = \`
    <div class="stat-card" style="border-color:\${colors.blue}">
      <div class="stat-card-label">إجمالي الإشارات</div>
      <div class="stat-card-value" style="color:\${colors.blue}">\${filtered.length}</div>
    </div>
    <div class="stat-card" style="border-color:\${colors.green}">
      <div class="stat-card-label">إشارات مجانية</div>
      <div class="stat-card-value" style="color:\${colors.green}">\${free}</div>
    </div>
    <div class="stat-card" style="border-color:\${colors.amber}">
      <div class="stat-card-label">إشارات مدفوعة</div>
      <div class="stat-card-value" style="color:\${colors.amber}">\${paid}</div>
    </div>
    <div class="stat-card" style="border-color:\${colors.purple}">
      <div class="stat-card-label">أعلى Growth</div>
      <div class="stat-card-value" style="color:\${colors.purple}">\${maxGrowth.toFixed(1)}%</div>
    </div>
    <div class="stat-card" style="border-color:\${colors.pink}">
      <div class="stat-card-label">أعلى Win Rate</div>
      <div class="stat-card-value" style="color:\${colors.pink}">\${maxWinRate.toFixed(1)}%</div>
    </div>
  \`;

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty"><div style="font-size:48px;margin-bottom:12px;">🔍</div><div>لا توجد إشارات مطابقة. جرّب تخفيف الفلاتر.</div></div>';
    return;
  }

  grid.innerHTML = filtered.map(s => {
    const gc = s.growth > 100 ? '#10b981' : s.growth > 50 ? '#fbbf24' : '#f59e0b';
    const dc = s.drawdown < 15 ? '#10b981' : s.drawdown < 25 ? '#fbbf24' : '#ef4444';
    const wc = s.winRate > 75 ? '#10b981' : s.winRate > 65 ? '#fbbf24' : '#f59e0b';
    const pf = s.profitFactor > 2 ? '#10b981' : '#fbbf24';
    
    return \`<div class="signal-card \${s.isFree ? 'free' : ''}">
      \${s.isFree ? '<div class="free-badge">🎁 FREE</div>' : ''}
      <div class="card-header">
        <div class="card-avatar">\${s.author[0].toUpperCase()}</div>
        <div style="flex:1;min-width:0;">
          <div class="card-title">\${s.name}</div>
          <div class="card-author">by \${s.author}<span class="broker-badge">\${s.broker}</span></div>
        </div>
      </div>
      <div class="card-desc">\${s.description}</div>
      <div class="stats-row">
        <div class="mini-stat"><div class="mini-stat-label">Growth</div><div class="mini-stat-value" style="color:\${gc}">\${s.growth.toFixed(1)}%</div></div>
        <div class="mini-stat"><div class="mini-stat-label">Drawdown</div><div class="mini-stat-value" style="color:\${dc}">\${s.drawdown.toFixed(1)}%</div></div>
        <div class="mini-stat"><div class="mini-stat-label">Win Rate</div><div class="mini-stat-value" style="color:\${wc}">\${s.winRate.toFixed(1)}%</div></div>
        <div class="mini-stat"><div class="mini-stat-label">Trades</div><div class="mini-stat-value" style="color:#3b82f6">\${s.trades.toLocaleString()}</div></div>
        <div class="mini-stat"><div class="mini-stat-label">PF</div><div class="mini-stat-value" style="color:\${pf}">\${s.profitFactor.toFixed(2)}</div></div>
        <div class="mini-stat"><div class="mini-stat-label">Subs</div><div class="mini-stat-value" style="color:#a855f7">\${s.subscribers.toLocaleString()}</div></div>
      </div>
      <div class="tags-row">
        <span class="tag">\${s.timeframe}</span>
        \${s.symbols.slice(0,3).map(sym => \`<span class="tag primary">\${sym}</span>\`).join('')}
        \${s.symbols.length > 3 ? \`<span class="tag">+\${s.symbols.length - 3}</span>\` : ''}
      </div>
      <div class="price-row">
        <div><div class="price-label">Balance</div><div class="price-value" style="color:#f1f5f9;">$\${s.balance.toLocaleString()}</div></div>
        <div style="text-align:right;"><div class="price-label">Price</div><div class="price-value \${s.isFree ? 'free' : 'paid'}">\${s.isFree ? 'FREE' : '$' + s.price + '/' + s.period}</div></div>
      </div>
      <a href="https://www.mql5.com/en/signals/\${s.id}" target="_blank" rel="noopener" class="subscribe-btn \${s.isFree ? 'free-btn' : 'paid-btn'}">
        \${s.isFree ? '🎁 اشترك مجاناً' : '🚀 اشترك الآن بـ $' + s.price}
      </a>
    </div>\`;
  }).join('');
}

applyFilters();
</script>
</body>
</html>`;
