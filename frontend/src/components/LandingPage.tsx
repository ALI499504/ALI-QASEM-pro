import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  ShieldCheck,
  BrainCircuit,
  BarChart3,
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Database,
  AlertCircle,
  Sun,
  Moon,
  Zap,
} from "lucide-react";
import { loginUser, registerUser, getDatabaseStatus, DatabaseStatusResponse, UserProfile } from "../api/client";
import "../styles/landing.css";

interface LandingPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

export function LandingPage({ onLoginSuccess, isDark, onThemeToggle }: LandingPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatusResponse | null>(null);

  useEffect(() => {
    getDatabaseStatus()
      .then((data) => setDbStatus(data))
      .catch(() => {});
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
    <div className={`auth-landing-page ${isDark ? "dark-theme" : "light-theme"}`}>
      {/* Background ambient lighting */}
      <div className="ambient-glow glow-top-left" />
      <div className="ambient-glow glow-bottom-right" />
      <div className="ambient-grid-overlay" />

      {/* Top Navbar */}
      <header className="auth-navbar">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <TrendingUp size={20} strokeWidth={2.5} />
          </div>
          <div className="auth-brand-name">
            <span>StockVision</span>
            <span className="brand-accent">PRO</span>
          </div>
        </div>

        <div className="auth-nav-right">
          {dbStatus && (
            <div className={`db-status-chip ${dbStatus.mongodb_connected ? "connected" : "fallback"}`}>
              <Database size={13} className="db-icon" />
              <span className="db-text-full">{dbStatus.mongodb_connected ? "MongoDB Atlas Active" : "Local Database"}</span>
              <span className="db-text-mobile">{dbStatus.mongodb_connected ? "Atlas" : "Local"}</span>
              <span className="db-dot" />
            </div>
          )}

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onThemeToggle}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="auth-main-container">
        {/* Left Column on Desktop / Top & Bottom on Mobile */}
        <div className="auth-visuals-col">
          {/* Hero Intro Header */}
          <div className="auth-hero-intro">
            <div className="visuals-badge">
              <Sparkles size={13} className="sparkle-icon" />
              <span>AI Quantitative Intelligence</span>
            </div>

            <h1 className="visuals-headline">
              Institutional Market Intel &{" "}
              <span className="highlight-gradient">Predictive Forecasting</span>
            </h1>

            <p className="visuals-subtext">
              Real-time market analytics, multi-horizon machine learning price predictions,
              algorithmic backtesting, and institutional FinBERT news sentiment.
            </p>
          </div>

          {/* Visual Capabilities List */}
          <div className="auth-features-panel">
            <div className="features-visual-grid">
              <div className="feature-visual-card">
                <div className="card-icon-wrap icon-blue">
                  <BrainCircuit size={19} />
                </div>
                <div className="card-content">
                  <h3>Multi-Horizon ML Forecasts</h3>
                  <p>Ensemble models with 7-day to 90-day trajectory paths and confidence bands.</p>
                </div>
              </div>

              <div className="feature-visual-card">
                <div className="card-icon-wrap icon-indigo">
                  <BarChart3 size={19} />
                </div>
                <div className="card-content">
                  <h3>Algorithmic Backtester</h3>
                  <p>Simulate momentum, mean reversion & trend strategies with Sharpe & max drawdown metrics.</p>
                </div>
              </div>

              <div className="feature-visual-card">
                <div className="card-icon-wrap icon-emerald">
                  <Zap size={19} />
                </div>
                <div className="card-content">
                  <h3>FinBERT News Sentiment</h3>
                  <p>Transformer-based sentiment scoring parsed live across global financial news headlines.</p>
                </div>
              </div>
            </div>

            {/* Market sample preview pill */}
            <div className="market-ticker-pills">
              <div className="ticker-pill">
                <span className="ticker-sym">NVDA</span>
                <span className="ticker-price">$128.40</span>
                <span className="ticker-up">+4.18%</span>
              </div>
              <div className="ticker-pill">
                <span className="ticker-sym">AAPL</span>
                <span className="ticker-price">$224.25</span>
                <span className="ticker-up">+1.12%</span>
              </div>
              <div className="ticker-pill">
                <span className="ticker-sym">BTC</span>
                <span className="ticker-price">$64,250</span>
                <span className="ticker-up">+3.85%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column on Desktop / Positioned Immediately After Hero on Mobile */}
        <div className="auth-form-col">
          <div className="auth-card">
            {/* Segmented iOS-Style Tab Switcher */}
            <div className="auth-segmented-tabs">
              <button
                type="button"
                className={`auth-segment-tab ${mode === "login" ? "active" : ""}`}
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-segment-tab ${mode === "register" ? "active" : ""}`}
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                Create Account
              </button>
            </div>

            <div className="auth-card-body">
              <div className="auth-header">
                <h2>{mode === "login" ? "Welcome to StockVision" : "Create Account"}</h2>
                <p>
                  {mode === "login"
                    ? "Enter your credentials to unlock your trading desk."
                    : "Setup your quantitative trading workspace in seconds."}
                </p>
              </div>

              {error && (
                <div className="auth-alert error">
                  <AlertCircle size={16} className="alert-icon" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="auth-email">Email Address</label>
                  <div className="input-wrap">
                    <Mail size={16} className="input-icon" />
                    <input
                      id="auth-email"
                      type="email"
                      required
                      placeholder="trader@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="auth-password">Password</label>
                  <div className="input-wrap">
                    <Lock size={16} className="input-icon" />
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder={mode === "register" ? "Min 8 chars (letters + numbers)" : "••••••••"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      className="eye-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {mode === "register" && (
                  <div className="form-group">
                    <label htmlFor="auth-confirm-password">Confirm Password</label>
                    <div className="input-wrap">
                      <Lock size={16} className="input-icon" />
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

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn"
                >
                  {loading ? (
                    <span className="submit-spinner">Verifying credentials...</span>
                  ) : (
                    <>
                      <span>{mode === "login" ? "Enter Trading Desk" : "Create Free Account"}</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              {/* Security Footnote */}
              <div className="auth-security-footer">
                <ShieldCheck size={14} className="shield-icon" />
                <span>Encrypted with Bcrypt & backed by MongoDB Vault</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
