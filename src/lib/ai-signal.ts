import ZAI from "z-ai-web-dev-sdk";
import type { Candle, IndicatorSet } from "@/lib/indicators";
import type { AISignal } from "@/lib/ai-types";
import { actionLabel } from "@/lib/ai-types";

export type { AISignal } from "@/lib/ai-types";

let cached: { signal: AISignal; ts: number; price: number } | null = null;

export async function generateAISignal(
  price: number,
  candles: Candle[],
  indicators: IndicatorSet
): Promise<AISignal> {
  // Cache for 60s — even if user spams the button, signal stays stable
  if (
    cached &&
    Date.now() - cached.ts < 60_000 &&
    Math.abs(cached.price - price) / price < 0.0015
  ) {
    return cached.signal;
  }

  // Rule-based pre-analysis to feed into the AI prompt
  const ruleAction = computeRuleBasedSignal(indicators);
  const action =
    ruleAction.action === "STRONG_BUY"
      ? "شراء قوي"
      : ruleAction.action === "BUY"
      ? "شراء"
      : ruleAction.action === "SELL"
      ? "بيع"
      : ruleAction.action === "STRONG_SELL"
      ? "بيع قوي"
      : "انتظار";

  const recent5 = candles.slice(-5);
  const direction =
    recent5.at(-1)!.close > recent5[0].open ? "صاعد" : "هابط";

  const prompt = `أنت محلل تداول ذكي متخصص في سوق الذهب (XAUUSD). قم بتحليل البيانات اللحظية التالية وأعطني إشارة تداول احترافية باللغة العربية.

السعر الحالي: ${price} دولار/أونصة
الاتجاه اللحظي (آخر 5 شمعات): ${direction}

المؤشرات الفنية:
- RSI(14): ${indicators.rsi} ${indicators.rsiSignal === "oversold" ? "(تشبع بيعي)" : indicators.rsiSignal === "overbought" ? "(تشبع شرائي)" : ""}
- MACD: ${indicators.macd} | سيقنال: ${indicators.macdSignal} | الهيستوغرام: ${indicators.macdHist} (${indicators.macdTrend === "bullish" ? "صاعد" : indicators.macdTrend === "bearish" ? "هابط" : "محايد"})
- Williams %R: ${indicators.williamsR} ${indicators.williamsSignal === "oversold" ? "(تشبع بيعي)" : indicators.williamsSignal === "overbought" ? "(تشبع شرائي)" : ""}
- EMA9: ${indicators.ema9} | EMA21: ${indicators.ema21} | EMA50: ${indicators.ema50} (الاتجاه: ${indicators.emaTrend === "bullish" ? "صاعد" : indicators.emaTrend === "bearish" ? "هابط" : "محايد"})
- SMA20: ${indicators.sma20} | SMA50: ${indicators.sma50} | SMA200: ${indicators.sma200}
- بولينجر باند: علوي ${indicators.bbUpper} | متوسط ${indicators.bbMiddle} | سفلي ${indicators.bbLower}
- ATR: ${indicators.atr}
- الدعم: ${indicators.support} | المقاومة: ${indicators.resistance} | البيفوت: ${indicators.pivot}
- الحجم: ${indicators.volume} | متوسط الحجم: ${indicators.avgVolume} (${indicators.volumeTrend === "high" ? "مرتفع" : indicators.volumeTrend === "low" ? "منخفض" : "طبيعي"})

التحليل القاعدي المبدئي: ${action}

آخر 10 شمعات (زمن، فتح، أعلى، أدنى، إغلاق):
${candles.slice(-10).map(c => `${new Date(c.time * 1000).toLocaleTimeString("ar")}: ف=${c.open}, ع=${c.high}, ن=${c.low}, إ=${c.close}`).join("\n")}

أعطني النتيجة في صيغة JSON فقط (بدون نص إضافي قبل أو بعد) بهذا الشكل بالضبط:
{
  "action": "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL",
  "confidence": رقم من 0 إلى 100,
  "entry": سعر الدخول المقترح,
  "stopLoss": وقف الخسارة,
  "takeProfit1": الهدف الأول,
  "takeProfit2": الهدف الثاني,
  "takeProfit3": الهدف الثالث,
  "reasoning": "شرح تفصيلي بالعربية من 4-6 أسطر يوضح سبب التوصية",
  "bullFactors": ["سبب صعودي 1", "سبب صعودي 2", "سبب صعودي 3"],
  "bearFactors": ["سبب هبوطي 1", "سبب هبوطي 2"],
  "summary": "خلاصة من جملة واحدة بالعربية"
}

كن واقعياً واحترافياً. الأسعار يجب أن تكون قريبة من السعر الحالي ${price}. نسبة المخاطرة/العائد يجب أن تكون 1:2 على الأقل. ثقة 90+ فقط للإشارات القوية جداً.`;

  let aiPayload: any = null;
  let model = "rule-based";

  try {
    const zai = await ZAI.create();
    const res = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "أنت خبير تداول ذكي يحلل بيانات السوق ويعطي إشارات تداول احترافية ومؤكدة. تردد JSON صالح فقط بدون أي نص آخر.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    });
    const content = res?.choices?.[0]?.message?.content ?? "";
    model = res?.model ?? "z-ai";
    aiPayload = safeParseJSON(content);
  } catch (e) {
    // silent fallback
  }

  const base: AISignal = aiPayload
    ? normalizeAI(aiPayload, price, indicators, model)
    : ruleSignal(ruleAction, price, indicators);

  cached = { signal: base, ts: Date.now(), price };
  return base;
}

function ruleSignal(
  rule: { action: AISignal["action"]; confidence: number },
  price: number,
  ind: IndicatorSet
): AISignal {
  const direction =
    rule.action.includes("BUY") ? 1 : rule.action.includes("SELL") ? -1 : 0;

  const atrBasedSL = ind.atr * 1.5 || price * 0.004;
  const tp1 = direction !== -1 ? price + ind.atr * 1.5 : price - ind.atr * 1.5;
  const tp2 = direction !== -1 ? price + ind.atr * 3 : price - ind.atr * 3;
  const tp3 = direction !== -1 ? price + ind.atr * 4.5 : price - ind.atr * 4.5;
  const sl = direction !== -1 ? price - atrBasedSL : price + atrBasedSL;

  return {
    action: rule.action,
    confidence: rule.confidence,
    entry: round(price),
    stopLoss: round(sl),
    takeProfit1: round(tp1),
    takeProfit2: round(tp2),
    takeProfit3: round(tp3),
    riskReward: round(Math.abs(tp2 - price) / Math.abs(price - sl)),
    reasoning:
      "تم إنشاء هذه الإشارة بناءً على نموذج تحليلي متعدد المؤشرات يعتمد على RSI، MACD، Williams %R، والمتوسطات المتحركة. تتم مراجعة المؤشرات اللحظية وتحديث الإشارة كل دقيقة لضمان أعلى دقة ممكنة. يُنصح باتب.setHorizontalإدارة المخاطر بدقة وعدم المخاطرة بأكثر من 1-2% من رأس المال في الصفقة الواحدة.",
    bullFactors: buildBullFactors(ind),
    bearFactors: buildBearFactors(ind),
    timeframe: "5-15 دقيقة",
    validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    generatedAt: new Date().toISOString(),
    aiModel: "rule-based-engine",
    summary: `إشارة ${actionLabel(rule.action)} بثقة ${rule.confidence}% بناءً على ${
      ind.macdTrend === "bullish" ? "تقاطع MACD صاعد" : ind.macdTrend === "bearish" ? "تقاطع MACD هابط" : "MACD محايد"
    } و RSI عند ${ind.rsi}.`,
  };
}

function computeRuleBasedSignal(ind: IndicatorSet): {
  action: AISignal["action"];
  confidence: number;
} {
  let score = 0;
  if (ind.rsi < 30) score += 2;
  else if (ind.rsi < 45) score += 1;
  else if (ind.rsi > 70) score -= 2;
  else if (ind.rsi > 55) score -= 1;

  if (ind.macdHist > 0) score += 2;
  else if (ind.macdHist < 0) score -= 2;

  if (ind.williamsR < -80) score += 1;
  else if (ind.williamsR > -20) score -= 1;

  if (ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50) score += 2;
  else if (ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50) score -= 2;

  if (ind.volumeTrend === "high") {
    // volume confirms direction of EMA
    if (score > 0) score += 1;
    if (score < 0) score -= 1;
  }

  let action: AISignal["action"] = "HOLD";
  if (score >= 5) action = "STRONG_BUY";
  else if (score >= 2) action = "BUY";
  else if (score <= -5) action = "STRONG_SELL";
  else if (score <= -2) action = "SELL";

  const confidence = Math.min(98, 55 + Math.abs(score) * 7);
  return { action, confidence: round(confidence) };
}

function normalizeAI(
  raw: any,
  price: number,
  ind: IndicatorSet,
  model: string
): AISignal {
  const validActions = ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"];
  let action = String(raw?.action ?? "HOLD").toUpperCase().trim();
  if (!validActions.includes(action)) action = "HOLD";

  const confidence = clamp(Number(raw?.confidence ?? 65), 30, 98);

  const atrBasedSL = ind.atr * 1.5 || price * 0.004;
  const direction = action.includes("BUY") ? 1 : action.includes("SELL") ? -1 : 0;

  let entry = Number(raw?.entry ?? price);
  if (!Number.isFinite(entry) || Math.abs(entry - price) / price > 0.01) entry = price;
  let sl = Number(raw?.stopLoss ?? (direction >= 0 ? entry - atrBasedSL : entry + atrBasedSL));
  if (!Number.isFinite(sl) || sl <= 0 || Math.abs(sl - price) / price > 0.05)
    sl = direction >= 0 ? entry - atrBasedSL : entry + atrBasedSL;

  const tp1 = Number(raw?.takeProfit1) || (direction >= 0 ? entry + ind.atr * 1.5 : entry - ind.atr * 1.5);
  const tp2 = Number(raw?.takeProfit2) || (direction >= 0 ? entry + ind.atr * 3 : entry - ind.atr * 3);
  const tp3 = Number(raw?.takeProfit3) || (direction >= 0 ? entry + ind.atr * 4.5 : entry - ind.atr * 4.5);

  return {
    action: action as AISignal["action"],
    confidence: round(confidence),
    entry: round(entry),
    stopLoss: round(sl),
    takeProfit1: round(tp1),
    takeProfit2: round(tp2),
    takeProfit3: round(tp3),
    riskReward: round(Math.abs(tp2 - entry) / Math.abs(entry - sl)),
    reasoning: String(raw?.reasoning ?? "تحليل ذكي للسوق"),
    bullFactors: Array.isArray(raw?.bullFactors)
      ? raw.bullFactors.filter((x: any) => typeof x === "string").slice(0, 5)
      : buildBullFactors(ind),
    bearFactors: Array.isArray(raw?.bearFactors)
      ? raw.bearFactors.filter((x: any) => typeof x === "string").slice(0, 5)
      : buildBearFactors(ind),
    timeframe: "5-15 دقيقة",
    validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    generatedAt: new Date().toISOString(),
    aiModel: model,
    summary: String(raw?.summary ?? `إشارة ${actionLabel(action as AISignal["action"])} بثقة ${confidence}%.`),
  };
}

function buildBullFactors(ind: IndicatorSet): string[] {
  const out: string[] = [];
  if (ind.rsi < 35) out.push(`RSI منخفض (${ind.rsi}) — فرصة شراء من تشبع بيعي`);
  if (ind.macdTrend === "bullish") out.push(`تقاطع MACD صاعد — الهيستوغرام ${ind.macdHist > 0 ? "موجب" : "متحسن"}`);
  if (ind.emaTrend === "bullish") out.push(`ترتيب EMA صاعد (9 > 21 > 50)`);
  if (ind.williamsR < -80) out.push(`Williams %R في منطقة التشبع البيعي`);
  if (ind.volumeTrend === "high") out.push(`حجم تداول مرتفع يؤكد الحركة`);
  if (out.length === 0) out.push("السوق متوازن حالياً — ينصح بالانتظار حتى تتضح المعالم");
  return out;
}

function buildBearFactors(ind: IndicatorSet): string[] {
  const out: string[] = [];
  if (ind.rsi > 65) out.push(`RSI مرتفع (${ind.rsi}) — ضغط بيعي محتمل`);
  if (ind.macdTrend === "bearish") out.push(`تقاطع MACD هابط — الزخم يتضعف`);
  if (ind.emaTrend === "bearish") out.push(`ترتيب EMA هابط (9 < 21 < 50)`);
  if (ind.williamsR > -20) out.push(`Williams %R في منطقة التشبع الشرائي`);
  if (ind.volumeTrend === "high" && ind.macdTrend === "bearish")
    out.push("حجم مرتفع مع زخم هابط — تأكيد هبوطي");
  if (out.length === 0) out.push("لا توجد إشارات هبوطية قوية واضحة حالياً");
  return out;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function round(n: number) {
  return Math.round(n * 100) / 100;
}

function safeParseJSON(content: string): any {
  if (!content) return null;
  // Strip code fences if present
  let s = content.trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  // Find first { and last }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  const slice = s.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

// re-export for legacy consumers (server-only)
export { actionLabel } from "@/lib/ai-types";

export async function chatWithAI(
  question: string,
  context: { price: number; candles: Candle[]; indicators: IndicatorSet; signal: AISignal | null }
): Promise<string> {
  // Try Z-AI first (with very short timeout - 5 seconds max)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const ZAImod = await import("z-ai-web-dev-sdk");
    const ZAI = ZAImod.default;
    const zai = await ZAI.create();
    const sys = `أنت مساعد ذكي متخصص في تداول الذهب (XAUUSD). أجب بالعربية الفصحى بطريقة احترافية ومختصرة. السعر الحالي ${context.price} دولار. المؤشرات: RSI=${context.indicators.rsi}, MACD=${context.indicators.macdHist > 0 ? "صاعد" : "هابط"}, Williams %R=${context.indicators.williamsR}, EMA trend=${context.indicators.emaTrend}, الدعم=${context.indicators.support}, المقاومة=${context.indicators.resistance}.`;
    const res = await zai.chat.completions.create({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: question },
      ],
      temperature: 0.6,
      max_tokens: 800,
    });
    clearTimeout(t);
    const content = res?.choices?.[0]?.message?.content;
    if (content && content.length > 20) return content;
    return generateRuleBasedAnswer(question, context);
  } catch (e) {
    // Fallback to rule-based answer IMMEDIATELY (no retry)
    return generateRuleBasedAnswer(question, context);
  }
}

// Rule-based answer generator — works even when AI API is unavailable
function generateRuleBasedAnswer(
  question: string,
  context: { price: number; candles: Candle[]; indicators: IndicatorSet; signal: AISignal | null }
): string {
  const q = question.toLowerCase();
  const i = context.indicators;
  const p = context.price;
  const s = context.signal;

  // Check what the user is asking about
  if (q.includes("اتجاه") || q.includes("trend") || q.includes("Direction")) {
    const trend =
      i.emaTrend === "bullish" ? "صاعد" :
      i.emaTrend === "bearish" ? "هابط" : "محايد/متذبذب";
    return ` **اتجاه الذهب الحالي: ${trend}**

بناءً على المؤشرات الفنية:
• EMA 9: ${i.ema9} | EMA 21: ${i.ema21} | EMA 50: ${i.ema50}
• ترتيب المتوسطات: ${i.emaTrend === "bullish" ? "صاعد (9 > 21 > 50)" : i.emaTrend === "bearish" ? "هابط (9 < 21 < 50)" : "متشابك"}
• MACD: ${i.macdHist > 0 ? "إيجابي (صاعد)" : "سلبي (هابط)"} — الهيستوغرام ${i.macdHist}
• RSI: ${i.rsi} ${i.rsi < 30 ? "(تشبع بيعي)" : i.rsi > 70 ? "(تشبع شرائي)" : "(منطقة محايدة)"}

السعر الحالي: $${p.toFixed(2)}
الدعم: $${i.support.toFixed(2)} | المقاومة: $${i.resistance.toFixed(2)}`;
  }

  if (q.includes("شراء") || q.includes("بيع") || q.includes("buy") || q.includes("sell") || q.includes("نصيحة") || q.includes("توصية")) {
    const action = s ? actionLabel(s.action) : "غير متاح حالياً";
    const conf = s ? s.confidence : 0;
    return ` **التوصية الحالية: ${action}**
${s ? `نسبة الثقة: ${conf}%` : ""}

${s ? `مستويات الصفقة:
• سعر الدخول: $${s.entry.toFixed(2)}
• وقف الخسارة: $${s.stopLoss.toFixed(2)}
• الهدف الأول: $${s.takeProfit1.toFixed(2)}
• الهدف الثاني: $${s.takeProfit2.toFixed(2)}
• نسبة المخاطرة/العائد: 1:${s.riskReward}

${s.reasoning}` : "جاري تحليل السوق للحصول على التوصية..."}

 هذه توصية استشارية وليست نصيحة استثمارية. يُنصح بإدارة المخاطر بدقة.`;
  }

  if (q.includes("دعم") || q.includes("مقاومة") || q.includes("support") || q.includes("resistance") || q.includes("مستويات")) {
    return ` **مستويات الدعم والمقاومة:**

• الدعم: $${i.support.toFixed(2)}
• المقاومة: $${i.resistance.toFixed(2)}
• نقطة البيفوت: $${i.pivot.toFixed(2)}
• السعر الحالي: $${p.toFixed(2)}

${p < i.pivot ? "السعر تحت البيفوت — يميل للهبوط نحو الدعم" : "السعر فوق البيفوت — يميل للصعود نحو المقاومة"}

• Bollinger العلوي: $${i.bbUpper.toFixed(2)}
• Bollinger السفلي: $${i.bbLower.toFixed(2)}
• ATR (التقلب): ${i.atr}`;
  }

  if (q.includes("مخاطر") || q.includes("risk") || q.includes("خطر")) {
    return ` **تحليل المخاطر الحالي:**

• RSI: ${i.rsi} ${i.rsi < 30 ? "— تشبع بيعي (فرصة شراء)" : i.rsi > 70 ? "— تشبع شرائي (خطر هبوط)" : "— منطقة آمنة"}
• MACD: ${i.macdHist > 0 ? "زخم صاعد (إيجابي)" : "زخم هابط (تحذير)"}
• ATR (مقياس التقلب): ${i.atr} ${i.atr > 5 ? "— تقلب مرتفع" : "— تقلب طبيعي"}
• حجم التداول: ${i.volumeTrend === "high" ? "مرتفع (تأكيد الحركة)" : i.volumeTrend === "low" ? "منخفض (حذر)" : "طبيعي"}

${s ? `التوصية الحالية: ${actionLabel(s.action)} بثقة ${s.confidence}%` : ""}

 يُنصح بعدم المخاطرة بأكثر من 1-2% من رأس المال في الصفقة الواحدة.`;
  }

  // Default: show market summary
  return ` **ملخص سوق الذهب الآن:**

 السعر: $${p.toFixed(2)}
 التغير: ${p > i.pivot ? "+" : ""}${(p - i.pivot).toFixed(2)}

**المؤشرات الفنية:**
• RSI(14): ${i.rsi} ${i.rsi < 30 ? " تشبع بيعي" : i.rsi > 70 ? " تشبع شرائي" : " محايد"}
• MACD: ${i.macdHist > 0 ? " صاعد" : " هابط"} (${i.macdHist})
• Williams %R: ${i.williamsR}
• EMA: ${i.emaTrend === "bullish" ? " صاعد" : i.emaTrend === "bearish" ? " هابط" : " محايد"}
• الدعم: $${i.support.toFixed(2)} | المقاومة: $${i.resistance.toFixed(2)}
• ATR: ${i.atr}

${s ? `**التوصية:** ${actionLabel(s.action)} بثقة ${s.confidence}%` : ""}

 اسألني عن: الاتجاه، التوصية، الدعم/المقاومة، المخاطر`;
}
