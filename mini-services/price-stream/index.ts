import { Server } from "socket.io";
import http from "http";

const PORT = 3033;
const BINANCE_PAXG_URL = "https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT";

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("M.ROBOT — real-time gold price stream (Binance PAXGUSDT)");
});

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/",
});

let currentPrice = 4166.0; // initial guess; will be replaced by first real fetch
let prevPrice = 4166.0;
let lastFetchOk = false;

async function fetchRealPrice(): Promise<number | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(BINANCE_PAXG_URL, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("binance ticker failed");
    const j: any = await res.json();
    const p = Number(j.lastPrice);
    if (!Number.isFinite(p) || p < 100) throw new Error("bad price");
    return p;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

io.on("connection", (socket) => {
  console.log(`[price-stream] Client connected: ${socket.id}`);
  // Send current price immediately on connection
  socket.emit("price", { price: currentPrice, ts: Date.now(), source: "binance-paxg" });
  socket.on("disconnect", () => {
    console.log(`[price-stream] Client disconnected: ${socket.id}`);
  });
});

// Poll Binance for real price every 2 seconds and broadcast to all clients
setInterval(async () => {
  const newPrice = await fetchRealPrice();
  if (newPrice === null) {
    if (lastFetchOk) {
      console.log(`[price-stream] Binance fetch failed, keeping last price: ${currentPrice}`);
      lastFetchOk = false;
    }
    return;
  }
  lastFetchOk = true;
  prevPrice = currentPrice;
  currentPrice = Math.round(newPrice * 100) / 100;
  io.emit("price", {
    price: currentPrice,
    prevPrice,
    ts: Date.now(),
    source: "binance-paxg",
  });
}, 2000);

// Initial fetch right away
(async () => {
  const p = await fetchRealPrice();
  if (p !== null) {
    currentPrice = Math.round(p * 100) / 100;
    console.log(`[price-stream] Initial real price: $${currentPrice} (Binance PAXGUSDT)`);
  }
})();

server.listen(PORT, () => {
  console.log(`[price-stream] WebSocket service running on port ${PORT}`);
  console.log(`[price-stream] Source: Binance PAXGUSDT (real-time gold)`);
});
