#!/usr/bin/env python3
"""Replace TopTicker + Header functions with a single modern ModernHeader."""

PAGE = "/home/z/my-project/src/app/page.tsx"

with open(PAGE, "r", encoding="utf-8") as f:
    content = f.read()

# Find boundaries
START_MARKER = "// ============ Sub-components ============\n"
END_MARKER = "function LivePriceCard({"

start_idx = content.find(START_MARKER)
end_idx = content.find(END_MARKER)

assert start_idx != -1 and end_idx != -1, "Markers not found"
assert end_idx > start_idx, "End before start"

print(f"Replacing chars {start_idx}..{end_idx} (length {end_idx - start_idx})")

NEW_HEADER = '''// ============ Sub-components ============

// Modern Professional Header — compact, dark, terminal-grade
// Inspired by Bloomberg Terminal + Hyperliquid + TradingView Pro
function ModernHeader({
  market,
  lastUpdate,
  onRefresh,
  refreshing,
  signalAction,
  signalConfidence,
  regimeAr,
}: {
  market: MarketData | null;
  lastUpdate: Date | null;
  onRefresh: () => void;
  refreshing: boolean;
  signalAction?: string;
  signalConfidence?: number;
  regimeAr?: string;
}) {
  const price = market?.price;
  const up = (price?.change ?? 0) >= 0;
  const { user, setLoginOpen, setAdminPanelOpen, setUserPanelOpen } = useAuthStore();
  const [showAccount, setShowAccount] = useState(false);

  // Determine current trading session (Asia / London / NY)
  const session = (() => {
    const utcHour = new Date().getUTCHours();
    // Asia: 00-08 UTC, London: 07-16 UTC, NY: 12-21 UTC
    if (utcHour >= 0 && utcHour < 7) return { name: "ASIA", color: "#a78bfa" };
    if (utcHour >= 7 && utcHour < 12) return { name: "LONDON", color: "#10b981" };
    if (utcHour >= 12 && utcHour < 21) return { name: "NEW YORK", color: "#5b8cff" };
    return { name: "ASIA", color: "#a78bfa" };
  })();

  // Data source label
  const sourceLabel = (price?.source || "").includes("MT5") ? "MT5 BRIDGE" : "XAUUSD SPOT";
  const sourceColor = (price?.source || "").includes("MT5") ? "#22d39a" : "#5b8cff";

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0e14]/95 border-b border-[#1a2030] shadow-lg shadow-black/40">
      <div className="max-w-[1700px] mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4 py-2.5">
          {/* === LEFT: Brand === */}
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative w-9 h-9 rounded-md flex items-center justify-center bg-gradient-to-br from-[#d4a574] to-[#8b6914] shadow-lg shadow-[#d4a574]/30"
            >
              <Zap className="w-5 h-5 text-black" strokeWidth={2.6} />
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#22d39a] ring-2 ring-[#0a0e14] animate-pulse" />
            </motion.div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-extrabold tracking-[0.15em] text-white leading-none">
                  M.ROBOT
                </h1>
                <span className="hidden sm:inline-block text-[9px] font-bold text-[#d4a574] px-1.5 py-0.5 rounded border border-[#d4a574]/40 bg-[#d4a574]/10">
                  v2026
                </span>
              </div>
              <p className="text-[9px] text-[#6b7280] mt-0.5 tracking-wide">
                XAUUSD • INSTITUTIONAL TERMINAL
              </p>
            </div>
          </div>

          {/* === CENTER: Live Price Block === */}
          <div className="flex-1 flex items-center justify-center gap-3 lg:gap-5 max-w-2xl">
            {/* Symbol + price */}
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-bold text-[#6b7280] tracking-wider">XAU/USD</span>
              <motion.span
                key={price?.price ?? 0}
                initial={{ opacity: 0.5, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xl lg:text-2xl font-bold tabular-nums ltr-nums text-white tracking-tight"
                style={{ textShadow: "0 0 12px rgba(212, 165, 116, 0.3)" }}
              >
                {(price?.price ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </motion.span>
            </div>

            {/* Change pill */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold tabular-nums ltr-nums"
              style={{
                backgroundColor: up ? "rgba(34, 211, 154, 0.1)" : "rgba(244, 63, 94, 0.1)",
                color: up ? "#22d39a" : "#f43f5e",
                border: `1px solid ${up ? "rgba(34, 211, 154, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
              }}
            >
              <span className="w-1 h-1 rounded-full" style={{ background: up ? "#22d39a" : "#f43f5e" }} />
              <span>{up ? "+" : ""}{(price?.change ?? 0).toFixed(2)}</span>
              <span className="opacity-60">({up ? "+" : ""}{(price?.changePct ?? 0).toFixed(2)}%)</span>
            </div>

            {/* Bid/Ask spread */}
            <div className="hidden md:flex items-center gap-2 text-[10px] tabular-nums ltr-nums">
              <div className="flex flex-col items-center">
                <span className="text-[#6b7280] tracking-wider">BID</span>
                <span className="text-[#f43f5e] font-semibold">{price?.bid?.toFixed(2) ?? "—"}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[#6b7280] tracking-wider">ASK</span>
                <span className="text-[#22d39a] font-semibold">{price?.ask?.toFixed(2) ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* === RIGHT: Status + Controls === */}
          <div className="flex items-center gap-2">
            {/* Trading session indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1a2030] border border-[#1a2030]">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: session.color }} />
              <span className="text-[10px] font-bold tracking-wider" style={{ color: session.color }}>{session.name}</span>
            </div>

            {/* Data source indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1a2030] border border-[#1a2030]">
              <Wifi className="w-3 h-3" style={{ color: sourceColor }} />
              <span className="text-[10px] font-bold tracking-wider" style={{ color: sourceColor }}>{sourceLabel}</span>
            </div>

            {/* Last update */}
            <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-[#6b7280] tabular-nums ltr-nums">
              <Clock className="w-3 h-3" />
              {lastUpdate ? lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
            </div>

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-2 rounded-md bg-[#1a2030] hover:bg-[#232a3a] border border-[#1a2030] hover:border-[#d4a574]/40 transition group"
              aria-label="تحديث"
              title="تحديث"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#9ca3af] group-hover:text-[#d4a574] ${refreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Account/Login */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowAccount(!showAccount)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1a2030] border border-[#d4a574]/40 hover:bg-[#232a3a] transition"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#d4a574] to-[#8b6914] flex items-center justify-center text-[10px] font-bold text-black">
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-[11px] font-semibold text-white">
                    {user.name || user.email.split("@")[0]}
                  </span>
                  {user.role === "ADMIN" && (
                    <Crown className="w-3 h-3 text-[#d4a574]" />
                  )}
                </button>
                {showAccount && (
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-[#1a2030] bg-[#0d1117] shadow-xl shadow-black/50 py-1 z-50">
                    <button
                      onClick={() => { setUserPanelOpen(true); setShowAccount(false); }}
                      className="w-full text-right px-3 py-1.5 text-[11px] text-white hover:bg-[#1a2030] flex items-center gap-2"
                    >
                      <UserIcon className="w-3 h-3" /> الملف الشخصي
                    </button>
                    {user.role === "ADMIN" && (
                      <button
                        onClick={() => { setAdminPanelOpen(true); setShowAccount(false); }}
                        className="w-full text-right px-3 py-1.5 text-[11px] text-[#d4a574] hover:bg-[#1a2030] flex items-center gap-2"
                      >
                        <Crown className="w-3 h-3" /> لوحة الإدارة
                      </button>
                    )}
                    <div className="border-t border-[#1a2030] my-1" />
                    <button
                      onClick={() => setShowAccount(false)}
                      className="w-full text-right px-3 py-1.5 text-[11px] text-[#6b7280] hover:bg-[#1a2030]"
                    >
                      إغلاق
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-[#d4a574] to-[#b8854d] text-black text-[11px] font-bold hover:shadow-lg hover:shadow-[#d4a574]/30 transition"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>دخول</span>
              </button>
            )}
          </div>
        </div>

        {/* Slim status bar — bottom edge */}
        <div className="flex items-center justify-between border-t border-[#1a2030]/60 py-1 text-[9px] text-[#6b7280] tracking-wide">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[#22d39a] animate-pulse" />
              LIVE
            </span>
            <span className="hidden sm:inline opacity-60">|</span>
            <span className="hidden sm:inline">HIGH <span className="text-[#9ca3af] font-semibold tabular-nums ltr-nums">{price?.high?.toFixed(2) ?? "—"}</span></span>
            <span className="hidden sm:inline">LOW <span className="text-[#9ca3af] font-semibold tabular-nums ltr-nums">{price?.low?.toFixed(2) ?? "—"}</span></span>
            <span className="hidden md:inline">OPEN <span className="text-[#9ca3af] font-semibold tabular-nums ltr-nums">{price?.open?.toFixed(2) ?? "—"}</span></span>
          </div>
          <div className="flex items-center gap-3">
            {signalAction && (
              <span className="flex items-center gap-1">
                SIGNAL:
                <span
                  className="font-bold"
                  style={{
                    color: signalAction.includes("BUY") ? "#22d39a" :
                           signalAction.includes("SELL") ? "#f43f5e" : "#d4a574"
                  }}
                >
                  {signalAction}
                </span>
                {signalConfidence != null && (
                  <span className="opacity-60 tabular-nums ltr-nums">{signalConfidence}%</span>
                )}
              </span>
            )}
            {regimeAr && (
              <span className="hidden md:flex items-center gap-1">
                REGIME: <span className="text-[#9ca3af]">{regimeAr}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

'''

new_content = content[:start_idx] + NEW_HEADER + content[end_idx:]

with open(PAGE, "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"Done. File size: {len(new_content)} chars (was {len(content)}).")
