"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cable, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";

interface BridgeStatus {
  configured: boolean;
  url?: string;
  symbol?: string;
  apiKeyMasked?: string;
  status?: {
    connected: boolean;
    mt5Connected: boolean;
    account?: {
      login: number;
      name: string;
      server: string;
      currency: string;
      leverage: number;
      balance: number;
      equity: number;
      margin: number;
      marginFree: number;
      marginLevel: number;
      profit: number;
    } | null;
    error?: string;
  };
  message?: string;
}

export default function MTBridgePanel() {
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [symbol, setSymbol] = useState("XAUUSD");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await fetch("/api/gold/mt-connect");
      const j = await r.json();
      setStatus(j);
      if (j.url) setUrl(j.url);
      if (j.symbol) setSymbol(j.symbol);
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(i);
  }, []);

  const test = async () => {
    if (!url || !apiKey) {
      setError("أدخل URL و API Key");
      return;
    }
    setTesting(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/gold/mt-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, apiKey, symbol }),
      });
      const j = await r.json();
      if (j.success) {
        setResult(j.message);
        load(); // refresh
      } else {
        setError(j.error + (j.hint ? ` — ${j.hint}` : ""));
      }
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("متأكد من قطع الاتصال؟ سنعود لمصدر Yahoo GC=F.")) return;
    try {
      await fetch("/api/gold/mt-connect", { method: "DELETE" });
      setResult("تم القطع — العودة لـ Yahoo GC=F.");
      setStatus(null);
      setApiKey("");
      load();
    } catch (e: any) {
      setError(e?.message);
    }
  };

  const connected = status?.status?.mt5Connected;
  const account = status?.status?.account;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#1a2030] bg-[#0d1117] p-3"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cable className="w-4 h-4 text-[#d4a574]" />
          <h3 className="text-sm font-bold text-white">MT5 Bridge Connection</h3>
        </div>
        {connected ? (
          <div className="flex items-center gap-1.5 text-[10px] text-[#22d39a]">
            <span className="w-2 h-2 rounded-full bg-[#22d39a] animate-pulse" />
            Connected
          </div>
        ) : status?.configured ? (
          <div className="flex items-center gap-1.5 text-[10px] text-[#f59e0b]">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            Bridge Down
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] text-[#6b7280]">
            <span className="w-2 h-2 rounded-full bg-[#6b7280]" />
            Not Connected
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-[#6b7280] text-center py-4">جاري التحقق...</div>
      ) : (
        <div className="space-y-3">
          {/* If connected — show account info */}
          {connected && account ? (
            <div className="space-y-2">
              <div className="rounded-lg p-2 border border-[#22d39a]/40 bg-[#22d39a]/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-[#22d39a]" />
                  <span className="text-[11px] font-bold text-[#22d39a]">متصل ببروكر {account?.server}</span>
                </div>
                <div className="text-[10px] text-[#9ca3af]">
                  الأسعار الآن من بروكرك بالضبط — مو من Yahoo.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-[#1a2030] rounded p-2">
                  <div className="text-[#6b7280]">رقم الحساب</div>
                  <div className="text-white font-bold">{account.login}</div>
                </div>
                <div className="bg-[#1a2030] rounded p-2">
                  <div className="text-[#6b7280]">الرافعة</div>
                  <div className="text-white font-bold">1:{account.leverage}</div>
                </div>
                <div className="bg-[#1a2030] rounded p-2">
                  <div className="text-[#6b7280]">الرصيد</div>
                  <div className="text-white font-bold">{account.balance.toFixed(2)} {account.currency}</div>
                </div>
                <div className="bg-[#1a2030] rounded p-2">
                  <div className="text-[#6b7280]">الEquity</div>
                  <div className="text-white font-bold">{account.equity.toFixed(2)}</div>
                </div>
                <div className="bg-[#1a2030] rounded p-2">
                  <div className="text-[#6b7280]">الهامش المتاح</div>
                  <div className="text-white font-bold">{account.marginFree.toFixed(2)}</div>
                </div>
                <div className="bg-[#1a2030] rounded p-2">
                  <div className="text-[#6b7280]">P/L</div>
                  <div className={`font-bold ${account.profit >= 0 ? "text-[#22d39a]" : "text-[#ef4444]"}`}>
                    {account.profit >= 0 ? "+" : ""}{account.profit.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-[#6b7280] bg-[#1a2030]/50 p-2 rounded">
                Bridge: {status.url} | Symbol: {status.symbol} | Key: {status.apiKeyMasked}
              </div>

              <button
                onClick={disconnect}
                className="w-full bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 py-1.5 rounded text-[11px] font-bold hover:bg-[#ef4444]/30"
              >
                قطع الاتصال والعودة لـ Yahoo
              </button>
            </div>
          ) : (
            /* Form for connecting */
            <div className="space-y-2 text-[10px]">
              <div>
                <label className="text-[#6b7280] block mb-0.5">Bridge URL</label>
                <input
                  type="text"
                  placeholder="https://your-tunnel.trycloudflare.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-[#1a2030] text-white px-2 py-1 rounded text-[11px]"
                />
              </div>
              <div>
                <label className="text-[#6b7280] block mb-0.5">API Key</label>
                <input
                  type="password"
                  placeholder="mrobot-bridge-api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-[#1a2030] text-white px-2 py-1 rounded text-[11px]"
                />
              </div>
              <div>
                <label className="text-[#6b7280] block mb-0.5">Symbol (XAUUSD / GOLD / etc.)</label>
                <input
                  type="text"
                  placeholder="XAUUSD"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-[#1a2030] text-white px-2 py-1 rounded text-[11px]"
                />
              </div>

              <button
                onClick={test}
                disabled={testing}
                className="w-full bg-[#d4a574] text-black font-bold py-1.5 rounded text-[11px] hover:bg-[#c19660] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    جاري الاختبار...
                  </>
                ) : (
                  "اختبر واتصل"
                )}
              </button>

              {error && (
                <div className="text-[10px] text-[#ef4444] bg-[#ef4444]/10 p-2 rounded border border-[#ef4444]/30 flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <div className="text-[10px] text-[#22d39a] bg-[#22d39a]/10 p-2 rounded border border-[#22d39a]/30 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{result}</span>
                </div>
              )}

              <div className="text-[9px] text-[#6b7280] bg-[#1a2030]/50 p-2 rounded border border-[#1a2030]">
                <div className="font-bold text-[#d4a574] mb-1">دليل الإعداد السريع:</div>
                1. ثبّت MT5 على Windows VPS<br/>
                2. شغّل <code className="text-[#d4a574]">python server.py</code> في مجلد mt5-bridge<br/>
                3. اعرض الـ Bridge بـ Cloudflare Tunnel أو ngrok<br/>
                4. ضع الـ URL والـ API Key هنا واختبر
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
