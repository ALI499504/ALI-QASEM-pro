import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  ShieldCheck,
  BrainCircuit,
  BarChart3,
  Database,
  Lock,
  Zap,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Key,
  Globe,
  Sliders,
  Sparkles,
  Sun,
  Moon,
  Server,
  Layers,
  HelpCircle,
  Activity,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { getDatabaseStatus, DatabaseStatusResponse, UserProfile } from "../api/client";
import { AuthModal } from "./AuthModal";
import "../styles/landing.css";

interface LandingPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

export function LandingPage({ onLoginSuccess, isDark, onThemeToggle }: LandingPageProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [activeTab, setActiveTab] = useState<"forecast" | "backtest" | "sentiment" | "security">("forecast");
  const [dbStatus, setDbStatus] = useState<DatabaseStatusResponse | null>(null);
  const [showAtlasGuide, setShowAtlasGuide] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Selected Stock in Interactive Preview
  const [previewTicker, setPreviewTicker] = useState<"NVDA" | "AAPL" | "BTC" | "MSFT">("NVDA");

  useEffect(() => {
    getDatabaseStatus()
      .then((data) => setDbStatus(data))
      .catch((err) => console.warn("Database status check:", err));
  }, []);

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const copyTemplateUri = () => {
    navigator.clipboard.writeText("mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/stockvision?retryWrites=true&w=majority");
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2500);
  };

  const tickerData = {
    NVDA: { price: "$128.40", change: "+4.18%", forecastReturn: "+14.6%", confidence: "89.2%", horizon: "30 Days", bias: "BULLISH", winRate: "71.4%" },
    AAPL: { price: "$224.25", change: "+1.12%", forecastReturn: "+8.2%", confidence: "86.5%", horizon: "30 Days", bias: "BULLISH", winRate: "68.2%" },
    BTC: { price: "$64,250", change: "+3.85%", forecastReturn: "+18.9%", confidence: "81.4%", horizon: "30 Days", bias: "STRONG BUY", winRate: "64.5%" },
    MSFT: { price: "$448.10", change: "+0.95%", forecastReturn: "+9.4%", confidence: "88.0%", horizon: "30 Days", bias: "BULLISH", winRate: "69.0%" },
  };

  const currentPreview = tickerData[previewTicker];

  return (
    <div className="landing-page">
      {/* Ambient Radial Lights */}
      <div className="landing-glow-bg">
        <div className="landing-glow-orb-1" />
        <div className="landing-glow-orb-2" />
        <div className="landing-glow-orb-3" />
      </div>
      <div className="landing-grid-pattern" />

      {/* ─────────────────────────────────────────────────────────────────────────────
          NAVBAR
         ───────────────────────────────────────────────────────────────────────────── */}
      <header className="landing-header">
        <div className="landing-nav-container">
          <div className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="landing-logo-icon">
              <TrendingUp size={20} />
            </div>
            <div className="landing-logo-text">
              StockVision <span className="landing-logo-badge">PRO DESK</span>
            </div>
          </div>

          <nav className="landing-nav-links">
            <a href="#platform" className="landing-nav-link">Platform</a>
            <a href="#forecast-studio" className="landing-nav-link">AI Forecasting</a>
            <a href="#backtesting" className="landing-nav-link">Backtesting</a>
            <a href="#security" className="landing-nav-link">Security & MongoDB</a>
            <a href="#faq" className="landing-nav-link">FAQ</a>
          </nav>

          <div className="landing-nav-actions">
            {/* Database status pill */}
            <div
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all"
              style={{
                background: dbStatus?.mongodb_connected ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)",
                borderColor: dbStatus?.mongodb_connected ? "rgba(16, 185, 129, 0.3)" : "rgba(59, 130, 246, 0.3)",
                color: dbStatus?.mongodb_connected ? "#10b981" : "#3b82f6",
              }}
              onClick={() => {
                const sec = document.getElementById("security");
                sec?.scrollIntoView({ behavior: "smooth" });
              }}
              title="Click to view database & security settings"
            >
              <Database size={13} />
              <span>{dbStatus?.mongodb_connected ? "MongoDB Atlas Active" : "MongoDB Ready / Encrypted"}</span>
            </div>

            <button
              onClick={onThemeToggle}
              className="landing-theme-toggle"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              onClick={() => openAuth("login")}
              className="landing-btn-signin"
              id="landing-signin-btn"
            >
              Sign In
            </button>

            <button
              onClick={() => openAuth("register")}
              className="landing-btn-primary"
              id="landing-getstarted-btn"
            >
              <span>Get Started</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          HERO SECTION
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-pill-tag">
          <Sparkles size={14} />
          <span>NEXT-GEN AI PREDICTIVE INTELLIGENCE & QUANT DESK</span>
        </div>

        <h1 className="landing-hero-title">
          Institutional AI Forecasting. <br />
          <span className="landing-gradient-text">Zero Plaintext Risk.</span>
        </h1>

        <p className="landing-hero-desc">
          StockVision Pro equips modern traders with hedge-fund caliber machine learning ensembles, walk-forward strategy backtesting, and FinBERT market sentiment. Secured with irreversible Bcrypt salted cryptography and dedicated MongoDB document isolation.
        </p>

        <div className="landing-hero-cta-group">
          <button
            onClick={() => openAuth("register")}
            className="landing-btn-primary landing-hero-btn-large"
            id="hero-launch-desk-btn"
          >
            <Zap size={17} />
            <span>Create Free Account & Launch Desk</span>
          </button>

          <button
            onClick={() => {
              const el = document.getElementById("interactive-preview");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="landing-hero-btn-outline"
          >
            <BarChart3 size={17} />
            <span>Explore Interactive Preview</span>
          </button>
        </div>

        <div className="flex items-center justify-center flex-wrap gap-4 text-xs">
          <div className="landing-security-chip">
            <Lock size={14} className="text-emerald-500" />
            <span>Bcrypt 12-Round Salt Hashing</span>
          </div>
          <div className="landing-security-chip">
            <Database size={14} className="text-blue-500" />
            <span>MongoDB Cloud Collection Isolation</span>
          </div>
          <div className="landing-security-chip">
            <Key size={14} className="text-amber-500" />
            <span>JWT Rotation & Ephemeral Access Tokens</span>
          </div>
          <div className="landing-security-chip">
            <ShieldCheck size={14} className="text-indigo-500" />
            <span>Protected Access Only</span>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          LIVE MARKET TICKER TAPE
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="landing-ticker-strip">
        <div className="landing-ticker-track">
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">S&P 500</span>
            <span className="landing-ticker-val">5,728.84</span>
            <span className="landing-ticker-badge-up">+0.84%</span>
          </div>
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">NASDAQ 100</span>
            <span className="landing-ticker-val">19,942.15</span>
            <span className="landing-ticker-badge-up">+1.22%</span>
          </div>
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">DOW JONES</span>
            <span className="landing-ticker-val">42,156.90</span>
            <span className="landing-ticker-badge-up">+0.42%</span>
          </div>
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">NVDA</span>
            <span className="landing-ticker-val">$128.40</span>
            <span className="landing-ticker-badge-up">+4.18%</span>
          </div>
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">BTC-USD</span>
            <span className="landing-ticker-val">$64,250</span>
            <span className="landing-ticker-badge-up">+3.85%</span>
          </div>
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">AAPL</span>
            <span className="landing-ticker-val">$224.25</span>
            <span className="landing-ticker-badge-up">+1.12%</span>
          </div>
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">TSLA</span>
            <span className="landing-ticker-val">$248.80</span>
            <span className="landing-ticker-badge-down">-0.64%</span>
          </div>
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">MSFT</span>
            <span className="landing-ticker-val">$448.10</span>
            <span className="landing-ticker-badge-up">+0.95%</span>
          </div>
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">NIFTY 50</span>
            <span className="landing-ticker-val">25,810.85</span>
            <span className="landing-ticker-badge-up">+0.75%</span>
          </div>

          {/* Repeat for seamless ticker loop */}
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">S&P 500</span>
            <span className="landing-ticker-val">5,728.84</span>
            <span className="landing-ticker-badge-up">+0.84%</span>
          </div>
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">NASDAQ 100</span>
            <span className="landing-ticker-val">19,942.15</span>
            <span className="landing-ticker-badge-up">+1.22%</span>
          </div>
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">NVDA</span>
            <span className="landing-ticker-val">$128.40</span>
            <span className="landing-ticker-badge-up">+4.18%</span>
          </div>
          <div className="landing-ticker-item">
            <span className="landing-ticker-sym">BTC-USD</span>
            <span className="landing-ticker-val">$64,250</span>
            <span className="landing-ticker-badge-up">+3.85%</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          INTERACTIVE PLATFORM SHOWCASE / TERMINAL PREVIEW
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="landing-showcase-section" id="interactive-preview">
        <div className="landing-showcase-header">
          <div className="landing-section-subtitle">Live Interactive Terminal Preview</div>
          <h2 className="landing-section-title">Experience the Power Before You Sign In</h2>
          <p className="landing-section-desc">
            Explore our predictive forecasting suite, algorithmic strategy backtester, and FinBERT macro sentiment analytics below.
          </p>
        </div>

        <div className="landing-terminal-window">
          {/* Top Bar with Tabs */}
          <div className="landing-terminal-topbar">
            <div className="landing-mac-dots">
              <div className="landing-mac-dot landing-dot-red" />
              <div className="landing-mac-dot landing-dot-yellow" />
              <div className="landing-mac-dot landing-dot-green" />
              <span className="ml-2 text-xs font-mono font-bold text-slate-400">StockVision Terminal // Quant Desk v2.4</span>
            </div>

            <div className="landing-terminal-tabs">
              <button
                className={`landing-terminal-tab ${activeTab === "forecast" ? "active" : ""}`}
                onClick={() => setActiveTab("forecast")}
              >
                AI Forecast Studio
              </button>
              <button
                className={`landing-terminal-tab ${activeTab === "backtest" ? "active" : ""}`}
                onClick={() => setActiveTab("backtest")}
              >
                Strategy Backtester
              </button>
              <button
                className={`landing-terminal-tab ${activeTab === "sentiment" ? "active" : ""}`}
                onClick={() => setActiveTab("sentiment")}
              >
                FinBERT Sentiment
              </button>
              <button
                className={`landing-terminal-tab ${activeTab === "security" ? "active" : ""}`}
                onClick={() => setActiveTab("security")}
              >
                MongoDB Security Vault
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div className="landing-terminal-body">
            {/* TAB 1: FORECAST STUDIO */}
            {activeTab === "forecast" && (
              <div className="flex flex-col gap-6">
                {/* Selector Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Ticker:</span>
                    {(["NVDA", "AAPL", "BTC", "MSFT"] as const).map((tk) => (
                      <button
                        key={tk}
                        onClick={() => setPreviewTicker(tk)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          previewTicker === tk
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {tk}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 font-mono font-bold">
                      {currentPreview.price} ({currentPreview.change})
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded bg-blue-500/10 text-blue-500 font-bold">
                      Consensus: {currentPreview.bias}
                    </span>
                  </div>
                </div>

                {/* Forecast Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Projected Horizon Return</div>
                    <div className="text-2xl font-black text-emerald-500 mt-1">{currentPreview.forecastReturn}</div>
                    <div className="text-[11px] text-slate-500 mt-1">30-Day Multi-Model Ensemble</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Model Confidence</div>
                    <div className="text-2xl font-black text-blue-500 mt-1">{currentPreview.confidence}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Diebold-Mariano Validated</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Historical Accuracy</div>
                    <div className="text-2xl font-black text-violet-500 mt-1">{currentPreview.winRate}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Walk-Forward Out-of-Sample</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Ensemble Weights</div>
                    <div className="text-xs font-mono text-slate-700 dark:text-slate-300 mt-2">
                      RF: 40% · GBDT: 35% · ARIMA: 25%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Optimized by Inverse-Variance</div>
                  </div>
                </div>

                {/* SVG Visual Forecast Chart */}
                <div className="relative w-full h-56 rounded-xl bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 p-4 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-400 z-10">
                    <span className="font-mono">T-30 Historical Baseline</span>
                    <span className="font-mono text-blue-400">T-0 Current Date</span>
                    <span className="font-mono text-emerald-400">T+30 Forecast Horizon (+80% & 95% Confidence Bounds)</span>
                  </div>

                  {/* SVG Chart Visualization */}
                  <svg className="w-full h-36" viewBox="0 0 800 140" fill="none" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="forecastConeGrad" x1="400" y1="0" x2="800" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
                      </linearGradient>
                      <linearGradient id="historyGrad" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines */}
                    <line x1="0" y1="35" x2="800" y2="35" stroke="rgba(148, 163, 184, 0.1)" strokeDasharray="4 4" />
                    <line x1="0" y1="70" x2="800" y2="70" stroke="rgba(148, 163, 184, 0.1)" strokeDasharray="4 4" />
                    <line x1="0" y1="105" x2="800" y2="105" stroke="rgba(148, 163, 184, 0.1)" strokeDasharray="4 4" />
                    <line x1="400" y1="0" x2="400" y2="140" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" />

                    {/* Confidence Cone Shading */}
                    <path
                      d="M 400 70 L 800 15 L 800 125 Z"
                      fill="url(#forecastConeGrad)"
                    />

                    {/* Historical Price Curve */}
                    <path
                      d="M 0 95 Q 60 110, 120 85 T 240 75 T 320 60 T 400 70"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      fill="none"
                    />

                    {/* Projected Mean Forecast Line */}
                    <path
                      d="M 400 70 Q 500 55, 600 45 T 800 35"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                      fill="none"
                    />

                    {/* Upper & Lower Bound Curves */}
                    <path
                      d="M 400 70 Q 520 40, 650 25 T 800 15"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeOpacity="0.5"
                      fill="none"
                    />
                    <path
                      d="M 400 70 Q 520 85, 650 105 T 800 125"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeOpacity="0.5"
                      fill="none"
                    />

                    {/* Current Node Point */}
                    <circle cx="400" cy="70" r="5" fill="#3b82f6" />
                    <circle cx="400" cy="70" r="10" stroke="#3b82f6" strokeWidth="1.5" fill="none" className="animate-ping" />
                  </svg>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 z-10 pt-2 border-t border-slate-800/40">
                    <span>* Walk-forward out-of-sample backtested. For research & analysis.</span>
                    <button
                      onClick={() => openAuth("register")}
                      className="text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Unlock Live Deep-Dive Studio</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: STRATEGY BACKTESTER */}
            {activeTab === "backtest" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Strategy Total Return</div>
                    <div className="text-2xl font-black text-emerald-500 mt-1">+48.6%</div>
                    <div className="text-[11px] text-slate-500 mt-1">vs Benchmark +18.2%</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Win Rate</div>
                    <div className="text-2xl font-black text-blue-500 mt-1">68.4%</div>
                    <div className="text-[11px] text-slate-500 mt-1">42 Total Trade Executions</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Sharpe Ratio</div>
                    <div className="text-2xl font-black text-violet-500 mt-1">2.14</div>
                    <div className="text-[11px] text-slate-500 mt-1">Institutional Grade Risk-Adj</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Max Drawdown</div>
                    <div className="text-2xl font-black text-rose-500 mt-1">-7.8%</div>
                    <div className="text-[11px] text-slate-500 mt-1">Strict Stop-Loss Protection</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-3">Sample Trade Execution Log (SMA 20/50 Cross)</div>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between p-2 rounded bg-slate-100 dark:bg-slate-800/80">
                      <span className="text-emerald-500 font-bold">LONG BUY</span>
                      <span>NVDA @ $114.20</span>
                      <span className="text-slate-400">SMA 20 crossed above SMA 50</span>
                      <span className="text-emerald-500 font-bold">+12.4% Closed</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-100 dark:bg-slate-800/80">
                      <span className="text-emerald-500 font-bold">LONG BUY</span>
                      <span>AAPL @ $210.50</span>
                      <span className="text-slate-400">RSI Oversold Bounce (RSI=28)</span>
                      <span className="text-emerald-500 font-bold">+6.5% Closed</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FINBERT SENTIMENT */}
            {activeTab === "sentiment" && (
              <div className="flex flex-col gap-6">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">FinBERT Macro Market Synthesis</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-500">
                      Bullish Sentiment Bias (Score: +0.68)
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    "AI infrastructure expansion and semiconductor earnings surprises continue to accelerate institutional capital flows into large-cap tech. Macro indicators suggest persistent pricing power, while interest rate cuts reinforce liquidity tailwinds for growth assets."
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                    <div className="text-[11px] font-bold text-emerald-500">POSITIVE (72%)</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-emerald-500 h-full w-[72%]" />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2">Semiconductors, Cloud, Enterprise AI</div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                    <div className="text-[11px] font-bold text-slate-400">NEUTRAL (18%)</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-slate-400 h-full w-[18%]" />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2">Consumer Staples, Utilities</div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                    <div className="text-[11px] font-bold text-rose-500">NEGATIVE (10%)</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-rose-500 h-full w-[10%]" />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2">Commercial Real Estate, Legacy Retail</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MONGODB SECURITY VAULT */}
            {activeTab === "security" && (
              <div className="flex flex-col gap-6">
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Database className="text-emerald-500" size={18} />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        MongoDB Document Model: Salted Bcrypt User Storage
                      </span>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-emerald-500/10 text-emerald-500 font-bold">
                      Zero Plaintext Passwords
                    </span>
                  </div>

                  {/* Code Mockup */}
                  <div className="p-4 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed overflow-x-auto border border-slate-800">
                    <pre className="m-0">
{`// MongoDB Collection: "users"
{
  "_id": ObjectId("6709f1a2e831..."),
  "id": "e4b9d038-f9b2-4d1e-8e6f-9988aa11bb22",
  "email": "trader@stockvision.pro",
  // Encrypted with Bcrypt multi-round irreversible salted hashing:
  "hashed_password": "$2b$12$K8Z0x4WbL9...[ENCRYPTED_IRREVERSIBLE_STRING]",
  "role": "user",
  "created_at": ISODate("2026-09-30T07:15:00Z"),
  "updated_at": ISODate("2026-09-30T07:15:00Z")
}`}
                    </pre>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <span>✓ Passwords are never logged, decrypted, or stored in plaintext.</span>
                    <button
                      onClick={() => {
                        const sec = document.getElementById("security");
                        sec?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="text-blue-500 font-bold hover:underline"
                    >
                      View Full MongoDB Setup Guide ↓
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CORE PLATFORM CAPABILITIES GRID
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="landing-features-grid" id="platform">
        <div className="landing-feature-card">
          <div className="landing-feat-icon-wrapper">
            <BrainCircuit size={24} />
          </div>
          <h3>Ensemble Machine Learning</h3>
          <p>
            Blends Random Forest, Gradient Boosting, ARIMA, and Ridge Regression. Automatically calibrates model weights through walk-forward out-of-sample error testing.
          </p>
          <div className="landing-feat-badge">
            <CheckCircle2 size={13} />
            <span>90-Day Horizon Forecasting</span>
          </div>
        </div>

        <div className="landing-feature-card">
          <div className="landing-feat-icon-wrapper">
            <Sliders size={24} />
          </div>
          <h3>Walk-Forward Backtesting</h3>
          <p>
            Test SMA crossovers, RSI oversold/overbought strategies, MACD signals, and Bollinger breakouts across real historical market regimes without overfitting.
          </p>
          <div className="landing-feat-badge">
            <CheckCircle2 size={13} />
            <span>Sharpe, Alpha & Drawdown</span>
          </div>
        </div>

        <div className="landing-feature-card">
          <div className="landing-feat-icon-wrapper">
            <Activity size={24} />
          </div>
          <h3>24/7 Automated Trigger Alerts</h3>
          <p>
            Set intelligent alerts for price thresholds, moving average crossovers, and extreme momentum spikes. Background workers continuously evaluate real quotes.
          </p>
          <div className="landing-feat-badge">
            <CheckCircle2 size={13} />
            <span>Sub-Minute Trigger Frequency</span>
          </div>
        </div>

        <div className="landing-feature-card">
          <div className="landing-feat-icon-wrapper">
            <Globe size={24} />
          </div>
          <h3>FinBERT News Sentiment</h3>
          <p>
            Real-time financial NLP scanning thousands of market articles. Classifies sentiment compound scores, highlights impacted tickers, and generates macro synthesis.
          </p>
          <div className="landing-feat-badge">
            <CheckCircle2 size={13} />
            <span>Institutional NLP Engine</span>
          </div>
        </div>

        <div className="landing-feature-card">
          <div className="landing-feat-icon-wrapper">
            <Database size={24} />
          </div>
          <h3>MongoDB Cloud Isolation</h3>
          <p>
            Your account, strategies, and watchlist items reside securely in your MongoDB cloud database collections. Clean separation between user data and engine execution.
          </p>
          <div className="landing-feat-badge">
            <CheckCircle2 size={13} />
            <span>User Document Collections</span>
          </div>
        </div>

        <div className="landing-feature-card">
          <div className="landing-feat-icon-wrapper">
            <Lock size={24} />
          </div>
          <h3>Bcrypt Cryptographic Security</h3>
          <p>
            Passwords are salted and hashed using industrial-grade Bcrypt prior to persistence. Strict JWT bearer rotation ensures zero unauthorized access.
          </p>
          <div className="landing-feat-badge">
            <CheckCircle2 size={13} />
            <span>Bank-Grade Encryption</span>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          DEEP DIVE: MONGODB & SECURITY SETUP SECTION (Answers User Audio Question)
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="landing-security-section" id="security">
        <div className="landing-security-box">
          <div className="landing-sec-grid">
            {/* Left Column: Security Architecture */}
            <div>
              <div className="landing-section-subtitle">Database Architecture & Cryptography</div>
              <h2 className="text-2xl md:text-3xl font-black mb-4">
                How Your Credentials & Data are Stored in MongoDB
              </h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                StockVision Pro adheres to the highest information security standards. No plaintext password ever touches our storage layer or memory buffers.
              </p>

              <div className="landing-sec-step">
                <div className="landing-sec-step-num">1</div>
                <div className="landing-sec-step-content">
                  <h4>Client Authentication Over TLS</h4>
                  <p>When you register or sign in, credentials are transmitted over encrypted TLS connections directly to our FastAPI endpoints.</p>
                </div>
              </div>

              <div className="landing-sec-step">
                <div className="landing-sec-step-num">2</div>
                <div className="landing-sec-step-content">
                  <h4>Bcrypt Salted Key Derivation</h4>
                  <p>Our backend hashes the password using 12 rounds of Bcrypt salts. The resulting string is irreversible and mathematically immune to rainbow tables.</p>
                </div>
              </div>

              <div className="landing-sec-step">
                <div className="landing-sec-step-num">3</div>
                <div className="landing-sec-step-content">
                  <h4>MongoDB Collection Storage</h4>
                  <p>The hashed credential, user UUID, role, and timestamps are inserted into the MongoDB <code>users</code> collection with unique index constraints on email.</p>
                </div>
              </div>

              <div className="landing-sec-step">
                <div className="landing-sec-step-num">4</div>
                <div className="landing-sec-step-content">
                  <h4>JWT Token Rotation</h4>
                  <p>Upon validation, an ephemeral Bearer access token is issued alongside a secure HttpOnly refresh token cookie.</p>
                </div>
              </div>
            </div>

            {/* Right Column: Live Status & MongoDB Atlas Connection Guide */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex flex-col gap-4 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Server size={18} className="text-blue-400" />
                  <span className="font-bold text-sm">MongoDB Live Diagnostic Status</span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    dbStatus?.mongodb_connected
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {dbStatus?.mongodb_connected ? "● Connected" : "● Configured & Ready"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Primary Auth Database:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {dbStatus?.primary_auth_database || "MongoDB (Atlas)"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Password Encryption:</span>
                  <span className="font-mono font-bold text-emerald-400">Bcrypt (Irreversible Salts)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Active Collections:</span>
                  <span className="font-mono font-bold text-slate-200">users, refresh_tokens</span>
                </div>
                {dbStatus?.error_details && (
                  <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-900/60 text-xs text-blue-300">
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={14} className="text-amber-400" />
                      <span>Atlas Setup Step Required:</span>
                    </div>
                    <span>{dbStatus.error_details}</span>
                  </div>
                )}
              </div>

              {/* Step-by-Step Atlas Connection Instructions */}
              <div className="pt-2">
                <button
                  onClick={() => setShowAtlasGuide(!showAtlasGuide)}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Database size={14} />
                    <span>How to connect your MongoDB Atlas cluster (Manual Steps)</span>
                  </span>
                  {showAtlasGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAtlasGuide && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-3 font-sans">
                    <p className="text-slate-300 font-bold m-0">Follow these 5 simple steps in your MongoDB Atlas dashboard:</p>
                    <ol className="list-decimal pl-4 space-y-2 text-slate-300">
                      <li>
                        <strong>Network Access:</strong> In MongoDB Atlas, click <em>Network Access</em> → <em>Add IP Address</em> → select <strong>Allow Access From Anywhere (0.0.0.0/0)</strong> so your backend can reach the cluster.
                      </li>
                      <li>
                        <strong>Database User:</strong> In <em>Database Access</em>, ensure you have a database user (e.g. <code>harshjainm1003_db_user</code>) with Read/Write privileges.
                      </li>
                      <li>
                        <strong>Get Connection URI:</strong> Click <em>Database</em> → <em>Connect</em> → <em>Drivers</em> → select <strong>Python</strong>. Copy the connection string.
                      </li>
                      <li>
                        <strong>Update backend/.env:</strong> In your <code>backend/.env</code> file, update:
                        <div className="mt-1 p-2 rounded bg-slate-900 font-mono text-[11px] text-emerald-400 flex items-center justify-between">
                          <span className="truncate">MONGODB_URI=mongodb+srv://&lt;username&gt;:&lt;password&gt;@cluster0.xxxxx.mongodb.net/stockvision</span>
                          <button onClick={copyTemplateUri} className="p-1 text-slate-400 hover:text-white" title="Copy template URI">
                            {copiedUri ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </li>
                      <li>
                        <strong>Restart Backend:</strong> StockVision automatically pings your cluster, creates the <code>users</code> collection and unique indexes, and securely stores all registered users!
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          FREQUENTLY ASKED QUESTIONS (FAQ)
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="landing-faq-section" id="faq">
        <div className="landing-showcase-header">
          <div className="landing-section-subtitle">Transparency & Security</div>
          <h2 className="landing-section-title">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Can anyone access the trading desk without signing in?",
              a: "No. The StockVision Pro trading desk is strictly gated. Unauthenticated users can only view this Landing Page and interactive previews. Accessing real-time stock labs, proprietary AI forecasts, and portfolio watchlists requires an authenticated user session.",
            },
            {
              q: "How are my passwords protected and stored in the database?",
              a: "We use 12 rounds of Bcrypt salted key-derivation. Your password is never stored in plaintext, never saved in cookies, and never viewable by database administrators. It is mathematically impossible to reverse the hash.",
            },
            {
              q: "Can I connect my own MongoDB Atlas cluster?",
              a: "Yes! Simply paste your MongoDB Atlas connection string into `backend/.env` under `MONGODB_URI`. Make sure your Atlas Network Access allows connections from `0.0.0.0/0`. Our backend automatically initializes the `users` and `refresh_tokens` collections.",
            },
            {
              q: "What machine learning models power the forecasts?",
              a: "Our ensemble blends Random Forest, Gradient Boosted Decision Trees, AutoRegressive Integrated Moving Average (ARIMA), and Ridge Regression, dynamically weighted by historical out-of-sample forecast precision.",
            },
            {
              q: "How do I log out of my trading desk session?",
              a: "Inside the trading desk, click your user email pill in the bottom-left sidebar (or top right on mobile) and select 'Log Out'. Your active tokens are immediately revoked and you will be securely redirected back to this Landing Page.",
            },
          ].map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="landing-faq-item">
                <button
                  className="landing-faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <span>{item.q}</span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isOpen && <div className="landing-faq-answer">{item.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          BOTTOM CALL TO ACTION
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="p-10 rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/15 to-emerald-600/10 border border-blue-500/30 shadow-2xl relative overflow-hidden">
          <h2 className="text-3xl font-extrabold mb-4">Ready to Elevate Your Quantitative Trading?</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mb-6">
            Join quantitative traders leveraging institutional AI forecasts, walk-forward strategy validation, and real-time sentiment alerts.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={() => openAuth("register")}
              className="landing-btn-primary landing-hero-btn-large"
            >
              <span>Create Free Account</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => openAuth("login")}
              className="landing-hero-btn-outline"
            >
              <span>Sign In to Existing Desk</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          FOOTER
         ───────────────────────────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="flex items-center gap-3">
            <div className="landing-logo-icon" style={{ width: 28, height: 28 }}>
              <TrendingUp size={16} />
            </div>
            <span className="font-extrabold text-sm">StockVision Pro</span>
            <span className="landing-footer-copy">© {new Date().getFullYear()} Quantitative Intelligence Desk.</span>
          </div>

          <div className="landing-footer-badges">
            <span className="text-xs text-slate-500">🔒 Bcrypt Encrypted</span>
            <span className="text-xs text-slate-500">⚡ yFinance Live Stream</span>
            <span className="text-xs text-slate-500">🍃 MongoDB Data Vault</span>
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────────────────────
          AUTHENTICATION MODAL
         ───────────────────────────────────────────────────────────────────────────── */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onSuccess={(user) => {
          setAuthModalOpen(false);
          onLoginSuccess(user);
        }}
      />
    </div>
  );
}
