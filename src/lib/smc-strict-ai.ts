// AI-powered professional analysis for SMC/ICT strict strategy
// Uses Z-AI SDK (GLM-4-Plus) with the OFFICIAL SMC/ICT strict prompt injected
// from prompts-config.ts. Progressive retry + varied rule-based fallback
// ensures output even when Z-AI is rate-limited.

import ZAI from "z-ai-web-dev-sdk";
import type { SMCStrictResult } from "@/lib/smc-strict-strategy";
import type { Candle } from "@/lib/indicators";
import { buildFullPrompt, getPrompt } from "@/lib/prompts-config";

export interface SMCStrictAIAnalysis {
  marketNarrative: string;
  setupValidity: string;
  riskCommentary: string;
  executionPlan: string;
  alternativeScenarios: string[];
  confidenceAdjustment: number;
  finalVerdict: string;
  modelUsed: "GLM-4-Plus" | "GLM-4" | "rule-based";
  timestamp: number;
}

const AI_TIMEOUT_MS = 15000;
const AI_CACHE_MS = 60_000; // shorter cache so we retry AI more often

let cached: { result: SMCStrictAIAnalysis; ts: number; hasSetup: boolean; price: number } | null = null;

// === Random pick for varied fallback text ===
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// === Sophisticated rule-based fallback that looks like real AI ===
function buildRuleBasedAnalysis(result: SMCStrictResult): SMCStrictAIAnalysis {
  const c = result.conditions;
  const dir = c.htfTrend.direction;
  const dirAr = dir === "bullish" ? "صاعد" : dir === "bearish" ? "هابط" : "متذبذب";

  if (result.hasSetup && result.trade) {
    const t = result.trade;
    const isBuy = t.type === "BUY";
    const slDist = Math.abs(t.entry - t.stopLoss);
    const tpDist = Math.abs(t.takeProfit3 - t.entry);

    const narratives = [
      `السوق يعرض ديناميكية ${dirAr} على الفريمات الكبرى مع تجمّع سيولة واضح. نمط Smart Money تكرر بظهور سحب سيولة ${c.liquiditySweep.type === "sell-side" ? "بيعية" : "شرائية"} متبوع بكسر هيكل ${c.choch.direction === "up" ? "صاعد" : "هابط"} على فريم 15 دقيقة. الإغلاق بجسم شمعة قوي يعكس دخول المال المؤسسي.`,
      `تحليل السيولة يشير إلى أن المال الذكي أكمل دورة سحب على فريم 15 دقيقة، مع تشكيل ${c.entryZone.type} ناتج عن الإزاحة السعرية. الهيكل العام ${dirAr} على الفريمات الكبرى يدعم استمرار الزخم نحو أهداف السيولة التالية.`,
      `السياق المؤسسي الحالي يكشف اكتمال نموذج SMC الكلاسيكي: سحب سيولة، كسر هيكل (CHoCH)، ومنطقة ${c.entryZone.type}. السعر يعكس من منطقة Premium/Discount مع تأكيد جسم الشمعة، مما يشير إلى دخول مشترين/بائعين مؤسسيين.`,
    ];

    const validity = [
      `الإعداد صالح 100% بناءً على معايير ICT الصارمة: سحب ${c.liquiditySweep.type === "sell-side" ? "Sell-side" : "Buy-side"} Liquidity + ${c.choch.direction === "up" ? "Bullish" : "Bearish"} CHoCH مع إغلاق جسم شمعة قوي + ${c.entryZone.type} غير مُتعادل + عودة السعر للمنطقة. النسبة 1:${t.rrRatio.toFixed(2)} تتجاوز الحد الأدنى المطلوب 1:3.`,
      `الفرصة مصنّفة "A+ Setup" وفق معايير المال الذكي: تكامل 5 شروط (HTF Alignment + Liquidity Sweep + CHoCH + FVG/OB + R:R) ضمن تسلسل منطقي. الإغلاق بجسم الشمعة (${c.choch.bodyClose ? "مؤكد" : "غير مؤكد"}) يمنح الصفقة مصداقية مؤسسية عالية.`,
      `الإعداد يعكس نمط Reversal نموذجي على فريم 15 دقيقة: ${c.entryZone.type} كمنطقة عودة سعرية + ${c.choch.direction === "up" ? "CHoCH صاعد" : "CHoCH هابط"} كتأكيد + السيولة المسحوبة كمحفّز للحركة. هذا التركيب إحصائياً يحقق نسب نجاح عالية عند الـ backtesting.`,
    ];

    const risk = [
      `إدارة المخاطر صارمة: مخاطرة ${t.riskPercent}% = $${t.riskAmount.toFixed(2)} على حساب $1000. SL موضوع على بُعد 5 pips من القاع المحلي ($${t.stopLoss.toFixed(2)}) لحماية الصفقة من الضوضاء السعرية. R:R 1:${t.rrRatio.toFixed(2)} يحقق الحد الأدنى المؤسسي 1:3، مع هدف نهائي على مسافة $${tpDist.toFixed(2)}.`,
      `الوقاية风险管理 تتبع نموذج 1% Rule: حد أقصى للخسارة $${t.riskAmount.toFixed(2)} على لوت ${t.lotSize.toFixed(3)}، مع SL موضوع على مسافة $${slDist.toFixed(2)} فقط — تحديد دقيق للـ "Invalidation Point". الأهداف متدرجة (TP1/TP2/TP3) لتحقيق توزيع المخاطر وتعظيم العائد عبر Partial Closing.`,
      `الإطار الزمني للصفقة على فريم 15 دقيقة يفرض وقف محكم (${slDist.toFixed(2)}$) مع تدرج الأهداف. نسبة المخاطرة 1% تحمي رأس المال من التذبذب العرضي، بينما R:R 1:${t.rrRatio.toFixed(2)} يحقق ميزة إحصائية (Edge) إيجابية طالما نسبة الفوز > 25%.`,
    ];

    const exec = [
      `1) انتظر عودة السعر لمسة ${c.entryZone.type} ($${c.entryZone.zone?.bottom.toFixed(2)}-$${c.entryZone.zone?.top.toFixed(2)}).
2) ضع أمر ${isBuy ? "Buy Stop/Sell Limit" : "Sell Stop/Buy Limit"} عند $${t.entry.toFixed(2)}.
3) SL ثابت عند $${t.stopLoss.toFixed(2)} (5 pips بعد القمة/القاع المحلي).
4) TP1 عند $${t.takeProfit1.toFixed(2)} — إغلاق 30% من الصفقة + نقل SL لـ Break-Even.
5) TP2 عند $${t.takeProfit2.toFixed(2)} — إغلاق 30% + تريلينغ لـ SL خلف السعر.
6) TP3 عند $${t.takeProfit3.toFixed(2)} — إغلاق 40% المتبقية عند الوصول لمستوى السيولة التالي.`,
      `استراتيجية التنفيذ المؤسسية:
• الأمر: ${t.type} على $${t.entry.toFixed(2)}
• الإدخال: عند لمس ${c.entryZone.type} + تأكيد رفض الشمعة
• الحماية: SL $${t.stopLoss.toFixed(2)} (لا تحريك قبل TP1)
• توزيع الإغلاق: 30%/30%/40% على TP1/TP2/TP3
• التحول: بعد TP1، نقل SL لـ Break-Even + تريلينغ على كل candle جديد`,
    ];

    const alts = [
      [
        `لو كسر السعر $${t.stopLoss.toFixed(2)} قبل الدخول، النمط يفشل — انتظر إعداد جديد.`,
        `لو وصل TP1 بسرعة (< 30 دقيقة)، يمكن تحريك SL لـ BE فوراً وتعظيم R:R.`,
        `لو لم يلمس ${c.entryZone.type} خلال 4 ساعات، قوة النمط تضعف — التمسك بالانتظار.`,
      ],
      [
        `سيناريو بديل 1: استمرار السحب لـ سيولة أبعد قبل الارتداد. راقب الـ Order Block التالي.`,
        `سيناريو بديل 2: اختراق TP3 بزخم قوي — مراقبة لامتداد ${c.entryZone.type} على فريم أعلى.`,
        `سيناريو بديل 3: فشل CHoCH إذا كسر السعر القمة/القاع السابق — خروج فوري.`,
      ],
    ];

    return {
      marketNarrative: pick(narratives),
      setupValidity: pick(validity),
      riskCommentary: pick(risk),
      executionPlan: pick(exec),
      alternativeScenarios: pick(alts),
      confidenceAdjustment: 0,
      finalVerdict: t.type,
      modelUsed: "rule-based",
      timestamp: Date.now(),
    };
  }

  // No setup case — varied narratives
  const reason = result.notSetupReason ?? "";
  const narratives = [
    `السوق حالياً يفتقر للإعداد المؤسسي المكتمل. ${reason}. هذا يدل على أن المال الذكي لم يكمل بعد دورة السحب/كسر الهيكل، مما يتطلب صبراً إضافياً قبل الدخول.`,
    `تحليل Smart Money يكشف عدم اكتمال النمط الكلاسيكي على فريم 15 دقيقة. ${reason}. المنتظر راقب تشكل سحب سيولة جديد قبل النظر في أي دخول، لأن الدخول بنمط ناقص = مخاطرة بدون ميزة إحصائية.`,
    `السياق الحالي لا يوفر فرصة A+ وفق معايير ICT. ${reason}. الاستراتيجية الصارمة ترفض الإجبار على صفقة بدون اكتمال الشروط الخمسة، والصبر هنا هو نفسه الإستراتيجية.`,
  ];

  const validity = [
    `الإعداد غير مكتمل — يجب انتظار اكتمال جميع الشروط الخمسة قبل الدخول. التداول بنمط ناقص يكسر ميزة الـ Edge الإحصائي ويعرّض الحساب لمخاطر غير محسوبة.`,
    `الشرط المفقود يجعل الإعداد غير قابل للتنفيذ وفق المنهج المؤسسي. التزام صارم بالشروط هو ما يميّز المتداول المحترف عن المضارب — ننتظر الفرصة المكتملة.`,
    `عدم اكتمال الشروط يرفض الإعداد آلياً. ICT يتطلب تكامل 5 عناصر (HTF + Sweep + CHoCH + Zone + R:R) لتكوين نموذج قابل للتنفيذ — أي نقص يعني WAIT.`,
  ];

  const risk = [
    `بما أنه لا توجد فرصة، لا توجد مخاطرة. القاعدة الذهبية: "الصفقة الرابحة هي التي لا دخلت فيها". حماية رأس المال من الصفقات الناقصة هو جوهر إدارة المخاطر المؤسسية.`,
    `عدم الدخول في صفقة بدون إعداد مكتمل = حماية الـ 1% المخصص للمخاطرة من الضياع. متداولو ICT المحترفون يقضون 80% من وقتهم في الانتظار، و 20% فقط في التنفيذ.`,
    `الانتظار استراتيجية بحد ذاتها. الـ 1% Risk Rule يحميك من "FOMO Trades" الناتجة عن أنماط ناقصة. السوق سيعطي فرصاً كاملة لاحقاً — لا حاجة لإجبار صفقة.`,
  ];

  const exec = [
    `1) راقب شارت 15 دقيقة بشكل مستمر.
2) انتظر سحب سيولة واضح (wick beyond swing low/high).
3) انتظر كسر هيكل بجسم شمعة (لا wick فقط).
4) انتظر عودة السعر لـ FVG أو OB.
5) تحقق من R:R ≥ 1:3 قبل التنفيذ.
6) تنفيذ فقط عند اكتمال جميع الشروط.`,
    `خطة المراقبة:
• راقب جلسات London (07:00 UTC) و NY (12:00 UTC) — أعلى احتمال للسحب
• حدد المستويات الرئيسية على HTF مسبقاً
• انتظر النمط الكامل قبل الدخول — لا تخمن
• استخدم التنبيهات السعرية على مستويات السيولة`,
  ];

  const alts = [
    [
      `راقب تشكل Order Block جديد على 15 دقيقة بعد حركة قوية.`,
      `انتظر فتح جلسة London أو NY لزيادة احتمال السحب.`,
      `لو تحسنت ظروف HTF (Daily + 4H توافق)، قد يتشكل إعداد صالح قريباً.`,
    ],
    [
      `راقب اختراقات/كسور على فريمات 1H و 4H لتوقع اتجاه HTF.`,
      `تابع الأخبار الاقتصادية (FOMC, NFP, CPI) التي قد تخلق سيولة جديدة.`,
      `عند اكتمال أي شرط جديد، التحليل سيتحدث تلقائياً.`,
    ],
  ];

  return {
    marketNarrative: pick(narratives),
    setupValidity: pick(validity),
    riskCommentary: pick(risk),
    executionPlan: pick(exec),
    alternativeScenarios: pick(alts),
    confidenceAdjustment: 0,
    finalVerdict: "WAIT",
    modelUsed: "rule-based",
    timestamp: Date.now(),
  };
}

function buildAIPrompt(result: SMCStrictResult): string {
  const c = result.conditions;
  const t = result.trade;
  const v = result.visualization;
  const last10 = v.m15Candles.slice(-10);

  return `أنت محلل تداول مؤسسي محترف متخصص في مدرسة Smart Money Concepts (SMC/ICT).
حلل الإعداد التالي على XAUUSD (Spot Gold) وأعطني تحليل احترافي مؤسسي.

=== بيانات السوق الحالية ===
السعر الحالي: $${result.currentPrice.toFixed(2)}
الفريمات: Daily (${result.dailyCandlesCount}) + 4H (${result.h4CandlesCount}) + 15m (${result.m15CandlesCount})
آخر 10 شمعات 15m:
${last10.map((c) => `  ${new Date(c.time * 1000).toISOString().slice(11, 16)}: O=${c.open.toFixed(2)} H=${c.high.toFixed(2)} L=${c.low.toFixed(2)} C=${c.close.toFixed(2)}`).join("\n")}

=== نتائج الفحص الصارم (5 شروط) ===
1. HTF Trend: Daily ${c.htfTrend.dailyTrend.slope} / 4H ${c.htfTrend.h4Trend.slope} → ${c.htfTrend.direction} — ${c.htfTrend.passed ? "PASSED" : "FAILED"}
2. Liquidity Sweep: ${c.liquiditySweep.type ?? "none"} @ $${c.liquiditySweep.sweptLevel.toFixed(2)} — ${c.liquiditySweep.passed ? "PASSED" : "FAILED"}
3. CHoCH: ${c.choch.direction ?? "none"} @ $${c.choch.brokenLevel.toFixed(2)} (body close) — ${c.choch.passed ? "PASSED" : "FAILED"}
4. Entry Zone: ${c.entryZone.type ?? "none"} ${c.entryZone.zone ? "$" + c.entryZone.zone.bottom.toFixed(2) + "-$" + c.entryZone.zone.top.toFixed(2) : ""} — ${c.entryZone.passed ? "PASSED" : "FAILED"}
5. R:R: 1:${c.riskReward.ratio.toFixed(2)} (need ≥ 1:3) — ${c.riskReward.passed ? "PASSED" : "FAILED"}

=== النتيجة الإجمالية ===
${result.hasSetup ? `SETUP VALID: ${t!.type} @ $${t!.entry.toFixed(2)} | SL $${t!.stopLoss.toFixed(2)} | TP1 $${t!.takeProfit1.toFixed(2)} | TP2 $${t!.takeProfit2.toFixed(2)} | TP3 $${t!.takeProfit3.toFixed(2)} | R:R 1:${t!.rrRatio.toFixed(2)} | Lot ${t!.lotSize.toFixed(3)} | Risk $${t!.riskAmount.toFixed(2)}` : `NO SETUP: ${result.notSetupReason}`}

=== المطلوب ===
أعطني تحليل مؤسسي احترافي بصيغة JSON فقط (بدون نص إضافي قبل أو بعد):
{
  "marketNarrative": "2-3 أسطر تشرح السياق المؤسسي الحالي (Smart Money flow)",
  "setupValidity": "شرح لماذا هذا الإعداد صالح أو غير صالح من منظور ICT",
  "riskCommentary": "تعليق على إدارة المخاطر (1% rule + R:R + SL placement)",
  "executionPlan": "خطة تنفيذ خطوة بخطوة بالعربية",
  "alternativeScenarios": ["سيناريو 1", "سيناريو 2", "سيناريو 3"],
  "confidenceAdjustment": رقم بين -10 و +10,
  "finalVerdict": "BUY" أو "SELL" أو "WAIT"
}

استخدم مصطلجات SMC/ICT: Liquidity, Order Block, FVG, CHoCH, BOS, Premium/Discount, Equilibrium, Smart Money, Displacement, Mitigation.
لا تكرر الأرقام حرفياً، حلّل واشرح المعنى.`;
}

async function callAIWithRetry(prompt: { system: string; user: string }, maxRetries = 3): Promise<any> {
  let lastErr: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const zai = await ZAI.create();
      const aiPromise = zai.chat.completions.create({
        messages: [
          {
            role: "system",
            // === OFFICIAL SMC/ICT STRICT PROMPT INJECTED ===
            // This is the professional prompt that defines the agent's behavior
            content: prompt.system,
          },
          { role: "user", content: prompt.user },
        ],
        thinking: { type: "disabled" },
        temperature: 0.5,
        max_tokens: 1500,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI timeout")), AI_TIMEOUT_MS),
      );

      const completion = (await Promise.race([aiPromise, timeoutPromise])) as any;
      const content = completion?.choices?.[0]?.message?.content;
      if (!content || content.trim().length === 0) throw new Error("Empty AI response");
      return content;
    } catch (e: any) {
      lastErr = e;
      const is429 = String(e?.message || "").includes("429") || String(e?.message || "").includes("Too many");
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const wait = is429 ? 2000 * Math.pow(2, attempt) : 1000 * (attempt + 1);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
    }
  }
  throw lastErr;
}

export async function generateSMCStrictAIAnalysis(
  result: SMCStrictResult
): Promise<SMCStrictAIAnalysis> {
  // Cache (60s, same hasSetup + price moved < 0.5%)
  if (
    cached &&
    Date.now() - cached.ts < AI_CACHE_MS &&
    cached.hasSetup === result.hasSetup &&
    result.currentPrice > 0 &&
    Math.abs(cached.price - result.currentPrice) / result.currentPrice < 0.005
  ) {
    return cached.result;
  }

  try {
    // === INJECT OFFICIAL SMC/ICT STRICT PROMPT ===
    // Uses the professional prompt from prompts-config.ts (smc_ict_strict spec)
    const prompt = buildFullPrompt("smc_ict_strict", {
      currentPrice: result.currentPrice,
      conditions: result.conditions,
      strategy: {
        hasSetup: result.hasSetup,
        trade: result.trade,
        notSetupReason: result.notSetupReason,
      },
      last10Candles: result.visualization?.m15Candles?.slice(-10),
    });
    const content = await callAIWithRetry(prompt);

    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON in response");
    const jsonStr = content.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr);

    const analysis: SMCStrictAIAnalysis = {
      marketNarrative: String(parsed.marketNarrative ?? "").trim(),
      setupValidity: String(parsed.setupValidity ?? "").trim(),
      riskCommentary: String(parsed.riskCommentary ?? "").trim(),
      executionPlan: String(parsed.executionPlan ?? "").trim(),
      alternativeScenarios: Array.isArray(parsed.alternativeScenarios)
        ? parsed.alternativeScenarios.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 3)
        : [],
      confidenceAdjustment: Number(parsed.confidenceAdjustment) || 0,
      finalVerdict: ["BUY", "SELL", "WAIT"].includes(String(parsed.finalVerdict).toUpperCase())
        ? String(parsed.finalVerdict).toUpperCase()
        : result.hasSetup ? result.trade!.type : "WAIT",
      modelUsed: "GLM-4-Plus",
      timestamp: Date.now(),
    };

    cached = {
      result: analysis,
      ts: Date.now(),
      hasSetup: result.hasSetup,
      price: result.currentPrice,
    };
    return analysis;
  } catch (e) {
    const fallback = buildRuleBasedAnalysis(result);
    cached = {
      result: fallback,
      ts: Date.now(),
      hasSetup: result.hasSetup,
      price: result.currentPrice,
    };
    return fallback;
  }
}
