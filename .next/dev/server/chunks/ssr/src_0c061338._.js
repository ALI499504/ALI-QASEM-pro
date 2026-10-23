module.exports = [
"[project]/src/lib/mt5-data.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================================================
//  BFX AI — MT5 Data Layer (client-side)
// =====================================================================
//  This module is imported by the React UI (page.tsx, CinematicMonitor).
//  All functions hit our own Next.js API routes (server-side), which
//  in turn call the MetaApi Cloud bridge (real HotForex MT5 account)
//  with Binance/Yahoo fallback when MetaApi is unreachable.
// =====================================================================
__turbopack_context__.s([
    "closeAllPositions",
    ()=>closeAllPositions,
    "closePosition",
    ()=>closePosition,
    "fetchAIPrediction",
    ()=>fetchAIPrediction,
    "fetchAccount",
    ()=>fetchAccount,
    "fetchBridgeStatus",
    ()=>fetchBridgeStatus,
    "fetchCandles",
    ()=>fetchCandles,
    "placeOrder",
    ()=>placeOrder
]);
async function jsonOrThrow(r) {
    if (!r.ok) {
        const txt = await r.text().catch(()=>"");
        throw new Error(`${r.status}: ${txt.slice(0, 200)}`);
    }
    return r.json();
}
async function fetchAccount() {
    const [acctRes, posRes] = await Promise.all([
        fetch("/api/mt5/account", {
            cache: "no-store"
        }),
        fetch("/api/mt5/positions", {
            cache: "no-store"
        })
    ]);
    const account = (await jsonOrThrow(acctRes)).account;
    const positions = (await jsonOrThrow(posRes)).positions || [];
    return {
        account,
        positions
    };
}
async function fetchBridgeStatus() {
    const r = await fetch("/api/mt5/status", {
        cache: "no-store"
    });
    return jsonOrThrow(r);
}
async function fetchCandles(symbol, period, limit = 300) {
    const r = await fetch(`/api/mt5/candles?symbol=${encodeURIComponent(symbol)}&period=${encodeURIComponent(period)}&limit=${limit}`, {
        cache: "no-store"
    });
    const data = await jsonOrThrow(r);
    return data.candles || [];
}
async function placeOrder(params) {
    const r = await fetch("/api/mt5/order", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            side: params.type,
            volume: params.volume,
            sl: params.sl,
            tp: params.tp,
            comment: params.comment || "BFX-AI"
        })
    });
    return jsonOrThrow(r);
}
async function closePosition(ticket) {
    const r = await fetch(`/api/mt5/close?ticket=${ticket}`, {
        method: "POST"
    });
    return jsonOrThrow(r);
}
async function closeAllPositions() {
    const r = await fetch("/api/mt5/close-all", {
        method: "POST"
    });
    return jsonOrThrow(r);
}
async function fetchAIPrediction(symbol, period, candles) {
    const r = await fetch("/api/ai-agents/terminal", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            symbol,
            period,
            candles
        })
    });
    return jsonOrThrow(r);
}
}),
"[project]/src/app/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module '@/components/mt5/CinematicMonitor'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mt5$2d$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/mt5-data.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
function Home() {
    const [symbol, setSymbol] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("XAUUSD");
    const [period, setPeriod] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("H1");
    const [positions, setPositions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [toast, setToast] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const toastTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const showToast = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((msg, type = "info")=>{
        setToast({
            msg,
            type
        });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(()=>setToast(null), 3000);
    }, []);
    const refreshAll = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        try {
            const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mt5$2d$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchAccount"])();
            setPositions(data.positions);
        } catch (e) {}
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        refreshAll();
        const id = setInterval(refreshAll, 5000);
        return ()=>clearInterval(id);
    }, [
        refreshAll
    ]);
    const handlePlaceOrder = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (type, volume = 0.1, sl, tp)=>{
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mt5$2d$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["placeOrder"])({
                symbol,
                type,
                volume,
                sl,
                tp,
                comment: "BFX"
            });
            showToast(`✓ ${type} ${volume} ${symbol}`, "success");
            refreshAll();
        } catch (e) {
            showToast(`✗ ${e.message}`, "error");
        }
    }, [
        symbol,
        showToast,
        refreshAll
    ]);
    const handleClosePosition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (ticket)=>{
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mt5$2d$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["closePosition"])(ticket);
            showToast(`✓ Closed #${ticket}`, "success");
            refreshAll();
        } catch (e) {
            showToast(`✗ ${e.message}`, "error");
        }
    }, [
        showToast,
        refreshAll
    ]);
    const toastBg = toast?.type === "success" ? "#10b981" : toast?.type === "error" ? "#f43f5e" : "#3b82f6";
    const toastColor = toast?.type === "success" ? "#000" : toast?.type === "error" ? "#fff" : "#000";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CinematicMonitor, {
                symbol: symbol,
                period: period,
                setSymbol: setSymbol,
                setPeriod: setPeriod,
                onExecuteOrder: handlePlaceOrder,
                onToast: showToast,
                positions: positions,
                onClosePosition: handleClosePosition
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, this),
            toast && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: "fixed",
                    bottom: 20,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: toastBg,
                    color: toastColor,
                    padding: "8px 16px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                    zIndex: 2000,
                    fontFamily: "monospace"
                },
                children: toast.msg
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 40,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true);
}
}),
];

//# sourceMappingURL=src_0c061338._.js.map