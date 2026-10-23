"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import CinematicMonitor from "@/components/mt5/CinematicMonitor";
import { fetchAccount, placeOrder, closePosition, type Position } from "@/lib/mt5-data";

export default function Home() {
  const [symbol, setSymbol] = useState("XAUUSD");
  const [period, setPeriod] = useState("H1");
  const [positions, setPositions] = useState<Position[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "success" | "error" } | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showToast = useCallback((msg: string, type: "info" | "success" | "error" = "info") => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const refreshAll = useCallback(async () => {
    try { const data = await fetchAccount(); setPositions(data.positions); } catch (e) {}
  }, []);

  useEffect(() => { refreshAll(); const id = setInterval(refreshAll, 5000); return () => clearInterval(id); }, [refreshAll]);

  const handlePlaceOrder = useCallback(async (type: "BUY" | "SELL", volume: number = 0.1, sl?: number, tp?: number) => {
    try { await placeOrder({ symbol, type, volume, sl, tp, comment: "BFX" }); showToast(`✓ ${type} ${volume} ${symbol}`, "success"); refreshAll(); } catch (e: any) { showToast(`✗ ${e.message}`, "error"); }
  }, [symbol, showToast, refreshAll]);

  const handleClosePosition = useCallback(async (ticket: number) => {
    try { await closePosition(ticket); showToast(`✓ Closed #${ticket}`, "success"); refreshAll(); } catch (e: any) { showToast(`✗ ${e.message}`, "error"); }
  }, [showToast, refreshAll]);

  const toastBg = toast?.type === "success" ? "#10b981" : toast?.type === "error" ? "#f43f5e" : "#3b82f6";
  const toastColor = toast?.type === "success" ? "#000" : toast?.type === "error" ? "#fff" : "#000";

  return (
    <>
      <CinematicMonitor symbol={symbol} period={period} setSymbol={setSymbol} setPeriod={setPeriod} onExecuteOrder={handlePlaceOrder} onToast={showToast} positions={positions} onClosePosition={handleClosePosition} />
      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: toastBg, color: toastColor, padding: "8px 16px", borderRadius: 4, fontSize: 12, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 2000, fontFamily: "monospace" }}>{toast.msg}</div>
      )}
    </>
  );
}
