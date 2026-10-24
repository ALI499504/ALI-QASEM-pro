"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================================================
//  Signal type definition
// ============================================================================
interface Signal {
  id: string;
  name: string;
  author: string;
  broker: string;
  currency: string;
  growth: number;
  drawdown: number;
  winRate: number;
  trades: number;
  balance: number;
  equity: number;
  profitFactor: number;
  price: number;
  period: string;
  imageUrl: string;
  subscribeUrl: string;
  timeframe: string;
  symbols: string[];
  description: string;
  rating: number;
  subscribers: number;
  isFree: boolean;
}

// ============================================================================
//  BFX MQL5 Signals Page with embedded official MQL5.com iframe
// ============================================================================
export default function MQL5SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"iframe" | "cards">("iframe");
  const [iframeError, setIframeError] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [minGrowth, setMinGrowth] = useState(0);
  const [maxDrawdown, setMaxDrawdown] = useState(100);
  const [minWinRate, setMinWinRate] = useState(0);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState("growth");
  const [brokerFilter, setBrokerFilter] = useState("");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [timeframeFilter, setTimeframeFilter] = useState("");

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("minGrowth", String(minGrowth));
      params.set("maxDrawdown", String(maxDrawdown));
      params.set("minWinRate", String(minWinRate));
      params.set("freeOnly", String(freeOnly));
      params.set("sort", sortBy);
      if (brokerFilter) params.set("broker", brokerFilter);
      if (symbolFilter) params.set("symbol", symbolFilter);
      if (timeframeFilter) params.set("timeframe", timeframeFilter);

      const res = await fetch(`/api/mql5-signals?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setSignals(data.signals || []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load signals");
    } finally {
      setLoading(false);
    }
  }, [search, minGrowth, maxDrawdown, minWinRate, freeOnly, sortBy, brokerFilter, symbolFilter, timeframeFilter]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #020617 0%, #0c1226 50%, #1e1b4b 100%)",
      color: "#e2e8f0",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      direction: "ltr",  // LTR for proper MQL5.com display
    }}>
      {/* === Header === */}
      <header style={{
        padding: "20px 32px",
        background: "rgba(2,6,23,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(99,102,241,0.3)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1600,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div>
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0,
              letterSpacing: -0.5,
            }}>
              BFX MQL5 Signals
            </h1>
            <p style={{
              color: "#94a3b8",
              fontSize: 13,
              margin: "4px 0 0 0",
            }}>
              منصة نسخ الصفقات الرسمية من MetaTrader 5 — {viewMode === "iframe" ? "عرض MQL5.com مباشرة" : "تصفّح أفضل الإشارات"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {/* Toggle View Mode */}
            <div style={{
              display: "inline-flex",
              background: "rgba(15,23,42,0.6)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: 8,
              padding: 3,
            }}>
              <button
                onClick={() => setViewMode("iframe")}
                style={{
                  padding: "8px 16px",
                  background: viewMode === "iframe"
                    ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                    : "transparent",
                  color: viewMode === "iframe" ? "#fff" : "#94a3b8",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🌐 MQL5 الرسمي
              </button>
              <button
                onClick={() => setViewMode("cards")}
                style={{
                  padding: "8px 16px",
                  background: viewMode === "cards"
                    ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                    : "transparent",
                  color: viewMode === "cards" ? "#fff" : "#94a3b8",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📊 بطاقات منسّقة
              </button>
            </div>
            <a
              href="https://www.mql5.com/en/signals/mt5"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "10px 20px",
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                color: "#000",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(251,191,36,0.4)",
              }}
            >
              🚀 افتح MQL5 في تبويب جديد
            </a>
          </div>
        </div>
      </header>

      {/* === Main Content === */}
      {viewMode === "iframe" ? (
        <div style={{
          width: "100%",
          height: "calc(100vh - 100px)",
          position: "relative",
          background: "#0a0f1f",
        }}>
          {!iframeError ? (
            <>
              <iframe
                src="https://www.mql5.com/en/signals/mt5"
                title="MQL5.com Signals"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "#fff",
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={(e) => {
                  // Try to detect if iframe loaded successfully
                  try {
                    const iframe = e.target as HTMLIFrameElement;
                    // If we can access contentDocument, it's same-origin (allowed)
                    if (iframe.contentDocument === null) {
                      // Cross-origin blocked - this is normal, content should still display
                      // unless MQL5 explicitly blocks iframe
                    }
                  } catch {
                    // Ignore - cross-origin access throws
                  }
                }}
                onError={() => setIframeError(true)}
              />
              {/* Fallback notice - shows after 5 seconds if iframe doesn't load properly */}
              <IframeFallbackNotice onSwitchView={() => setViewMode("cards")} />
            </>
          ) : (
            <IframeBlocked onSwitchView={() => setViewMode("cards")} />
          )}
        </div>
      ) : (
        <>
          {/* === Filters Panel (only in cards view) === */}
          <section style={{
            padding: "20px 32px",
            background: "rgba(15,23,42,0.5)",
            borderBottom: "1px solid rgba(99,102,241,0.1)",
          }}>
            <div style={{
              maxWidth: 1600,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
                  🔍 بحث
                </label>
                <input
                  type="text"
                  placeholder="اسم الإشارة أو الـ provider..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
                  📈 Growth % (الأدنى)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={minGrowth}
                  onChange={(e) => setMinGrowth(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
                  📉 Max Drawdown %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={maxDrawdown}
                  onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
                  ✅ Win Rate % (الأدنى)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minWinRate}
                  onChange={(e) => setMinWinRate(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
                  🏦 الـ Broker
                </label>
                <select
                  value={brokerFilter}
                  onChange={(e) => setBrokerFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">الكل</option>
                  <option value="HotForex">HotForex</option>
                  <option value="IC Markets">IC Markets</option>
                  <option value="Exness">Exness</option>
                  <option value="Pepperstone">Pepperstone</option>
                  <option value="FXTM">FXTM</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
                  💱 الرمز
                </label>
                <select
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">الكل</option>
                  <option value="XAUUSD">XAUUSD (ذهب)</option>
                  <option value="EURUSD">EURUSD</option>
                  <option value="GBPUSD">GBPUSD</option>
                  <option value="USDJPY">USDJPY</option>
                  <option value="BTCUSD">BTCUSD</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
                  ⏱️ الفترة الزمنية
                </label>
                <select
                  value={timeframeFilter}
                  onChange={(e) => setTimeframeFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">الكل</option>
                  <option value="M1">M1 (دقيقة)</option>
                  <option value="M5">M5 (5 دقائق)</option>
                  <option value="M15">M15</option>
                  <option value="M30">M30</option>
                  <option value="H1">H1 (ساعة)</option>
                  <option value="H4">H4 (4 ساعات)</option>
                  <option value="D1">D1 (يومي)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>
                  🎯 ترتيب حسب
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={inputStyle}
                >
                  <option value="growth">📈 Growth</option>
                  <option value="winRate">✅ Win Rate</option>
                  <option value="drawdown">📉 Drawdown (الأقل)</option>
                  <option value="subscribers">👥 المشتركين</option>
                  <option value="profitFactor">💰 Profit Factor</option>
                  <option value="rating">⭐ التقييم</option>
                </select>
              </div>
            </div>

            <div style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                color: "#cbd5e1",
                fontSize: 14,
              }}>
                <input
                  type="checkbox"
                  checked={freeOnly}
                  onChange={(e) => setFreeOnly(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: "#10b981" }}
                />
                <span>🎁 الإشارات المجانية فقط</span>
              </label>
              <button
                onClick={() => {
                  setSearch("");
                  setMinGrowth(0);
                  setMaxDrawdown(100);
                  setMinWinRate(0);
                  setFreeOnly(false);
                  setBrokerFilter("");
                  setSymbolFilter("");
                  setTimeframeFilter("");
                  setSortBy("growth");
                }}
                style={{
                  padding: "6px 12px",
                  background: "rgba(127,29,29,0.3)",
                  color: "#fca5a5",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                🗑️ تصفير الفلاتر
              </button>
            </div>
          </section>

          {/* === Stats Summary === */}
          <section style={{ padding: "16px 32px" }}>
            <div style={{
              maxWidth: 1600,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
            }}>
              <StatCard label="إجمالي الإشارات" value={signals.length} color="#3b82f6" />
              <StatCard label="إشارات مجانية" value={signals.filter(s => s.isFree).length} color="#10b981" />
              <StatCard label="إشارات مدفوعة" value={signals.filter(s => !s.isFree).length} color="#f59e0b" />
              <StatCard label="أعلى Growth" value={`${Math.max(0, ...signals.map(s => s.growth)).toFixed(1)}%`} color="#8b5cf6" />
              <StatCard label="أعلى Win Rate" value={`${Math.max(0, ...signals.map(s => s.winRate)).toFixed(1)}%`} color="#ec4899" />
            </div>
          </section>

          {/* === Signals Grid === */}
          <section style={{ padding: "0 32px 32px" }}>
            <div style={{ maxWidth: 1600, margin: "0 auto" }}>
              {loading && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#fbbf24" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                  <div>جاري تحميل أفضل الإشارات...</div>
                </div>
              )}

              {error && (
                <div style={{
                  padding: 24,
                  background: "rgba(127,29,29,0.3)",
                  border: "1px solid #ef4444",
                  borderRadius: 12,
                  textAlign: "center",
                  color: "#fca5a5",
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
                  <div style={{ marginBottom: 8 }}>خطأ: {error}</div>
                  <button onClick={fetchSignals} style={{
                    padding: "8px 16px",
                    background: "#7c3aed",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}>
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {!loading && !error && signals.length === 0 && (
                <div style={{
                  padding: 60,
                  textAlign: "center",
                  color: "#94a3b8",
                  background: "rgba(15,23,42,0.5)",
                  borderRadius: 12,
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                  <div>لا توجد إشارات مطابقة لفلاترك. جرّب تخفيف الفلاتر.</div>
                </div>
              )}

              {!loading && !error && signals.length > 0 && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                  gap: 16,
                }}>
                  {signals.map((signal) => (
                    <SignalCard key={signal.id} signal={signal} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* === Footer === */}
      <footer style={{
        padding: "24px 32px",
        background: "rgba(2,6,23,0.85)",
        borderTop: "1px solid rgba(99,102,241,0.2)",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>
            🔗 المنصة الرسمية: <a
              href="https://www.mql5.com/en/signals/mt5"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#fbbf24", textDecoration: "none", fontWeight: 600 }}
            >MQL5.com/en/signals</a>
          </p>
          <p style={{ color: "#64748b", fontSize: 11, marginBottom: 8 }}>
            💡 الاشتراك الفعلي في الإشارات يتم من داخل MT5 terminal — افتح Navigator → Signals
          </p>
          <p style={{ color: "#475569", fontSize: 11 }}>
            © 2026 BFX AI — منصة عرض أفضل إشارات MetaTrader 5 الرسمية
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
//  Iframe Fallback Notice — shows after delay if iframe may have failed
// ============================================================================
function IframeFallbackNotice({ onSwitchView }: { onSwitchView: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: "absolute",
      bottom: 16,
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(2,6,23,0.95)",
      border: "1px solid rgba(251,191,36,0.4)",
      borderRadius: 8,
      padding: "10px 16px",
      color: "#cbd5e1",
      fontSize: 13,
      maxWidth: 600,
      textAlign: "center",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
    }}>
      <div style={{ marginBottom: 6 }}>
        ⚠ إذا كانت الصفحة أعلاه فارغة، قد يكون موقع MQL5.com يحظر التضمين.
      </div>
      <button
        onClick={onSwitchView}
        style={{
          padding: "6px 12px",
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        📊 التبديل لعرض البطاقات
      </button>
      <span style={{ margin: "0 8px", color: "#475569" }}>أو</span>
      <a
        href="https://www.mql5.com/en/signals/mt5"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "#fbbf24",
          textDecoration: "none",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        افتح MQL5.com في تبويب جديد ←
      </a>
    </div>
  );
}

// ============================================================================
//  Iframe Blocked — shown when iframe fails completely
// ============================================================================
function IframeBlocked({ onSwitchView }: { onSwitchView: () => void }) {
  return (
    <div style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      padding: 40,
      background: "rgba(15,23,42,0.9)",
      border: "1px solid rgba(239,68,68,0.4)",
      borderRadius: 12,
      textAlign: "center",
      maxWidth: 500,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: "#fca5a5", marginBottom: 12, fontSize: 20 }}>
        موقع MQL5.com يحظر التضمين
      </h2>
      <p style={{ color: "#94a3b8", marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>
        موقع MQL5.com يمنع عرضه داخل iframe. لديك خياران:
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={onSwitchView}
          style={{
            padding: "10px 20px",
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          📊 عرض البطاقات المنسّقة
        </button>
        <a
          href="https://www.mql5.com/en/signals/mt5"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "10px 20px",
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            color: "#000",
            textDecoration: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            display: "inline-block",
          }}
        >
          🌐 افتح MQL5.com
        </a>
      </div>
    </div>
  );
}

// ============================================================================
//  Helper Components
// ============================================================================
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "rgba(2,6,23,0.7)",
  color: "#f1f5f9",
  border: "1px solid rgba(99,102,241,0.3)",
  borderRadius: 6,
  fontSize: 13,
  outline: "none",
};

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      padding: "12px 16px",
      background: "rgba(15,23,42,0.6)",
      border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
    }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const growthColor = signal.growth > 100 ? "#10b981" : signal.growth > 50 ? "#fbbf24" : "#f59e0b";
  const drawdownColor = signal.drawdown < 15 ? "#10b981" : signal.drawdown < 25 ? "#fbbf24" : "#ef4444";
  const winRateColor = signal.winRate > 75 ? "#10b981" : signal.winRate > 65 ? "#fbbf24" : "#f59e0b";

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,27,75,0.4))",
      border: `1px solid ${signal.isFree ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.2)"}`,
      borderRadius: 12,
      padding: 20,
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "pointer",
      position: "relative",
      overflow: "hidden",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.3)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }}
    >
      {signal.isFree && (
        <div style={{
          position: "absolute",
          top: 12,
          right: 12,
          padding: "3px 10px",
          background: "linear-gradient(135deg, #10b981, #059669)",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          borderRadius: 4,
          boxShadow: "0 2px 8px rgba(16,185,129,0.4)",
        }}>
          🎁 FREE
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 800,
          color: "#fff",
          flexShrink: 0,
        }}>
          {signal.author[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            color: "#f1f5f9",
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
            marginBottom: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {signal.name}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>by {signal.author}</span>
            <span style={{
              padding: "2px 6px",
              background: "rgba(99,102,241,0.2)",
              color: "#a5b4fc",
              fontSize: 10,
              borderRadius: 3,
            }}>
              {signal.broker}
            </span>
          </div>
        </div>
      </div>

      <p style={{
        color: "#94a3b8",
        fontSize: 12,
        marginBottom: 12,
        lineHeight: 1.5,
        minHeight: 36,
      }}>
        {signal.description}
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 8,
        marginBottom: 12,
      }}>
        <Stat label="Growth" value={`${signal.growth.toFixed(1)}%`} color={growthColor} />
        <Stat label="Drawdown" value={`${signal.drawdown.toFixed(1)}%`} color={drawdownColor} />
        <Stat label="Win Rate" value={`${signal.winRate.toFixed(1)}%`} color={winRateColor} />
        <Stat label="Trades" value={signal.trades.toLocaleString()} color="#3b82f6" />
        <Stat label="PF" value={signal.profitFactor.toFixed(2)} color={signal.profitFactor > 2 ? "#10b981" : "#fbbf24"} />
        <Stat label="Subs" value={signal.subscribers.toLocaleString()} color="#a855f7" />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Tag>{signal.timeframe}</Tag>
        {signal.symbols.slice(0, 3).map((s) => (
          <Tag key={s} variant="primary">{s}</Tag>
        ))}
        {signal.symbols.length > 3 && (
          <Tag>+{signal.symbols.length - 3}</Tag>
        )}
      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        padding: "8px 12px",
        background: "rgba(2,6,23,0.5)",
        borderRadius: 6,
      }}>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 10 }}>Balance</div>
          <div style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 700 }}>
            ${signal.balance.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#94a3b8", fontSize: 10 }}>Price</div>
          <div style={{
            color: signal.isFree ? "#10b981" : "#fbbf24",
            fontSize: 14,
            fontWeight: 700,
          }}>
            {signal.isFree ? "FREE" : `$${signal.price}/${signal.period}`}
          </div>
        </div>
      </div>

      <a
        href={signal.subscribeUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          padding: "10px 0",
          background: signal.isFree
            ? "linear-gradient(135deg, #10b981, #059669)"
            : "linear-gradient(135deg, #4f46e5, #7c3aed)",
          color: "#fff",
          textAlign: "center",
          textDecoration: "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 700,
          boxShadow: signal.isFree
            ? "0 4px 12px rgba(16,185,129,0.4)"
            : "0 4px 12px rgba(79,70,229,0.4)",
        }}
      >
        {signal.isFree ? "🎁 اشترك مجاناً" : `🚀 اشترك الآن بـ $${signal.price}`}
      </a>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: "6px 8px",
      background: "rgba(2,6,23,0.5)",
      borderRadius: 4,
      textAlign: "center",
    }}>
      <div style={{ color: "#64748b", fontSize: 9, marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontSize: 13, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Tag({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "primary" }) {
  return (
    <span style={{
      padding: "2px 8px",
      background: variant === "primary" ? "rgba(251,191,36,0.15)" : "rgba(99,102,241,0.15)",
      color: variant === "primary" ? "#fbbf24" : "#a5b4fc",
      fontSize: 10,
      fontWeight: 600,
      borderRadius: 3,
    }}>
      {children}
    </span>
  );
}
