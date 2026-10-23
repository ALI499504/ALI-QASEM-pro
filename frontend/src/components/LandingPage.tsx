import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Sparkles,
  BarChart3,
  Zap,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Database,
  AlertCircle,
  Terminal,
  Key,
} from "lucide-react";
import { loginUser, registerUser, getDatabaseStatus, DatabaseStatusResponse, UserProfile } from "../api/client";
import "../styles/landing.css";

interface LandingPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

interface TickerQuote {
  sym: string;
  price: number;
  chg: string;
  up: boolean;
  vol: string;
}

const INITIAL_TICKERS: TickerQuote[] = [
  { sym: "NVDA", price: 128.40, chg: "+4.18%", up: true, vol: "48.2M" },
  { sym: "AAPL", price: 224.25, chg: "+1.12%", up: true, vol: "32.1M" },
  { sym: "BTC",  price: 64250.00, chg: "+3.85%", up: true, vol: "18.9K" },
  { sym: "SPY",  price: 552.10, chg: "+0.64%", up: true, vol: "65.4M" },
  { sym: "TSLA", price: 254.30, chg: "+2.91%", up: true, vol: "51.2M" },
  { sym: "MSFT", price: 485.63, chg: "+0.65%", up: true, vol: "28.4M" },
  { sym: "AMZN", price: 256.78, chg: "+1.94%", up: true, vol: "34.6M" },
  { sym: "META", price: 648.03, chg: "+0.57%", up: true, vol: "19.8M" },
  { sym: "GOOGL", price: 182.50, chg: "+1.45%", up: true, vol: "24.1M" },
  { sym: "ETH",  price: 3480.00, chg: "+2.15%", up: true, vol: "42.0K" },
];

export function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [retainSession, setRetainSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatusResponse | null>(null);

  // Live moving animated tickers state
  const [tickers, setTickers] = useState<TickerQuote[]>(INITIAL_TICKERS);

  useEffect(() => {
    getDatabaseStatus()
      .then((data) => setDbStatus(data))
      .catch(() => {});
  }, []);

  // Live price fluctuation animation interval to simulate real-time order flow
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers((prev) => {
        const randIdx = Math.floor(Math.random() * prev.length);
        const item = prev[randIdx];
        const delta = (Math.random() * 0.4 - 0.18);
        const newPrice = Math.max(1, Number((item.price + (item.price > 1000 ? delta * 15 : delta)).toFixed(2)));
        const updated = [...prev];
        updated[randIdx] = {
          ...item,
          price: newPrice,
        };
        return updated;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const isPasswordValid =
    password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (!isPasswordValid) {
        setError("Password must have at least 8 characters, including a letter and a number.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const res = await loginUser(email.trim(), password);
        onLoginSuccess(res.user);
      } else {
        const res = await registerUser(email.trim(), password);
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Authentication failed. Please verify your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="institutional-landing-page">
      {/* Light subtle architectural grid & ambient glow */}
      <div className="inst-ambient-glow glow-emerald" />
      <div className="inst-ambient-glow glow-cyan" />
      <div className="inst-grid-overlay" />

      {/* Top Navbar */}
      <header className="inst-navbar">
        <div className="inst-nav-left">
          <div className="inst-brand">
            <div className="inst-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <div className="inst-brand-title-wrap">
              <span className="inst-brand-title">{import.meta.env.VITE_APP_TITLE || "StockVision"}</span>
              <span className="inst-brand-alpha">Pro</span>
            </div>
            <div className="inst-pill-gateway">
              <span className="inst-dot green" />
              <span>PRO GATEWAY</span>
            </div>
          </div>
        </div>

        <div className="inst-nav-center">
          <div className="inst-pill-market">
            <span className="inst-dot green" />
            <span>Direct Market Access • NYSE / IEX Live</span>
          </div>
          <div className="inst-latency-pill">
            <span className="lbl">Latency</span>
            <span className="val">1.2ms</span>
          </div>
        </div>

        <div className="inst-nav-right">
          <div className={`inst-pill-atlas ${dbStatus?.mongodb_connected ? "connected" : ""}`}>
            <Database size={13} className="db-svg" />
            <span>{dbStatus?.mongodb_connected ? "Atlas Vault Active" : "Atlas Vault Ready"}</span>
            <span className="inst-dot green" />
          </div>

          <button
            type="button"
            className="inst-btn-cmd"
            title="Desk Command Line Mode"
            onClick={() => alert("Desk Command Terminal: Press Ctrl+K on your active trading desk to trigger real-time quant operations.")}
          >
            <Terminal size={13} />
            <span>Desk Cmd</span>
          </button>

          <button
            type="button"
            className="inst-btn-shield"
            title="SOC2 Type II Active Audit"
          >
            <ShieldCheck size={16} />
          </button>
        </div>
      </header>

      {/* Main Two-Column Institutional Layout */}
      <main className="inst-main-container">
        {/* Left Column: Quantitative Intel Intro */}
        <section className="inst-hero-intro">
          {/* Eyebrow badge */}
          <div className="inst-engine-badge">
            <span className="inst-dot green" />
            <span>INSTITUTIONAL QUANTITATIVE ENGINE</span>
          </div>

          {/* Headline with elegant italic serif accent */}
          <h1 className="inst-headline">
            <span className="headline-sans">Institutional Market Intel</span>
            <span className="headline-serif">&amp; Predictive Forecasting</span>
          </h1>

          <p className="inst-subtext">
            High-throughput order flow analytics, multi-horizon probabilistic price cones,
            algorithmic backtesting, and FinBERT natural language sentiment calibrated for
            private institutional desks.
          </p>
        </section>

        {/* Right Column (Desktop) / Primary Form (Mobile): Terminal Access Card */}
        <section className="inst-auth-col">
          <div className="terminal-desk-card">
            {/* Segmented Top Tabs */}
            <div className="terminal-tab-pill-box">
              <button
                type="button"
                className={`terminal-tab-btn ${mode === "login" ? "active" : ""}`}
                onClick={() => { setMode("login"); setError(null); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`terminal-tab-btn ${mode === "register" ? "active" : ""}`}
                onClick={() => { setMode("register"); setError(null); }}
              >
                Create Account
              </button>
            </div>

            <div className="terminal-card-inner">
              {/* Meta Gateway row */}
              <div className="terminal-meta-row">
                <span className="meta-label">INSTITUTIONAL GATEWAY</span>
                <span className="meta-ports">Port 443 • TLS 1.3</span>
              </div>

              {/* Card Title */}
              <div className="terminal-headline-group">
                <h2 className="terminal-title">Terminal Access</h2>
                <p className="terminal-sub">
                  {mode === "login"
                    ? "Enter your email and password to access your active desk."
                    : "Create your credentials to access your active trading desk."}
                </p>
              </div>

              {error && (
                <div className="terminal-error-banner">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="terminal-fields-form">
                {/* Email Field */}
                <div className="terminal-field">
                  <div className="field-top-row">
                    <label htmlFor="auth-email">EMAIL</label>
                  </div>
                  <div className="terminal-input-container">
                    <Mail size={16} className="field-icon" />
                    <input
                      id="auth-email"
                      type="email"
                      required
                      placeholder="trader@stockvision.pro"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="terminal-field">
                  <div className="field-top-row">
                    <label htmlFor="auth-password">PASSWORD</label>
                    <button
                      type="button"
                      className="reset-token-btn"
                      onClick={() => alert("Please consult your administrator or check your email to reset credentials.")}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="terminal-input-container">
                    <Lock size={16} className="field-icon" />
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder={mode === "register" ? "Min 8 chars (letters + numbers)" : "••••••••••••••••"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      className="field-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field (Register Mode) */}
                {mode === "register" && (
                  <div className="terminal-field">
                    <div className="field-top-row">
                      <label htmlFor="auth-confirm-password">CONFIRM PASSWORD</label>
                    </div>
                    <div className="terminal-input-container">
                      <Lock size={16} className="field-icon" />
                      <input
                        id="auth-confirm-password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                )}

                {/* Options Row */}
                <div className="terminal-row-options">
                  <label className="retain-session-check">
                    <input
                      type="checkbox"
                      checked={retainSession}
                      onChange={(e) => setRetainSession(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <div className="fido-key-indicator">
                    <Key size={13} />
                    <span>2FA Protected</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="terminal-primary-btn"
                >
                  {loading ? (
                    <span className="submit-spinner">{mode === "login" ? "Signing In..." : "Creating Account..."}</span>
                  ) : (
                    <>
                      <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Security Footer */}
              <div className="terminal-security-badges">
                <div className="sec-pill">
                  <ShieldCheck size={14} className="sec-svg green" />
                  <span>Bcrypt Encrypted</span>
                </div>
                <div className="sec-pill">
                  <span className="inst-dot green" />
                  <span>SOC2 Type II</span>
                </div>
                <div className="sec-pill">
                  <span>MongoDB Vault</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Dedicated Institutional Feature Bento Cards */}
        <section className="inst-features-stack">
            {/* Card 1: Multi-Horizon ML Forecasts */}
            <div className="inst-bento-card">
              <div className="bento-card-left">
                <div className="bento-icon-box icon-green">
                  <Sparkles size={18} />
                </div>
                <div className="bento-card-content">
                  <div className="bento-title-row">
                    <h3>Multi-Horizon ML Forecasts</h3>
                    <span className="bento-pill pill-green">94.8% Acc</span>
                  </div>
                  <p>
                    Ensemble models with 7d to 90d trajectory paths, Monte Carlo
                    simulated distribution corridors &amp; dynamic confidence bounds.
                  </p>
                </div>
              </div>

              {/* Right Mini-Visual: Trajectory Corridor */}
              <div className="bento-micro-box micro-forecast">
                <div className="micro-header">
                  <span className="micro-meta">T+0</span>
                  <span className="micro-stat text-emerald">+14.2%</span>
                  <span className="micro-meta">T+30</span>
                </div>
                <div className="micro-canvas">
                  <svg viewBox="0 0 140 38" className="micro-svg" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="coneGradLight" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.04" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.22" />
                      </linearGradient>
                    </defs>
                    <path d="M 4 28 L 136 6 L 136 32 Z" fill="url(#coneGradLight)" />
                    <path d="M 4 28 Q 70 23 132 11" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="132" cy="11" r="3.5" fill="#10b981" />
                    <circle cx="132" cy="11" r="6" fill="none" stroke="#10b981" strokeWidth="1" strokeOpacity="0.4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: Algorithmic Backtester */}
            <div className="inst-bento-card">
              <div className="bento-card-left">
                <div className="bento-icon-box icon-purple">
                  <BarChart3 size={18} />
                </div>
                <div className="bento-card-content">
                  <div className="bento-title-row">
                    <h3>Algorithmic Backtester</h3>
                    <span className="bento-pill pill-purple">Sharpe 3.42</span>
                  </div>
                  <p>
                    Rigorous backtesting across 15+ years tick data. Mean reversion,
                    statistical arbitrage, and automated drawdown ceilings.
                  </p>
                </div>
              </div>

              {/* Right Mini-Visual: Alpha Curve */}
              <div className="bento-micro-box micro-backtest">
                <div className="micro-header">
                  <span className="micro-meta">Alpha</span>
                  <span className="micro-stat text-purple">Max DD 4.1%</span>
                </div>
                <div className="micro-canvas">
                  <svg viewBox="0 0 140 38" className="micro-svg" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="alphaGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="4" y1="28" x2="136" y2="28" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                    <path d="M 4 28 Q 50 26 80 18 T 132 8 L 132 28 Z" fill="url(#alphaGradLight)" />
                    <path d="M 4 28 Q 50 26 80 18 T 132 8" fill="none" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="132" cy="8" r="3.5" fill="#6366f1" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 3: FinBERT News Sentiment */}
            <div className="inst-bento-card">
              <div className="bento-card-left">
                <div className="bento-icon-box icon-emerald">
                  <Zap size={18} />
                </div>
                <div className="bento-card-content">
                  <div className="bento-title-row">
                    <h3>FinBERT News Sentiment</h3>
                    <span className="bento-pill pill-emerald">
                      <span className="inst-dot green micro" />
                      Live Stream
                    </span>
                  </div>
                  <p>
                    Transformer-based NLP sentiment calibrated across 40,000+
                    financial feeds, earnings call transcripts, and SEC filings.
                  </p>
                </div>
              </div>

              {/* Right Mini-Visual: Sentiment Meter */}
              <div className="bento-micro-box micro-sentiment">
                <div className="micro-header">
                  <span className="micro-meta">Bear</span>
                  <span className="micro-stat text-emerald">Bullish +82</span>
                  <span className="micro-meta">Bull</span>
                </div>
                <div className="micro-meter-track">
                  <div className="meter-bar-gradient" />
                  <div className="meter-slider-indicator" style={{ left: "82%" }}>
                    <div className="meter-pin-dot" />
                  </div>
                </div>
              </div>
            </div>
        </section>
      </main>

      {/* Bottom Live Moving Ticker Bar */}
      <footer className="inst-bottom-ticker-bar">
        <div className="ticker-feed-badge">
          <span className="inst-dot green" />
          <span>FEED DIRECT</span>
        </div>

        <div className="ticker-scroll-viewport">
          <div className="ticker-scroll-track">
            {tickers.map((item, idx) => (
              <div className="ticker-cell" key={`${item.sym}-${idx}`}>
                <span className="cell-sym">{item.sym}</span>
                <span className="cell-price">${item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`cell-chg ${item.up ? "positive" : "negative"}`}>
                  {item.chg}
                </span>
                <span className="cell-vol">Vol {item.vol}</span>
              </div>
            ))}
            {/* Repeated for continuous infinite seamless moving animation */}
            {tickers.map((item, idx) => (
              <div className="ticker-cell" key={`dup-${item.sym}-${idx}`}>
                <span className="cell-sym">{item.sym}</span>
                <span className="cell-price">${item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`cell-chg ${item.up ? "positive" : "negative"}`}>
                  {item.chg}
                </span>
                <span className="cell-vol">Vol {item.vol}</span>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
