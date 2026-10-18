// Musical alert system for trading signals.
// Designed like advanced trading bots:
//  - A short "click" prefix (notification tick)
//  - Followed by a short musical melody that varies per signal type
//  - BUY  = ascending major arpeggio (C-E-G)
//  - SELL = descending pattern (G-E-C)
//  - STRONG_BUY  = 4-note ascending fanfare ending on high C6
//  - STRONG_SELL = 4-note descending fanfare
//  - HOLD = gentle 2-note calm pattern

let audioCtx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function setEnabled(v: boolean) {
  enabled = v;
  if (v && audioCtx?.state === "suspended") audioCtx.resume();
}

export function isEnabled() {
  return enabled;
}

interface NoteSpec {
  freq: number;       // Hz
  duration: number;   // seconds
  type: OscillatorType;
  volume?: number;    // 0..1
  delay?: number;     // seconds gap before this note
}

function playNotes(notes: NoteSpec[]) {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  let t = now;
  notes.forEach((note) => {
    const start = t + (note.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(note.volume ?? 0.18, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + note.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + note.duration + 0.04);
    t = start + note.duration;
  });
}

// Short bright notification "click" — plays at the start of every chime
function playClick() {
  playNotes([
    { freq: 1700, duration: 0.05, type: "sine", volume: 0.22 },
  ]);
}

// Buy: ascending C-E-G major arpeggio (uplifting, positive)
function playBuyChime() {
  playClick();
  playNotes([
    { freq: 523.25, duration: 0.10, type: "sine", volume: 0.16, delay: 0.06 }, // C5
    { freq: 659.25, duration: 0.10, type: "sine", volume: 0.16, delay: 0.00 }, // E5
    { freq: 783.99, duration: 0.22, type: "sine", volume: 0.20, delay: 0.00 }, // G5
  ]);
}

// Sell: descending G-E-C (gentle warning, still musical)
function playSellChime() {
  playClick();
  playNotes([
    { freq: 783.99, duration: 0.10, type: "triangle", volume: 0.15, delay: 0.06 }, // G5
    { freq: 659.25, duration: 0.10, type: "triangle", volume: 0.15, delay: 0.00 }, // E5
    { freq: 523.25, duration: 0.22, type: "triangle", volume: 0.18, delay: 0.00 }, // C5
  ]);
}

// Strong Buy: 4-note ascending fanfare ending on high C6
function playStrongBuyChime() {
  playClick();
  playNotes([
    { freq: 523.25, duration: 0.08, type: "sine", volume: 0.16, delay: 0.06 },  // C5
    { freq: 659.25, duration: 0.08, type: "sine", volume: 0.16, delay: 0.00 },  // E5
    { freq: 783.99, duration: 0.08, type: "sine", volume: 0.16, delay: 0.00 },  // G5
    { freq: 1046.5, duration: 0.30, type: "sine", volume: 0.22, delay: 0.00 }, // C6
  ]);
}

// Strong Sell: 4-note descending fanfare (C6 → C5)
function playStrongSellChime() {
  playClick();
  playNotes([
    { freq: 1046.5, duration: 0.08, type: "sawtooth", volume: 0.12, delay: 0.06 },  // C6
    { freq: 783.99, duration: 0.08, type: "sawtooth", volume: 0.12, delay: 0.00 }, // G5
    { freq: 659.25, duration: 0.08, type: "sawtooth", volume: 0.12, delay: 0.00 },  // E5
    { freq: 523.25, duration: 0.30, type: "sawtooth", volume: 0.16, delay: 0.00 }, // C5
  ]);
}

// Hold: gentle 2-note calm pattern (C → G)
function playHoldChime() {
  playClick();
  playNotes([
    { freq: 523.25, duration: 0.10, type: "triangle", volume: 0.13, delay: 0.06 }, // C5
    { freq: 783.99, duration: 0.22, type: "triangle", volume: 0.15, delay: 0.00 },  // G5
  ]);
}

// Dispatcher — called from the audio manager when the AI signal changes.
export function playSignalAlert(action: string) {
  switch (action) {
    case "STRONG_BUY":
      playStrongBuyChime();
      break;
    case "BUY":
      playBuyChime();
      break;
    case "SELL":
      playSellChime();
      break;
    case "STRONG_SELL":
      playStrongSellChime();
      break;
    case "HOLD":
      playHoldChime();
      break;
    default:
      playClick();
  }
}

// === UI Interaction Sounds ===

// Very subtle mechanical click — for button presses (like a pro keyboard)
export function playUIClick() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  // Two quick high-frequency bursts for a crisp "click"
  [0, 0.012].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(2200, now + delay);
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.08, now + delay + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.025);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.03);
  });
}

// Soft hover sound — very gentle tick for hover states (optional, very quiet)
export function playUIHover() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1800, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.03, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.025);
}

// === Indicator Event Sounds ===

// RSI crossed into oversold (< 30) — gentle descending tone
export function playRSIOversold() {
  if (!enabled) return;
  playNotes([
    { freq: 660, duration: 0.08, type: "sine", volume: 0.12 },
    { freq: 523, duration: 0.12, type: "sine", volume: 0.12, delay: 0.00 },
  ]);
}

// RSI crossed into overbought (> 70) — gentle ascending tone
export function playRSIOverbought() {
  if (!enabled) return;
  playNotes([
    { freq: 523, duration: 0.08, type: "sine", volume: 0.12 },
    { freq: 660, duration: 0.12, type: "sine", volume: 0.12, delay: 0.00 },
  ]);
}

// MACD histogram crossed zero — subtle double-tick
export function playMACDCross() {
  if (!enabled) return;
  playNotes([
    { freq: 1000, duration: 0.04, type: "square", volume: 0.08, delay: 0.06 },
    { freq: 1200, duration: 0.06, type: "square", volume: 0.08, delay: 0.00 },
  ]);
}

// Price crossed support level — warning tone
export function playSupportBreak() {
  if (!enabled) return;
  playNotes([
    { freq: 400, duration: 0.10, type: "sawtooth", volume: 0.10 },
    { freq: 350, duration: 0.15, type: "sawtooth", volume: 0.10, delay: 0.00 },
  ]);
}

// Price crossed resistance level — alert tone
export function playResistanceBreak() {
  if (!enabled) return;
  playNotes([
    { freq: 500, duration: 0.10, type: "sine", volume: 0.10 },
    { freq: 700, duration: 0.15, type: "sine", volume: 0.10, delay: 0.00 },
  ]);
}

// === Trade Execution Sounds ===

// Professional "trade executed" sound — plays IMMEDIATELY on button click
export function playTradeBuy() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  // Crisp click + ascending confirm chime
  // 1. Click (immediate, sharp)
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = "square";
  clickOsc.frequency.setValueAtTime(2000, now);
  clickGain.gain.setValueAtTime(0, now);
  clickGain.gain.linearRampToValueAtTime(0.12, now + 0.002);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);
  clickOsc.start(now);
  clickOsc.stop(now + 0.035);

  // 2. Ascending confirm chime (C5 → E5 → G5)
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + 0.05 + i * 0.08;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.16);
  });
}

export function playTradeSell() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  // 1. Click (immediate, sharp)
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = "square";
  clickOsc.frequency.setValueAtTime(2000, now);
  clickGain.gain.setValueAtTime(0, now);
  clickGain.gain.linearRampToValueAtTime(0.12, now + 0.002);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);
  clickOsc.start(now);
  clickOsc.stop(now + 0.035);

  // 2. Descending confirm chime (G5 → E5 → C5)
  [783.99, 659.25, 523.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + 0.05 + i * 0.08;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.16);
  });
}

// Trade closed — short confirmation beep
export function playTradeClosed() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  // Double beep (confirmation)
  [0, 0.08].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now + delay);
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.10, now + delay + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.07);
  });
}

// === NEW BEAUTIFUL SOUNDS ===

// Strategy signal found — elegant 3-note rising chime
export function playStrategySignal() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  // Beautiful rising arpeggio: E4 → A4 → C#5 → E5 (A major)
  [329.63, 440.00, 554.37, 659.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + i * 0.07;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.14, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}

// Price alert hit — pleasant bell-like tone
export function playPriceAlert() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  // Bell-like: two harmonics for richness
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + i * 0.01;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(i === 0 ? 0.16 : 0.08, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}

// Notification received — soft pop sound
export function playNotification() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

// Regime change — deep warning tone
export function playRegimeChange() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  // Deep tone: 220Hz → 165Hz (A → E)
  [220, 165].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + i * 0.12;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

// CHOCH detected — urgent but musical alert
export function playCHOCH() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  // Quick triple tone: C5 → G5 → C6 (urgent but pleasant)
  [523.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + i * 0.06;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.13, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.12);
  });
}

// BOS detected — confirmation tone
export function playBOS() {
  if (!enabled) return;
  playNotes([
    { freq: 659.25, duration: 0.08, type: "sine", volume: 0.12 },
    { freq: 880, duration: 0.12, type: "sine", volume: 0.12, delay: 0.00 },
  ]);
}

// Dashboard opened — gentle welcome tone
export function playPanelOpen() {
  if (!enabled) return;
  playNotes([
    { freq: 523.25, duration: 0.06, type: "sine", volume: 0.08 },
    { freq: 659.25, duration: 0.08, type: "sine", volume: 0.08, delay: 0.00 },
  ]);
}

// Theme toggle — soft switch sound
export function playThemeToggle() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

// Error/Warning — gentle but noticeable
export function playWarning() {
  if (!enabled) return;
  playNotes([
    { freq: 440, duration: 0.08, type: "triangle", volume: 0.10 },
    { freq: 440, duration: 0.08, type: "triangle", volume: 0.10, delay: 0.1 },
  ]);
}

// Success — pleasant major chord
export function playSuccess() {
  if (!enabled) return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  // C major chord: C5 + E5 + G5 simultaneously
  [523.25, 659.25, 783.99].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.10, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  });
}
