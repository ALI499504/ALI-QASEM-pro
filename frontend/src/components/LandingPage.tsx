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
  CheckCircle2,
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
            <TrendingUp size={22} strokeWidth={2.5} />
          </div>
          <div className="auth-brand-name">
            <span>StockVision</span>
            <span className="brand-accent">PRO</span>
          </div>
        </div>

        <div className="auth-nav-right">
          {dbStatus && (
            <div className={`db-status-chip ${dbStatus.mongodb_connected ? "connected" : "fallback"}`}>
              <Database size={13} />
              <span>{dbStatus.mongodb_connected ? "MongoDB Atlas Active" : "Local Storage"}</span>
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

      {/* Main Container: Split-screen visual intro + Auth form */}
      <main className="auth-main-container">
        {/* Left Side: Product visuals & features */}
        <section className="product-visuals-panel">
          <div className="visuals-badge">
            <Sparkles size={14} className="sparkle-icon" />
            <span>AI-Driven Quantitative Trading Desk</span>
          </div>

          <h1 className="visuals-headline">
            Institutional Market Intel &{" "}
            <span className="highlight-gradient">Predictive Forecasting</span>
          </h1>

          <p className="visuals-subtext">
            Empower your trading decisions with walk-forward machine learning models,
            real-time algorithmic backtesting, and institutional-grade news sentiment analysis.
          </p>

          {/* Visual Highlight Cards */}
          <div className="features-visual-grid">
            <div className="feature-visual-card">
              <div className="card-icon-wrap icon-blue">
                <BrainCircuit size={20} />
              </div>
              <div className="card-content">
                <h3>Multi-Horizon ML Forecasts</h3>
                <p>Ensemble models with 7-day to 90-day trajectory paths and confidence bands.</p>
              </div>
            </div>

            <div className="feature-visual-card">
              <div className="card-icon-wrap icon-indigo">
                <BarChart3 size={20} />
              </div>
              <div className="card-content">
                <h3>Algorithmic Backtester</h3>
                <p>Simulate momentum, mean reversion & trend strategies with Sharpe & max drawdown metrics.</p>
              </div>
            </div>

            <div className="feature-visual-card">
              <div className="card-icon-wrap icon-emerald">
                <Zap size={20} />
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
        </section>

        {/* Right Side: Clean, spacious Sign In / Sign Up Form */}
        <section className="auth-form-panel">
          <div className="auth-card">
            {/* Mode Switcher Tabs */}
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${mode === "login" ? "active" : ""}`}
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === "register" ? "active" : ""}`}
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
                <h2>{mode === "login" ? "Welcome Back" : "Get Started Free"}</h2>
                <p>
                  {mode === "login"
                    ? "Enter your credentials to unlock your quantitative desk."
                    : "Create your personal trading workspace in seconds."}
                </p>
              </div>

              {error && (
                <div className="auth-alert error">
                  <AlertCircle size={16} />
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
                      placeholder={mode === "register" ? "Min 8 characters (letters + numbers)" : "••••••••"}
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
                      <span>{mode === "login" ? "Enter Trading Desk" : "Create My Account"}</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              {/* Security Footnote */}
              <div className="auth-security-footer">
                <ShieldCheck size={14} className="shield-icon" />
                <span>Encrypted with 12-round Bcrypt & backed by MongoDB Vault</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
