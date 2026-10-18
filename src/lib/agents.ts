import ZAI from "z-ai-web-dev-sdk";
import type { Candle, IndicatorSet } from "@/lib/indicators";
import type { AgentAnalysis, MultiAgentResult } from "@/lib/agent-types";
import { verdictLabel } from "@/lib/agent-types";

export type { AgentAnalysis, MultiAgentResult } from "@/lib/agent-types";
export { verdictLabel } from "@/lib/agent-types";

const AGENT_PROFILES = [
  {
    id: "technical",
    name: "المحلل الفني",
    role: "Technical Analyst",
    icon: "",
    color: "#5b8cff",
    specialty:
      "تحليل الشارت، المؤشرات الفنية (RSI، MACD، EMA)، الأنماط، ومستويات الدعم والمقاومة",
  },
  {
    id: "fundamental",
    name: "محلل أساسي",
    role: "Fundamental Analyst",
    icon: "",
    color: "#22d39a",
    specialty:
      "البيانات الاقتصادية، الفائدة الأمريكية، التضخم، الطلب الفزيائي، وأرباح شركات التعدين",
  },
  {
    id: "sentiment",
    name: "محلل المشاعر",
    role: "Sentiment Analyst",
    icon: "",
    color: "#ffc933",
    specialty:
      "مشاعر السوق، نسبة الجشع/الخوف، تغريدات المؤثرين، وتحليل الأخبار لحظياً",
  },
  {
    id: "risk",
    name: "مدير المخاطر",
    role: "Risk Manager",
    icon: "",
    color: "#ff4d6a",
    specialty:
      "حجم الصفقة، وضع وقف الخسارة، ATR، نسبة المخاطرة من رأس المال، وإدارة الصفقات المفتوحة",
  },
  {
    id: "macro",
    name: "خبير الاقتصاد الكلي",
    role: "Macro Economist",
    icon: "",
    color: "#b07cff",
    specialty:
      "سياسة الفيدرالي، عوائد السندات، قوة الدولار، مخاطر ركود، والأحداث الجيوسياسية",
  },
];

let cached: { result: MultiAgentResult; ts: number; price: number } | null = null;

const VERDICT_TO_SCORE: Record<AgentAnalysis["verdict"], number> = {
  STRONG_BUY: 100,
  BUY: 50,
  HOLD: 0,
  SELL: -50,
  STRONG_SELL: -100,
};

export async function runMultiAgentAnalysis(
  price: number,
  candles: Candle[],
  indicators: IndicatorSet
): Promise<MultiAgentResult> {
  // Cache for 90s — expensive call
  if (
    cached &&
    Date.now() - cached.ts < 90_000 &&
    Math.abs(cached.price - price) / price < 0.005
  ) {
    return cached.result;
  }

  const recentCandles = candles.slice(-12).map((c) => ({
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
  }));

  const prompt = `أنت منسق فريق تحليلي متخصص في تداول الذهب (XAUUSD). قم بإصدار تحليل من خمسة وكلاء مختلفين، كل وكيل يقدم تقييمه المستقل.

السعر الحالي: ${price} دولار/أونصة
آخر 12 شمعة (5 دقائق): ${JSON.stringify(recentCandles)}

المؤشرات الفنية:
- RSI(14): ${indicators.rsi} (${indicators.rsiSignal})
- MACD: ${indicators.macd}, سيقنال: ${indicators.macdSignal}, هيستوغرام: ${indicators.macdHist} (${indicators.macdTrend})
- Williams %R: ${indicators.williamsR} (${indicators.williamsSignal})
- EMA9: ${indicators.ema9}, EMA21: ${indicators.ema21}, EMA50: ${indicators.ema50} (${indicators.emaTrend})
- بولينجر: علوي ${indicators.bbUpper}, سفلي ${indicators.bbLower}
- ATR: ${indicators.atr}
- الدعم: ${indicators.support}, المقاومة: ${indicators.resistance}
- الحجم: ${indicators.volume} vs متوسط ${indicators.avgVolume} (${indicators.volumeTrend})

الوكلاء الخمسة:
1. المحلل الفني — يركز على المؤشرات الفنية والأنماط
2. محلل أساسي — يركز على الأخبار والاقتصاد الكلي
3. محلل المشاعر — يركز على مشاعر السوق والجشع/الخوف
4. مدير المخاطر — يركز على إدارة المخاطر وحجم الصفقة
5. خبير الاقتصاد الكلي — يركز على سياسة الفيدرالي والدولار

أعطني النتيجة في JSON فقط (بدون أي نص إضافي قبل أو بعد) بهذا الشكل:
{
  "agents": [
    {
      "id": "technical",
      "verdict": "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL",
      "confidence": رقم 0-100,
      "reasoning": "شرح من 2-3 أسطر بالعربية يخص تخصص الوكيل",
      "keyFactors": ["عامل 1", "عامل 2", "عامل 3"]
    },
    { "id": "fundamental", ... },
    { "id": "sentiment", ... },
    { "id": "risk", ... },
    { "id": "macro", ... }
  ],
  "summary": "خلاصة من 2-3 أسطر بالعربية عن التقييم العام"
}

قواعد:
- كل وكيل يجب أن يحلل من زاوية تخصصه فقط
- الثقة 60+ للوكلاء المتأكدين، 90+ للقناعة التامة
- تنويع القرارات — لا يجب أن يعطي الجميع نفس التقييم بالضرورة
- keyFactors عوامل واقعية تخص تخصص الوكيل
- بالعربية الفصحى`;

  let aiPayload: any = null;
  let model = "rule-based";

  try {
    const zai = await ZAI.create();
    const res = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "أنت منسق فريق تحليلي يضم 5 وكلاء متخصصين في تداول الذهب. تردد JSON صالح فقط.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });
    const content = res?.choices?.[0]?.message?.content ?? "";
    model = res?.model ?? "z-ai";
    aiPayload = safeParseJSON(content);
  } catch (e) {
    // fall back to rule-based
  }

  const agents: AgentAnalysis[] = AGENT_PROFILES.map((profile) => {
    const raw = aiPayload?.agents?.find((a: any) => a.id === profile.id);
    return {
      ...profile,
      verdict: normalizeVerdict(raw?.verdict),
      confidence: clamp(Number(raw?.confidence ?? 65), 35, 98),
      reasoning: String(raw?.reasoning ?? ruleBasedReasoning(profile.id, indicators)),
      keyFactors: Array.isArray(raw?.keyFactors)
        ? raw.keyFactors.filter((x: any) => typeof x === "string").slice(0, 4)
        : ruleBasedFactors(profile.id, indicators),
    };
  });

  // Compute consensus
  const weightedSum = agents.reduce((s, a) => s + VERDICT_TO_SCORE[a.verdict] * a.confidence, 0);
  const weightTotal = agents.reduce((s, a) => s + a.confidence, 0);
  const consensusScore = weightedSum / weightTotal;

  const consensus = scoreToVerdict(consensusScore);
  const consensusConfidence = Math.round(
    agents.reduce((s, a) => s + a.confidence, 0) / agents.length
  );

  // Agreement = how close all verdicts are to each other (100 = perfect alignment, 0 = completely split)
  const scores = agents.map((a) => VERDICT_TO_SCORE[a.verdict]);
  const mean = scores.reduce((s, x) => s + x, 0) / scores.length;
  const variance = scores.reduce((s, x) => s + (x - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);
  const agreement = Math.max(0, Math.min(100, 100 - std));

  const summary = aiPayload?.summary || `الإجماع بين الوكلاء الخمسة يميل نحو ${verdictLabel(consensus)} بثقة ${consensusConfidence}%.`;

  const result: MultiAgentResult = {
    agents,
    consensus,
    consensusScore: Math.round(consensusScore),
    consensusConfidence,
    agreement: Math.round(agreement),
    summary,
    generatedAt: new Date().toISOString(),
    aiModel: model,
  };

  cached = { result, ts: Date.now(), price };
  return result;
}

function normalizeVerdict(v: any): AgentAnalysis["verdict"] {
  const valid = ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"];
  const s = String(v ?? "HOLD").toUpperCase().trim();
  return (valid.includes(s) ? s : "HOLD") as AgentAnalysis["verdict"];
}

function scoreToVerdict(s: number): AgentAnalysis["verdict"] {
  if (s >= 65) return "STRONG_BUY";
  if (s >= 20) return "BUY";
  if (s <= -65) return "STRONG_SELL";
  if (s <= -20) return "SELL";
  return "HOLD";
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function safeParseJSON(content: string): any {
  if (!content) return null;
  let s = content.trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

function ruleBasedReasoning(id: string, i: IndicatorSet): string {
  switch (id) {
    case "technical":
      return `المؤشرات الفنية تشير إلى ${i.macdTrend === "bullish" ? "زخم صاعد" : i.macdTrend === "bearish" ? "زخم هابط" : "زخم متوازن"} مع RSI عند ${i.rsi}. ${i.emaTrend === "bullish" ? "ترتيب EMA صاعد يدعم الاستمرار الصعودي." : i.emaTrend === "bearish" ? "ترتيب EMA هابط يضعف الأسعار." : "EMA متشابكة تشير إلى تذبذب."}`;
    case "fundamental":
      return "البيانات الاقتصادية الأمريكية الأخيرة تظهر نمواً معتدلاً، بينما الطلب الفزيائي من آسيا يبقى داعماً للذهب. أسعار الفائدة المرتفعة تضعف الجاذبية.";
    case "sentiment":
      return i.macdTrend === "bullish"
        ? "مشاعر السوق تميل إلى التفاؤل مع زيادة اهتمام المستثمرين بالذهب كملاذ آمن."
        : "هناك حذر في السوق مع اتجاه المتداولين نحو تقليل مراكزهم.";
    case "risk":
      return `نسبة المخاطرة/العائد الحالية مقبولة مع ATR=${i.atr}. ينصح بعدم المخاطرة بأكثر من 1-2% من رأس المال ووضع وقف خسارة عند ${i.support}.`;
    case "macro":
      return "سياسة الفيدرالي المتشددة وقوة الدولار تضغط على الذهب، لكن مخاوف الركود والأحداث الجيوسياسية تقدم دعماً مستداماً.";
    default:
      return "تحليل متوازن للسوق حالياً.";
  }
}

function ruleBasedFactors(id: string, i: IndicatorSet): string[] {
  switch (id) {
    case "technical":
      return [
        `MACD ${i.macdTrend === "bullish" ? "صاعد" : i.macdTrend === "bearish" ? "هابط" : "محايد"}`,
        `RSI عند ${i.rsi}`,
        `EMA trend ${i.emaTrend}`,
      ];
    case "fundamental":
      return [
        "أسعار الفائدة الأمريكية مرتفعة",
        "طلب آسيوي على المجوهرات",
        "بيانات التوظيف الأمريكية",
      ];
    case "sentiment":
      return [
        "مؤشر الجشع/الخوف",
        "حجم التداول اللحظي",
        i.volumeTrend === "high" ? "حجم مرتفع" : "حجم طبيعي",
      ];
    case "risk":
      return [
        `ATR=${i.atr}`,
        `دعم عند ${i.support}`,
        "1-2% من رأس المال",
      ];
    case "macro":
      return [
        "سياسة الفيدرالي",
        "قوة الدولار (DXY)",
        "عوائد السندات",
      ];
    default:
      return ["تحليل شامل"];
  }
}
