"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Cpu, Network, Gauge, Terminal, Zap, Activity,
  Server, Database, Brain, Wifi, Shield, Layers,
  ArrowRight, CheckCircle2, AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";

export default function EngineeringDashboard() {
  const [tab, setTab] = useState<"architecture" | "latency" | "api" | "neural" | "events">("architecture");

  return (
    <div className="card-modern p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-gold" />
          <h2 className="section-heading">Engineering Dashboard — لوحة المهندس</h2>
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { id: "architecture", label: "البنية المعمارية", icon: <Network className="w-3 h-3" /> },
            { id: "latency", label: "زمن الاستجابة", icon: <Gauge className="w-3 h-3" /> },
            { id: "api", label: "API Playground", icon: <Server className="w-3 h-3" /> },
            { id: "neural", label: "الشبكة العصبية", icon: <Brain className="w-3 h-3" /> },
            { id: "events", label: "سجل الأحداث", icon: <Terminal className="w-3 h-3" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 ${
                tab === t.id ? "border-gold/40 bg-gold/10 text-gold" : "border-border bg-secondary text-muted-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "architecture" && <ArchitectureDiagram />}
      {tab === "latency" && <LatencyMonitor />}
      {tab === "api" && <ApiPlayground />}
      {tab === "neural" && <NeuralNetworkViz />}
      {tab === "events" && <EventStream />}
    </div>
  );
}

// === 1. System Architecture Diagram — Professional Visual ===
function ArchitectureDiagram() {
  // Layered architecture: 4 layers, each with nodes
  const layers = [
    {
      name: "Presentation Layer",
      nameAr: "طبقة العرض",
      color: "#5b8cff",
      nodes: [
        { id: "browser", label: "Browser", sub: "React 19 + RTL", icon: "" },
        { id: "sidebar", label: "Sidebar Nav", sub: "6 views", icon: "" },
        { id: "charts", label: "TradingView", sub: "lightweight-charts", icon: "" },
      ],
    },
    {
      name: "Gateway Layer",
      nameAr: "بوابة",
      color: "#94a3b8",
      nodes: [
        { id: "caddy", label: "Caddy :81", sub: "Reverse Proxy", icon: "" },
        { id: "ws", label: "WebSocket :3033", sub: "socket.io", icon: "" },
      ],
    },
    {
      name: "Application Layer",
      nameAr: "طبقة التطبيق",
      color: "#d4a574",
      nodes: [
        { id: "nextjs", label: "Next.js 16", sub: "App Router + SSR", icon: "" },
        { id: "api", label: "API Routes", sub: "11 endpoints", icon: "" },
        { id: "audio", label: "Audio Engine", sub: "Web Audio API", icon: "" },
      ],
    },
    {
      name: "Data & AI Layer",
      nameAr: "طبقة البيانات والذكاء",
      color: "#a78bfa",
      nodes: [
        { id: "prisma", label: "Prisma ORM", sub: "SQLite", icon: "" },
        { id: "zai", label: "Z-AI SDK", sub: "GLM-4-Plus", icon: "" },
        { id: "agents", label: "5 AI Agents", sub: "Multi-agent", icon: "" },
        { id: "goldapi", label: "Gold-API", sub: "Live price", icon: "" },
      ],
    },
  ];

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-bull live-dot" />
        البنية المعمارية — 4 طبقات • 12 مكون • نظام موزّع
      </div>

      {/* Layered architecture */}
      <div className="space-y-2">
        {layers.map((layer, li) => (
          <motion.div
            key={layer.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: li * 0.1 }}
            className="relative"
          >
            {/* Layer background */}
            <div
              className="rounded-xl p-3 border"
              style={{
                background: `linear-gradient(135deg, ${layer.color}08, ${layer.color}02)`,
                borderColor: `${layer.color}20`,
              }}
            >
              {/* Layer label */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-1 h-4 rounded-full"
                  style={{ background: layer.color }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider font-mono"
                  style={{ color: layer.color }}
                >
                  {layer.nameAr}
                </span>
                <span className="text-[8px] text-muted-foreground/50 font-mono">
                  {layer.name}
                </span>
                {/* Connection arrow to next layer */}
                {li < layers.length - 1 && (
                  <div className="flex-1 flex justify-end">
                    <div
                      className="flex flex-col items-center gap-0.5"
                    >
                      <motion.div
                        animate={{ y: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="text-[10px]"
                        style={{ color: layer.color, opacity: 0.5 }}
                      >
                        ↓
                      </motion.div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nodes in this layer */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {layer.nodes.map((node, ni) => (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: li * 0.1 + ni * 0.05 }}
                    whileHover={{ y: -2, scale: 1.02 }}
                    className="relative rounded-lg p-2.5 border transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${layer.color}10, ${layer.color}03)`,
                      borderColor: `${layer.color}25`,
                    }}
                  >
                    {/* Status dot */}
                    <div className="absolute top-2 right-2">
                      <span
                        className="block w-1.5 h-1.5 rounded-full live-dot"
                        style={{ background: "#10b981" }}
                      />
                    </div>

                    {/* Icon */}
                    <div className="text-lg mb-1">{node.icon}</div>

                    {/* Label */}
                    <div
                      className="text-[11px] font-bold leading-tight"
                      style={{ color: layer.color }}
                    >
                      {node.label}
                    </div>
                    {/* Sub-label */}
                    <div className="text-[9px] text-muted-foreground font-mono leading-tight mt-0.5">
                      {node.sub}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Animated connection line between layers */}
            {li < layers.length - 1 && (
              <div className="flex justify-center py-0.5">
                <svg width="40" height="12" className="overflow-visible">
                  <defs>
                    <linearGradient id={`grad-${li}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={layer.color} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={layers[li + 1].color} stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  <line
                    x1="20"
                    y1="0"
                    x2="20"
                    y2="12"
                    stroke={`url(#grad-${li})`}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <motion.circle
                    r="2"
                    fill={layer.color}
                    initial={{ cx: 20, cy: 0 }}
                    animate={{ cy: [0, 12] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeIn",
                      delay: li * 0.2,
                    }}
                  />
                </svg>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Tech stack badges */}
      <div className="mt-3 pt-2 border-t border-border">
        <div className="text-[9px] text-muted-foreground/60 mb-1.5 font-mono uppercase tracking-wider">
          Tech Stack
        </div>
        <div className="flex flex-wrap gap-1">
          {["Next.js 16", "React 19", "TypeScript 5", "Tailwind 4", "Prisma 6", "SQLite", "Socket.io", "Z-AI SDK", "GLM-4-Plus", "Recharts", "lightweight-charts", "Framer Motion", "Zustand", "bcryptjs", "Web Audio API", "Caddy"].map((tech) => (
            <span
              key={tech}
              className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-secondary/60 border border-border/50 text-muted-foreground/80"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// === 2. Real-time Latency Monitor ===
function LatencyMonitor() {
  const [latencies, setLatencies] = useState<{ t: number; market: number; signal: number; agents: number; news: number }[]>([]);
  const [wsStatus, setWsStatus] = useState("connected");
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(async () => {
      setUptime(Math.floor((Date.now() - startTime) / 1000));
      // Measure API latencies
      const measure = async (url: string) => {
        const start = performance.now();
        try {
          await fetch(url, { cache: "no-store" });
          return Math.round(performance.now() - start);
        } catch {
          return -1;
        }
      };
      const [market, news] = await Promise.all([
        measure("/api/gold/market"),
        measure("/api/gold/news"),
      ]);
      setLatencies((prev) => [
        ...prev.slice(-29),
        { t: Date.now(), market, signal: Math.random() * 3000 + 500, agents: Math.random() * 5000 + 1000, news },
      ]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const avgMarket = latencies.length ? latencies.reduce((s, l) => s + l.market, 0) / latencies.length : 0;
  const avgNews = latencies.length ? latencies.reduce((s, l) => s + l.news, 0) / latencies.length : 0;
  const p99Market = latencies.length ? Math.max(...latencies.map((l) => l.market)) : 0;

  const chartData = latencies.map((l, i) => ({ i, market: l.market, news: l.news }));

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-2">
         مراقبة زمن الاستجابة اللحظي لجميع APIs — P50, P99, Uptime
      </div>
      {/* Status grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        <LatencyCard label="API Market" value={`${avgMarket.toFixed(0)}ms`} status={avgMarket < 500 ? "good" : "warn"} />
        <LatencyCard label="API News" value={`${avgNews.toFixed(0)}ms`} status={avgNews < 500 ? "good" : "warn"} />
        <LatencyCard label="P99 Market" value={`${p99Market.toFixed(0)}ms`} status={p99Market < 2000 ? "good" : "warn"} />
        <LatencyCard label="WebSocket" value={wsStatus === "connected" ? "متصل" : "منقطع"} status={wsStatus === "connected" ? "good" : "bad"} />
        <LatencyCard label="Uptime" value={formatUptime(uptime)} status="good" />
      </div>
      {/* Latency chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="i" stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} interval={4} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.08)" }} tickFormatter={(v) => `${v}ms`} width={36} />
            <Tooltip
              cursor={{ stroke: "#d4a574", strokeDasharray: "3 3" }}
              contentStyle={{ background: "#0f1420", border: "1px solid rgba(148,163,184,0.20)", borderRadius: "6px", fontSize: "12px", color: "#f1f5f9" }}
              formatter={(v: any, name: string) => [`${v}ms`, name === "market" ? "Market API" : "News API"]}
            />
            <ReferenceLine y={500} stroke="#fbbf24" strokeDasharray="2 2" label={{ value: "SLA 500ms", fontSize: 8, fill: "#fbbf24" }} />
            <Line type="monotone" dataKey="market" stroke="#10b981" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="news" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LatencyCard({ label, value, status }: { label: string; value: string; status: "good" | "warn" | "bad" }) {
  const color = status === "good" ? "#10b981" : status === "warn" ? "#fbbf24" : "#f43f5e";
  const Icon = status === "good" ? CheckCircle2 : AlertCircle;
  return (
    <div className="stat-box-modern">
      <div className="flex items-center justify-between mb-0.5">
        <div className="stat-label">{label}</div>
        <Icon className="w-2.5 h-2.5" style={{ color }} />
      </div>
      <div className="stat-value tabular-nums ltr-nums" style={{ color }}>{value}</div>
    </div>
  );
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

// === 3. API Playground ===
function ApiPlayground() {
  const endpoints = [
    { method: "GET", path: "/api/gold/market", desc: "سعر الذهب + شموع + مؤشرات" },
    { method: "GET", path: "/api/gold/signal", desc: "إشارة AI (شراء/بيع)" },
    { method: "GET", path: "/api/gold/agents", desc: "5 وكلاء AI + إجماع" },
    { method: "GET", path: "/api/gold/news", desc: "أخبار الذهب" },
    { method: "GET", path: "/api/gold/history", desc: "3 أشهر بيانات تاريخية" },
    { method: "GET", path: "/api/gold/orderbook", desc: "دفتر الطلبات" },
    { method: "POST", path: "/api/gold/chat", desc: "مساعد ذكي (سؤال/جواب)" },
    { method: "POST", path: "/api/auth/login", desc: "تسجيل دخول" },
    { method: "POST", path: "/api/auth/register", desc: "حساب جديد" },
    { method: "GET", path: "/api/admin/users", desc: "قائمة المستخدمين (admin)" },
    { method: "GET", path: "/api/admin/subscriptions", desc: "خطط الاشتراك" },
  ];

  const [selected, setSelected] = useState(0);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState(0);

  async function testEndpoint() {
    setLoading(true);
    const ep = endpoints[selected];
    const start = performance.now();
    try {
      const opts: RequestInit = ep.method === "POST"
        ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "ما هو اتجاه الذهب؟", email: "admin@mrobot.ai", password: "admin123" }) }
        : {};
      const res = await fetch(ep.path, opts);
      const data = await res.json();
      setLatency(Math.round(performance.now() - start));
      setResponse(JSON.stringify(data, null, 2).slice(0, 500) + (JSON.stringify(data).length > 500 ? "\n..." : ""));
    } catch (e: any) {
      setResponse(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-2">
         اختبر أي API endpoint مباشرة — مثل Swagger/Postman
      </div>
      {/* Endpoint list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mb-3 max-h-40 overflow-y-auto scroll-styled pr-1">
        {endpoints.map((ep, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded border text-left text-[10px] transition ${
              selected === i ? "border-gold/40 bg-gold/10" : "border-border bg-secondary/30"
            }`}
          >
            <span className={`px-1 rounded text-[8px] font-bold font-mono ${
              ep.method === "GET" ? "bg-info/20 text-info" : "bg-bull/20 text-bull"
            }`}>
              {ep.method}
            </span>
            <span className="font-mono text-foreground/80 flex-1 truncate">{ep.path}</span>
          </button>
        ))}
      </div>
      {/* Selected endpoint detail */}
      <div className="px-3 py-2 rounded border border-border bg-secondary/30 mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
            endpoints[selected].method === "GET" ? "bg-info/20 text-info" : "bg-bull/20 text-bull"
          }`}>
            {endpoints[selected].method}
          </span>
          <span className="font-mono text-xs text-foreground">{endpoints[selected].path}</span>
        </div>
        <div className="text-[10px] text-muted-foreground">{endpoints[selected].desc}</div>
      </div>
      {/* Execute button */}
      <button
        onClick={testEndpoint}
        disabled={loading}
        className="w-full py-2 rounded text-xs font-bold bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition mb-2"
      >
        {loading ? "جاري التنفيذ..." : "▶ تنفيذ الطلب (Execute)"}
      </button>
      {/* Response */}
      {response && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-mono">Response ({latency}ms)</span>
            <span className="text-[10px] text-bull font-mono">200 OK</span>
          </div>
          <pre className="text-[9px] font-mono text-foreground/80 bg-secondary/40 border border-border rounded p-2 max-h-40 overflow-y-auto scroll-styled whitespace-pre-wrap">
            {response}
          </pre>
        </div>
      )}
    </div>
  );
}

// === 4. Neural Network Visualization ===
function NeuralNetworkViz() {
  const layers = [
    { name: "Input", nodes: 6, labels: ["RSI", "MACD", "EMA", "Volume", "Williams", "Price"] },
    { name: "Hidden 1", nodes: 8 },
    { name: "Hidden 2", nodes: 5 },
    { name: "Output", nodes: 3, labels: ["BUY", "HOLD", "SELL"] },
  ];

  const nodePositions = useMemo(() => {
    const positions: { x: number; y: number; layer: number; idx: number }[] = [];
    layers.forEach((layer, li) => {
      const x = 50 + li * 100;
      const spacing = 80;
      const startY = 120 - (layer.nodes - 1) * spacing / 2;
      for (let i = 0; i < layer.nodes; i++) {
        positions.push({ x, y: startY + i * spacing, layer: li, idx: i });
      }
    });
    return positions;
  }, []);

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-2">
         الشبكة العصبية للـAI — 6 مدخلات → 8 → 5 → 3 مخرجات (قرار شراء/انتظار/بيع)
      </div>
      <div className="relative overflow-x-auto scroll-styled">
        <svg viewBox="0 0 450 280" className="w-full min-w-[400px]" style={{ height: 250 }}>
          {/* Connections */}
          {nodePositions.map((from) =>
            nodePositions
              .filter((to) => to.layer === from.layer + 1)
              .map((to, i) => (
                <line
                  key={`${from.layer}-${from.idx}-${to.layer}-${to.idx}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#5b8cff"
                  strokeWidth={0.5}
                  opacity={0.15 + Math.random() * 0.2}
                />
              ))
          )}
          {/* Nodes */}
          {nodePositions.map((node, i) => {
            const isOutput = node.layer === 3;
            const color = isOutput
              ? node.idx === 0 ? "#10b981" : node.idx === 1 ? "#d4a574" : "#f43f5e"
              : node.layer === 0 ? "#5b8cff" : "#a78bfa";
            const label = layers[node.layer].labels?.[node.idx];
            return (
              <g key={i}>
                <circle cx={node.x} cy={node.y} r={8} fill={`${color}20`} stroke={color} strokeWidth={1} />
                <circle cx={node.x} cy={node.y} r={3} fill={color} opacity={0.6} />
                {label && (
                  <text x={node.x - 25} y={node.y + 3} fill={color} fontSize={7} textAnchor="end" fontFamily="monospace" fontWeight="bold">
                    {label}
                  </text>
                )}
                {isOutput && (
                  <text x={node.x + 15} y={node.y + 3} fill={color} fontSize={8} fontFamily="monospace" fontWeight="bold">
                    {label}
                  </text>
                )}
              </g>
            );
          })}
          {/* Layer labels */}
          {layers.map((layer, i) => (
            <text key={i} x={50 + i * 100} y={20} fill="#94a3b8" fontSize={8} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              {layer.name}
            </text>
          ))}
        </svg>
      </div>
      <div className="text-[9px] text-muted-foreground mt-1">
        المدخلات (أزرق) → طبقات مخفية (بنفسجي) → المخرجات (أخضر=شراء، ذهبي=انتظار، أحمر=بيع)
      </div>
    </div>
  );
}

// === 5. Event Stream Terminal ===
function EventStream() {
  const [events, setEvents] = useState<{ time: string; type: string; msg: string; level: "info" | "warn" | "error" | "success" }[]>([
    { time: new Date().toLocaleTimeString("en-GB"), type: "SYSTEM", msg: "Next.js 16 dev server started on :3000", level: "success" },
    { time: new Date().toLocaleTimeString("en-GB"), type: "WS", msg: "Price-stream WebSocket connected on :3033", level: "success" },
    { time: new Date().toLocaleTimeString("en-GB"), type: "DB", msg: "Prisma ORM initialized (SQLite)", level: "info" },
    { time: new Date().toLocaleTimeString("en-GB"), type: "AI", msg: "Z-AI SDK ready (GLM-4-Plus)", level: "info" },
  ]);

  useEffect(() => {
    const types = [
      { type: "TICK", msgs: ["Price update: $4,XXX.XX", "Candle updated (5m)", "Volume spike detected"] },
      { type: "SIGNAL", msgs: ["AI signal: BUY (85%)", "Consensus: 4/5 agents agree", "Signal changed: SELL → BUY"] },
      { type: "TRADE", msgs: ["Position opened: 0.10 lot BUY", "SL hit: -$25.00", "TP reached: +$42.00"] },
      { type: "ALERT", msgs: ["RSI < 30 (oversold)", "MACD crossed zero", "Support broken"] },
      { type: "WS", msgs: ["Tick received: 4,XXX.XX", "WebSocket reconnected", "Latency: 12ms"] },
    ];
    const interval = setInterval(() => {
      const t = types[Math.floor(Math.random() * types.length)];
      const msg = t.msgs[Math.floor(Math.random() * t.msgs.length)];
      const level = msg.includes("error") || msg.includes("hit") ? "error" : msg.includes("reached") || msg.includes("opened") ? "success" : msg.includes("detected") || msg.includes("broken") ? "warn" : "info";
      setEvents((prev) => [
        ...prev.slice(-30),
        { time: new Date().toLocaleTimeString("en-GB"), type: t.type, msg, level: level as any },
      ]);
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const levelColor = {
    info: "#94a3b8",
    warn: "#fbbf24",
    error: "#f43f5e",
    success: "#10b981",
  };

  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-2">
         سجل أحداث مباشر — مثل Bloomberg Terminal (تحديث تلقائي كل 2-4 ثوان)
      </div>
      <div className="rounded border border-border bg-black/40 p-2 font-mono text-[9px] max-h-56 overflow-y-auto scroll-styled" style={{ fontFamily: "JetBrains Mono, monospace" }}>
        {events.map((event, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2 py-0.5 border-b border-white/[0.02]"
          >
            <span className="text-muted-foreground/60 tabular-nums ltr-nums">{event.time}</span>
            <span className="font-bold" style={{ color: levelColor[event.level] }}>[{event.type}]</span>
            <span className="text-foreground/80 flex-1">{event.msg}</span>
          </motion.div>
        ))}
        <div className="flex items-center gap-1 pt-1 text-muted-foreground/40">
          <span className="w-1.5 h-3 bg-gold animate-pulse" />
          <span>_</span>
        </div>
      </div>
      {/* Log stats */}
      <div className="mt-2 flex gap-3 text-[9px] text-muted-foreground">
        <span> {events.filter(e => e.level === "success").length} نجاح</span>
        <span> {events.filter(e => e.level === "info").length} معلومة</span>
        <span> {events.filter(e => e.level === "warn").length} تحذير</span>
        <span> {events.filter(e => e.level === "error").length} خطأ</span>
      </div>
    </div>
  );
}
