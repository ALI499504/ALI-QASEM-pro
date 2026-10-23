module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/app/api/ai-agents/terminal/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "dynamic",
    ()=>dynamic,
    "maxDuration",
    ()=>maxDuration,
    "revalidate",
    ()=>revalidate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
const dynamic = "force-dynamic";
const revalidate = 0;
const maxDuration = 30;
// ============= Technical Indicators =============
function sma(arr, period) {
    if (arr.length < period) return arr.reduce((s, x)=>s + x, 0) / arr.length;
    return arr.slice(-period).reduce((s, x)=>s + x, 0) / period;
}
function ema(arr, period) {
    if (arr.length === 0) return 0;
    const k = 2 / (period + 1);
    let e = arr[0];
    for(let i = 1; i < arr.length; i++)e = arr[i] * k + e * (1 - k);
    return e;
}
function rsi(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for(let i = closes.length - period; i < closes.length; i++){
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}
function macd(closes) {
    if (closes.length < 35) return {
        macd: 0,
        signal: 0,
        hist: 0
    };
    const ema12 = ema(closes.slice(-35), 12);
    const ema26 = ema(closes.slice(-35), 26);
    const macdLine = ema12 - ema26;
    // signal = EMA(macd, 9) — approximation using last 9 closes' MACD
    const macdSeries = [];
    for(let i = Math.max(0, closes.length - 30); i < closes.length; i++){
        const a = ema(closes.slice(0, i + 1), 12);
        const b = ema(closes.slice(0, i + 1), 26);
        macdSeries.push(a - b);
    }
    const signalLine = ema(macdSeries, 9);
    return {
        macd: macdLine,
        signal: signalLine,
        hist: macdLine - signalLine
    };
}
function bollinger(closes, period = 20, stdMult = 2) {
    if (closes.length < period) {
        const last = closes[closes.length - 1] ?? 0;
        return {
            mid: last,
            upper: last,
            lower: last,
            bandwidth: 0
        };
    }
    const slice = closes.slice(-period);
    const mean = slice.reduce((s, x)=>s + x, 0) / period;
    const variance = slice.reduce((s, x)=>s + (x - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    return {
        mid: mean,
        upper: mean + stdMult * std,
        lower: mean - stdMult * std,
        bandwidth: stdMult * 2 * std
    };
}
function atr(candles, period = 14) {
    if (candles.length < 2) return 0;
    const trs = [];
    for(let i = 1; i < candles.length; i++){
        const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
        trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    return sma(trs, period);
}
function vwap(candles) {
    let pv = 0, vol = 0;
    for (const c of candles.slice(-20)){
        const typical = (c.high + c.low + c.close) / 3;
        pv += typical * c.volume;
        vol += c.volume;
    }
    return vol > 0 ? pv / vol : candles[candles.length - 1].close;
}
// ============= Candle Pattern Recognition =============
function detectPattern(candles) {
    if (candles.length < 3) return {
        name: "Insufficient",
        bias: "NEUTRAL",
        confidence: 0
    };
    const [p2, p1, p0] = candles.slice(-3);
    const body0 = Math.abs(p0.close - p0.open);
    const range0 = p0.high - p0.low;
    const body1 = Math.abs(p1.close - p1.open);
    const body2 = Math.abs(p2.close - p2.open);
    // Bullish engulfing
    if (p1.close < p1.open && p0.close > p0.open && p0.close > p1.open && p0.open < p1.close) {
        return {
            name: "Bullish Engulfing",
            bias: "BUY",
            confidence: 0.78
        };
    }
    // Bearish engulfing
    if (p1.close > p1.open && p0.close < p0.open && p0.close < p1.open && p0.open > p1.close) {
        return {
            name: "Bearish Engulfing",
            bias: "SELL",
            confidence: 0.78
        };
    }
    // Hammer
    if (body0 / range0 < 0.4 && p0.close - p0.low > range0 * 0.6 && p0.close > p1.close) {
        return {
            name: "Hammer",
            bias: "BUY",
            confidence: 0.65
        };
    }
    // Shooting star
    if (body0 / range0 < 0.4 && p0.high - p0.open > range0 * 0.6 && p0.close < p1.close) {
        return {
            name: "Shooting Star",
            bias: "SELL",
            confidence: 0.65
        };
    }
    // Doji
    if (body0 / range0 < 0.1) {
        return {
            name: "Doji (indecision)",
            bias: "NEUTRAL",
            confidence: 0.4
        };
    }
    // 3 white soldiers
    if (p0.close > p0.open && p1.close > p1.open && p2.close > p2.open && p0.close > p1.close && p1.close > p2.close) {
        return {
            name: "Three White Soldiers",
            bias: "BUY",
            confidence: 0.82
        };
    }
    // 3 black crows
    if (p0.close < p0.open && p1.close < p1.open && p2.close < p2.open && p0.close < p1.close && p1.close < p2.close) {
        return {
            name: "Three Black Crows",
            bias: "SELL",
            confidence: 0.82
        };
    }
    // Trending continuation
    if (body0 > body1 && body1 > body2) {
        const bias = p0.close > p0.open ? "BUY" : "SELL";
        return {
            name: `Trending ${bias === "BUY" ? "▲" : "▼"} continuation`,
            bias,
            confidence: 0.6
        };
    }
    return {
        name: "No clear pattern",
        bias: "NEUTRAL",
        confidence: 0.3
    };
}
// ============= Support/Resistance Levels =============
function findSR(candles) {
    if (candles.length < 20) return {
        support: 0,
        resistance: 0,
        strength: 0
    };
    const lookback = candles.slice(-50);
    const highs = lookback.map((c)=>c.high).sort((a, b)=>b - a);
    const lows = lookback.map((c)=>c.low).sort((a, b)=>a - b);
    const resistance = highs[0];
    const support = lows[0];
    const last = candles[candles.length - 1].close;
    const range = resistance - support;
    const strength = range > 0 ? Math.min(1, Math.abs(last - (support + resistance) / 2) / (range / 2)) : 0;
    return {
        support,
        resistance,
        strength
    };
}
// ============= Momentum =============
function momentum(candles) {
    if (candles.length < 14) return {
        roc: 0,
        williamsR: -50,
        mfi: 50,
        bias: "HOLD",
        confidence: 0.3
    };
    const closes = candles.map((c)=>c.close);
    const last = closes[closes.length - 1];
    const roc = (last - closes[closes.length - 13]) / closes[closes.length - 13] * 100;
    // Williams %R
    const highN = Math.max(...candles.slice(-14).map((c)=>c.high));
    const lowN = Math.min(...candles.slice(-14).map((c)=>c.low));
    const williamsR = highN === lowN ? -50 : (highN - last) / (highN - lowN) * -100;
    // MFI (Money Flow Index) — volume-weighted RSI
    let posFlow = 0, negFlow = 0;
    for(let i = candles.length - 14; i < candles.length; i++){
        const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
        const prevTp = (candles[i - 1].high + candles[i - 1].low + candles[i - 1].close) / 3;
        if (tp > prevTp) posFlow += tp * candles[i].volume;
        else negFlow += tp * candles[i].volume;
    }
    const mfi = negFlow === 0 ? 100 : 100 - 100 / (1 + posFlow / negFlow);
    let bias = "HOLD";
    if (roc > 0.5 && williamsR > -20 && mfi > 55) bias = "BUY";
    else if (roc < -0.5 && williamsR < -80 && mfi < 45) bias = "SELL";
    const confidence = Math.min(0.9, 0.4 + Math.abs(roc) / 10);
    return {
        roc,
        williamsR,
        mfi,
        bias,
        confidence
    };
}
// ============= Risk Agent (volatility-based) =============
function riskAgent(candles) {
    const a = atr(candles, 14);
    const last = candles[candles.length - 1];
    const range = last.high - last.low;
    const atrPct = a / last.close;
    if (atrPct > 0.015) {
        return {
            bias: "HOLD",
            confidence: 0.7,
            reasoning: `High volatility (ATR ${(atrPct * 100).toFixed(2)}% of price). Reduce position size.`
        };
    }
    if (range > a * 1.5) {
        return {
            bias: last.close > last.open ? "SELL" : "BUY",
            confidence: 0.55,
            reasoning: "Range expansion beyond ATR — likely mean reversion next candle."
        };
    }
    return {
        bias: "HOLD",
        confidence: 0.45,
        reasoning: `Volatility within range (ATR ${(atrPct * 100).toFixed(2)}%).`
    };
}
// ============= Monte Carlo simulation =============
function monteCarlo(candles, n = 1000) {
    if (candles.length < 20) {
        return {
            simulations: n,
            bullishRatio: 0.5,
            expectedPrice: 0,
            stdDev: 0,
            percentile95Up: 0,
            percentile95Down: 0,
            paths: []
        };
    }
    // Use log-returns from last 50 candles to estimate drift + volatility
    const closes = candles.slice(-50).map((c)=>c.close);
    const logRets = [];
    for(let i = 1; i < closes.length; i++){
        logRets.push(Math.log(closes[i] / closes[i - 1]));
    }
    const mean = logRets.reduce((s, x)=>s + x, 0) / logRets.length;
    const variance = logRets.reduce((s, x)=>s + (x - mean) ** 2, 0) / logRets.length;
    const std = Math.sqrt(variance);
    const lastClose = closes[closes.length - 1];
    const allEndPrices = [];
    const samplePaths = [];
    // Random Gaussian using Box-Muller
    const gaussian = ()=>{
        let u = 0, v = 0;
        while(u === 0)u = Math.random();
        while(v === 0)v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    for(let sim = 0; sim < n; sim++){
        let price = lastClose;
        const path = [
            price
        ];
        // Simulate 1 candle ahead = use 1 step with scaled drift/vol
        const step = mean + std * gaussian();
        price = price * Math.exp(step);
        path.push(price);
        allEndPrices.push(price);
        if (sim < 50) samplePaths.push(path); // keep 50 sample paths for charting
    }
    allEndPrices.sort((a, b)=>a - b);
    const expectedPrice = allEndPrices.reduce((s, x)=>s + x, 0) / allEndPrices.length;
    const meanEnd = expectedPrice;
    const stdDev = Math.sqrt(allEndPrices.reduce((s, x)=>s + (x - meanEnd) ** 2, 0) / allEndPrices.length);
    const bullishRatio = allEndPrices.filter((p)=>p > lastClose).length / allEndPrices.length;
    const p95Up = allEndPrices[Math.floor(allEndPrices.length * 0.975)];
    const p95Down = allEndPrices[Math.floor(allEndPrices.length * 0.025)];
    return {
        simulations: n,
        bullishRatio,
        expectedPrice,
        stdDev,
        percentile95Up: p95Up,
        percentile95Down: p95Down,
        paths: samplePaths
    };
}
// ============= Kelly Criterion =============
function kellyCriterion(historicalWinRate, avgWin, avgLoss) {
    if (avgLoss === 0) return {
        fraction: 0,
        recommendedRiskPct: 0
    };
    const b = avgWin / avgLoss; // odds ratio
    const p = historicalWinRate;
    const q = 1 - p;
    const f = (b * p - q) / b; // Kelly fraction
    // Use 1/4 Kelly for safety
    const safeF = Math.max(0, Math.min(0.25, f * 0.25));
    return {
        fraction: f,
        recommendedRiskPct: safeF
    };
}
// ============= 6 Agents =============
function runAgents(candles) {
    const closes = candles.map((c)=>c.close);
    const lastClose = closes[closes.length - 1];
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const rsi14 = rsi(closes, 14);
    const { macd: m, signal: ms, hist: mh } = macd(closes);
    const bb = bollinger(closes, 20, 2);
    const vwapVal = vwap(candles);
    const atrVal = atr(candles, 14);
    // ---------- 1. Technical Agent ----------
    let tVote = "HOLD";
    let tConf = 0.5;
    let tReason = "";
    if (sma20 > sma50 && rsi14 > 50 && rsi14 < 70 && m > ms) {
        tVote = "BUY";
        tConf = Math.min(0.9, 0.55 + (rsi14 - 50) / 100);
        tReason = `SMA20 ${sma20.toFixed(2)} > SMA50 ${sma50.toFixed(2)}, RSI ${rsi14.toFixed(1)}, MACD hist +${mh.toFixed(3)}`;
    } else if (sma20 < sma50 && rsi14 < 50 && rsi14 > 30 && m < ms) {
        tVote = "SELL";
        tConf = Math.min(0.9, 0.55 + (50 - rsi14) / 100);
        tReason = `SMA20 ${sma20.toFixed(2)} < SMA50 ${sma50.toFixed(2)}, RSI ${rsi14.toFixed(1)}, MACD hist ${mh.toFixed(3)}`;
    } else {
        tReason = `Mixed signals: SMA20 ${sma20.toFixed(2)}, SMA50 ${sma50.toFixed(2)}, RSI ${rsi14.toFixed(1)}`;
        tConf = 0.4;
    }
    // ---------- 2. Patterns Agent ----------
    const pattern = detectPattern(candles);
    // ---------- 3. Risk Agent ----------
    const risk = riskAgent(candles);
    // ---------- 4. Momentum Agent ----------
    const mom = momentum(candles);
    // ---------- 5. Support/Resistance Agent ----------
    const sr = findSR(candles);
    let srVote = "HOLD";
    let srConf = 0.5;
    let srReason = "";
    const distToSup = (lastClose - sr.support) / (sr.resistance - sr.support);
    if (distToSup < 0.25) {
        srVote = "BUY";
        srConf = Math.min(0.85, 0.6 + (0.25 - distToSup));
        srReason = `Price near support ${sr.support.toFixed(2)} (dist ${(distToSup * 100).toFixed(0)}% of range)`;
    } else if (distToSup > 0.75) {
        srVote = "SELL";
        srConf = Math.min(0.85, 0.6 + (distToSup - 0.75));
        srReason = `Price near resistance ${sr.resistance.toFixed(2)} (dist ${(distToSup * 100).toFixed(0)}% of range)`;
    } else {
        srReason = `Mid-range between S ${sr.support.toFixed(2)} and R ${sr.resistance.toFixed(2)}`;
        srConf = 0.4;
    }
    // ---------- 6. Master Agent (multi-timeframe synthesis) ----------
    const htf = closes.slice(-50);
    const htfTrend = (htf[htf.length - 1] - htf[0]) / htf[0];
    const bbPos = (lastClose - bb.lower) / (bb.upper - bb.lower);
    let masterVote = "HOLD";
    let masterConf = 0.5;
    let masterReason = "";
    if (htfTrend > 0.005 && bbPos < 0.7 && vwapVal < lastClose) {
        masterVote = "BUY";
        masterConf = Math.min(0.92, 0.65 + Math.abs(htfTrend) * 20);
        masterReason = `HTF uptrend ${(htfTrend * 100).toFixed(2)}%, BB pos ${(bbPos * 100).toFixed(0)}%, VWAP ${vwapVal.toFixed(2)}`;
    } else if (htfTrend < -0.005 && bbPos > 0.3 && vwapVal > lastClose) {
        masterVote = "SELL";
        masterConf = Math.min(0.92, 0.65 + Math.abs(htfTrend) * 20);
        masterReason = `HTF downtrend ${(htfTrend * 100).toFixed(2)}%, BB pos ${(bbPos * 100).toFixed(0)}%, VWAP ${vwapVal.toFixed(2)}`;
    } else {
        masterReason = `HTF flat (${(htfTrend * 100).toFixed(2)}%), BB pos ${(bbPos * 100).toFixed(0)}%`;
        masterConf = 0.45;
    }
    return [
        {
            id: "technical",
            name: "Technical Analyst",
            vote: tVote,
            confidence: tConf,
            reasoning: tReason,
            weight: 1.0
        },
        {
            id: "patterns",
            name: "Pattern Reader",
            vote: pattern.bias,
            confidence: pattern.confidence,
            reasoning: pattern.name,
            weight: 0.9
        },
        {
            id: "risk",
            name: "Risk Manager",
            vote: risk.bias,
            confidence: risk.confidence,
            reasoning: risk.reasoning,
            weight: 0.7
        },
        {
            id: "momentum",
            name: "Momentum Scanner",
            vote: mom.bias,
            confidence: mom.confidence,
            reasoning: `ROC ${mom.roc.toFixed(2)}%, W%R ${mom.williamsR.toFixed(1)}, MFI ${mom.mfi.toFixed(1)}`,
            weight: 1.1
        },
        {
            id: "sr",
            name: "Support/Resistance",
            vote: srVote,
            confidence: srConf,
            reasoning: srReason,
            weight: 0.95
        },
        {
            id: "master",
            name: "Master Strategist",
            vote: masterVote,
            confidence: masterConf,
            reasoning: masterReason,
            weight: 1.3
        }
    ];
}
async function POST(req) {
    try {
        const body = await req.json();
        if (!body.candles || body.candles.length < 30) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Need ≥30 candles (got ${body.candles?.length ?? 0})`
            }, {
                status: 400
            });
        }
        const candles = body.candles;
        const lastCandle = candles[candles.length - 1];
        const lastClose = lastCandle.close;
        // Run all 6 agents
        const agents = runAgents(candles);
        // Ensemble weighted vote
        let buyScore = 0, sellScore = 0, holdScore = 0;
        let totalWeight = 0;
        for (const a of agents){
            const score = a.confidence * a.weight;
            totalWeight += a.weight;
            if (a.vote === "BUY") buyScore += score;
            else if (a.vote === "SELL") sellScore += score;
            else holdScore += score;
        }
        const finalScore = (buyScore - sellScore) / totalWeight; // -1..1
        const buyVotes = agents.filter((a)=>a.vote === "BUY").length;
        const sellVotes = agents.filter((a)=>a.vote === "SELL").length;
        const holdVotes = agents.filter((a)=>a.vote === "HOLD").length;
        let finalDecision = "HOLD";
        if (finalScore > 0.1) finalDecision = "BUY";
        else if (finalScore < -0.1) finalDecision = "SELL";
        const finalConfidence = Math.min(0.99, Math.abs(finalScore) + 0.3);
        // Monte Carlo
        const mc = monteCarlo(candles, 1000);
        // Next candle prediction: blend ensemble decision with MC expected price
        const mcExpected = mc.expectedPrice;
        const expectedMovePct = (mcExpected - lastClose) / lastClose;
        const nextOpen = lastClose;
        const nextClose = finalDecision === "BUY" ? Math.max(mcExpected, lastClose * 1.0005) : finalDecision === "SELL" ? Math.min(mcExpected, lastClose * 0.9995) : mcExpected;
        const moveAbs = Math.abs(nextClose - lastClose);
        const atrVal = atr(candles, 14);
        const rangeHigh = Math.max(nextClose + moveAbs * 0.6, lastClose + atrVal * 0.3);
        const rangeLow = Math.min(nextClose - moveAbs * 0.6, lastClose - atrVal * 0.3);
        // Kelly criterion — historical win rate over last 50 candles
        const last50 = candles.slice(-50);
        let wins = 0, totalWin = 0, totalLoss = 0;
        for(let i = 1; i < last50.length; i++){
            const change = last50[i].close - last50[i - 1].close;
            if (change > 0) {
                wins++;
                totalWin += change;
            } else totalLoss -= change;
        }
        const winRate = wins / (last50.length - 1);
        const avgWin = totalWin / Math.max(1, wins);
        const avgLoss = totalLoss / Math.max(1, last50.length - 1 - wins);
        const kelly = kellyCriterion(winRate, avgWin, avgLoss);
        const prediction = {
            symbol: body.symbol,
            timeframe: body.period,
            nextCandle: {
                direction: finalDecision,
                confidence: finalConfidence,
                open: nextOpen,
                high: rangeHigh,
                low: rangeLow,
                close: nextClose,
                expectedMovePct
            },
            agents,
            ensemble: {
                buyVotes,
                sellVotes,
                holdVotes,
                weightedScore: finalScore,
                finalDecision,
                finalConfidence
            },
            monteCarlo: mc,
            kelly,
            timestamp: Date.now(),
            lastCandleClose: lastClose
        };
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(prediction, {
            headers: {
                "Cache-Control": "no-store"
            }
        });
    } catch (e) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: e?.message ?? "Prediction failed"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__94c29b89._.js.map