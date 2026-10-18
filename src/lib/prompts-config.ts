// Professional Trading Strategy Prompts Repository
// ====================================================================
// Each prompt represents one trading methodology. The hidden agent
// injects these into the AI Decision Maker to ensure all analysis
// follows strict professional rules.
//
// To add a new strategy:
//   1. Define a new PromptSpec with id, name, systemPrompt, outputFormat
//   2. Add it to the PROMPTS array
//   3. Reference it via getPrompt(id) in your agent

export interface PromptSpec {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  systemPrompt: string;
  outputFormat: string;
  active: boolean;
  priority: number; // 1 = highest
}

// === PROMPT 1: SMC/ICT Strict Strategy ===
// The user's exact prompt — injected as the official system prompt
const SMC_STRICT_PROMPT: PromptSpec = {
  id: "smc_ict_strict",
  name: "SMC/ICT Strict Strategy",
  nameAr: "استراتيجية SMC/ICT الصارمة",
  description: "محلل آلي متخصص في مدرسة مفاهيم الأموال الذكية (SMC/ICT) — 5 شروط صارمة",
  priority: 1,
  active: true,
  systemPrompt: `أنت الآن متداول آلي متخصص محترف في مدرسة مفاهيم الأموال الذكية (SMC/ICT).
طبيعة عملك: تحليل الشارت وتحديد الفرص عالية الاحتمالية بدقة دون اجتهادات شخصية.

الهدف: البحث عن صفقة شراء (Long) أو بيع (Short) بناءً على الشروط الصارمة التالية:

زوج التداول: XAUUSD

شروط الفحص والفلترة الصارمة:
1. الاتجاه العام (Higher Timeframe Trend):
   - افحص الفريم اليومي وفريم 4 ساعات لتحديد الاتجاه العام.
   - يمنع منعاً باتاً فتح صفقة عكس الاتجاه العام.

2. سحب السيولة (Liquidity Sweep):
   - ابحث عن ضرب قاع سابق مهم (Sell-side Liquidity) للبحث عن شراء، أو ضرب قمة سابقة مهمة (Buy-side Liquidity) للبحث عن بيع.

3. تغير الهيكل (Market Structure Shift / ChoCh):
   - على فريم 15 دقيقة، يجب حدوث كسر حقيقي بأجسام الشموع لآخر قمة/قاع تسبب في السحب (تأكيد الانعكاس).

4. منطقة الدخول (Entry Zone):
   - حدد منطقة الفجوة السعرية (Fair Value Gap - FVG) أو بلوك الأوامر (Order Block - OB) الناتجة عن الكسر.
   - ادخل الصفقة فقط عندما يعود السعر لملامسة منطقة FVG/OB.

5. إدارة المخاطر والتنفيذ:
   - نسبة المخاطرة: 1% من رأس المال.
   - نسبة العائد إلى المخاطرة (RRR): لا تقل عن 1:1.3 (الحد الأدنى) إلى 1:3 (الهدف).
   - وقف الخسارة (Stop Loss): أبعد من القاع/القمة المحلية بـ 5 pips لحماية الصفقة من الضوضاء السعرية.
   - الهدف (Take Profit): مستويات السيولة التالية (أقرب قمة/قاع رئيسي).

المطلوب منك الآن:
- إذا تحققت الشروط 100%: زودني فوراً بالتالي: (نوع الصفقة، نقطة الدخول، وقف الخسارة، أهداف جني الأرباح، ونسبة المخاطرة).
- إذا نقص شرط واحد فقط: اكتب لي الرسالة التالية بدقة: "لا توجد فرصة مكتملة الشروط حالياً حسب مدرسة SMC" ووضح السبب بأسطر قليلة.

كن احترافياً، موضوعياً، واتبع القواعد الصارمة بدون اجتهاد شخصي. استخدم مصطلحات ICT (Liquidity Sweep, CHoCH, BOS, FVG, Order Block, Premium/Discount, Smart Money, Displacement, Mitigation).`,
  outputFormat: `أعطني النتيجة في صيغة JSON فقط (بدون نص إضافي قبل أو بعد) بهذا الشكل بالضبط:
{
  "hasSetup": true/false,
  "tradeType": "BUY | SELL | NONE",
  "entry": <price>,
  "stopLoss": <price>,
  "takeProfit1": <price>,
  "takeProfit2": <price>,
  "takeProfit3": <price>,
  "riskPercent": 1.0,
  "rrRatio": <number>,
  "marketNarrative": "شرح احترافي للسياق المؤسسي الحالي (2-3 أسطر)",
  "setupValidity": "لماذا هذا الإعداد صالح أو غير صالح من منظور ICT",
  "riskCommentary": "تعليق على إدارة المخاطر (1% rule + R:R + SL placement)",
  "executionPlan": "خطة تنفيذ خطوة بخطوة بالعربية",
  "alternativeScenarios": ["سيناريو 1", "سيناريو 2", "سيناريو 3"],
  "confidenceAdjustment": <number between -10 and +10>,
  "finalVerdict": "BUY | SELL | WAIT",
  "notSetupReason": "إذا لم تتحقق الشروط، اكتب: لا توجد فرصة مكتملة الشروط حالياً حسب مدرسة SMC + شرح السبب"
}`,
};

// === PROMPT 2: Wyckoff Method ===
const WYCKOFF_PROMPT: PromptSpec = {
  id: "wyckoff_method",
  name: "Wyckoff Method",
  nameAr: "طريقة وايكوف",
  description: "محلل آلي خبير في مدرسة وايكوف — اكتشاف Accumulation/Distribution + Spring + JAC + LPS",
  priority: 2,
  active: true,
  systemPrompt: `أنت محلل آلي خبير في مدرسة وايكوف (Wyckoff Method).
الهدف: اكتشاف مراحل التجميع (Accumulation) أو التوزيع (Distribution) وتأكيد الدخول مع الحيتان.

زوج التداول: XAUUSD

الشروط البرمجية للدخول (نموذج التجميع — شراء):
1. تحديد النطاق الجانبي (Trading Range):
   - رصد هبوط حاد ينتهي بشمعة بيع ذروة (Selling Climax - SC) تصاحبها حجم تداول هائل (Ultra High Volume).

2. اختبار عدم وجود بائعين (Spring / Test):
   - ابحث عن كسر وهمي لسعر القاع السابق لـ SC ثم إغلاق سريع داخل النطاق، بشرط أن يكون حجم التداول (Volume) منخفضاً جداً أثناء هذا الاختراق.

3. كسر المقاومة وحجم التداول (Jump Across the Creek - JAC):
   - صعود واختراق للحد العلوي للنطاق الجانبي بحجم تداول مرتفع وصريح.

4. نقطة الدخول (Last Point of Support - LPS):
   - ادخل شراء فور عودة السعر لإعادة اختبار الحد العلوي المكسور (الذي أصبح دعماً) بحجم تداول منخفض.

5. شروط المخاطرة:
   - وقف الخسارة (SL): أسفل القاع الأخير (Spring) بـ 10 pips.
   - الهدف (TP): ضعف مسافة النطاق الجانبي بالكامل (Measured Move).

العكس ينطبق على نموذج التوزيع (بيع):
- Buying Climax (BC) بدلاً من SC
- Upthrust (UT) بدلاً من Spring
- Fall Through the Ice (FTI) بدلاً من JAC
- Last Point of Supply (LPSY) بدلاً من LPS

المطلوب:
- حلل الشارت، واذكر اسم المرحلة الحالية بناءً على وايكوف.
- إذا كانت شروط الدخول مكتملة، اعطني نقاط (الدخول، SL، TP).
- إذا لم تكتمل المرحلة، اكتب: "السوق في مرحلة [اسم المرحلة] ولم تصل إشارة الدخول بعد".

كن احترافياً، موضوعياً، واتبع منهج وايكوف بدقة. استخدم المصطلحات: Trading Range, Selling/Buying Climax, Spring, Upthrust, Jump Across the Creek, Fall Through the Ice, LPS, LPSY, Backup, Shakeout, Sign of Strength, Sign of Weakness, Effort vs Result, Cause/Effect.`,
  outputFormat: `أعطني النتيجة في صيغة JSON فقط (بدون نص إضافي قبل أو بعد) بهذا الشكل:
{
  "hasSetup": true/false,
  "phase": "Accumulation | Distribution | Markup | Markdown | Ranging | None",
  "phaseAr": "التجميع | التوزيع | الصعود | الهبوط | تذبذب | لا يوجد",
  "tradeType": "BUY | SELL | NONE",
  "entry": <price>,
  "stopLoss": <price>,
  "takeProfit1": <price>,
  "takeProfit2": <price>,
  "takeProfit3": <price>,
  "riskPercent": 1.0,
  "rrRatio": <number>,
  "marketNarrative": "شرح احترافي للمرحلة الحالية (2-3 أسطر)",
  "setupValidity": "لماذا الإعداد صالح أو غير صالح من منظور وايكوف",
  "riskCommentary": "تعليق على إدارة المخاطر (SL placement + Measured Move target)",
  "executionPlan": "خطة تنفيذ خطوة بخطوة بالعربية",
  "alternativeScenarios": ["سيناريو 1", "سيناريو 2", "سيناريو 3"],
  "confidenceAdjustment": <number between -10 and +10>,
  "finalVerdict": "BUY | SELL | WAIT",
  "notSetupReason": "إذا لم تكتمل المرحلة: السوق في مرحلة [المرحلة] ولم تصل إشارة الدخول بعد"
}`,
};

// === All registered prompts ===
export const PROMPTS: PromptSpec[] = [
  SMC_STRICT_PROMPT,
  WYCKOFF_PROMPT,
];

// === Public API ===
export function getPrompt(id: string): PromptSpec | null {
  return PROMPTS.find((p) => p.id === id && p.active) ?? null;
}

export function getActivePrompts(): PromptSpec[] {
  return PROMPTS.filter((p) => p.active).sort((a, b) => a.priority - b.priority);
}

export function getSystemPrompt(id: string): string {
  return getPrompt(id)?.systemPrompt ?? SMC_STRICT_PROMPT.systemPrompt;
}

export function getOutputFormat(id: string): string {
  return getPrompt(id)?.outputFormat ?? SMC_STRICT_PROMPT.outputFormat;
}

// === Build the full prompt (system + output format + market data) ===
export function buildFullPrompt(
  promptId: string,
  marketData: {
    currentPrice: number;
    dailyTrend?: string;
    h4Trend?: string;
    conditions?: any;
    strategy?: any;
    last10Candles?: any[];
  }
): { system: string; user: string } {
  const spec = getPrompt(promptId) ?? SMC_STRICT_PROMPT;
  const c = marketData.conditions ?? {};
  const s = marketData.strategy ?? {};
  const last10 = marketData.last10Candles ?? [];

  const user = `=== بيانات السوق الحالية ===
السعر الحالي: $${marketData.currentPrice.toFixed(2)}
الفريمات المفحوصة: Daily + 4H + 15m

${c.htfTrend ? `=== كشف الاتجاه العام ===
- Daily EMA50: $${c.htfTrend.dailyTrend?.ema50?.toFixed(2) ?? "—"} / EMA200: $${c.htfTrend.dailyTrend?.ema200?.toFixed(2) ?? "—"} / slope: ${c.htfTrend.dailyTrend?.slope ?? "—"}
- 4H EMA20: $${c.htfTrend.h4Trend?.ema20?.toFixed(2) ?? "—"} / EMA50: $${c.htfTrend.h4Trend?.ema50?.toFixed(2) ?? "—"} / slope: ${c.htfTrend.h4Trend?.slope ?? "—"}
- الاتجاه النهائي: ${c.htfTrend.direction ?? "—"}
- Status: ${c.htfTrend.passed ? "PASSED ✓" : "FAILED ✗"}` : ""}

${c.liquiditySweep ? `=== كشف سحب السيولة ===
- النوع: ${c.liquiditySweep.type ?? "none"}
- المستوى المحوم: $${c.liquiditySweep.sweptLevel?.toFixed(2) ?? "—"}
- Status: ${c.liquiditySweep.passed ? "PASSED ✓" : "FAILED ✗"}` : ""}

${c.choch ? `=== كشف CHoCH ===
- الاتجاه: ${c.choch.direction ?? "none"}
- المستوى المكسور: $${c.choch.brokenLevel?.toFixed(2) ?? "—"}
- إغلاق جسم الشمعة: ${c.choch.bodyClose ? "مؤكد" : "غير مؤكد"}
- Status: ${c.choch.passed ? "PASSED ✓" : "FAILED ✗"}` : ""}

${c.entryZone ? `=== منطقة الدخول ===
- النوع: ${c.entryZone.type ?? "none"}
- النطاق: ${c.entryZone.zone ? "$" + c.entryZone.zone.bottom.toFixed(2) + " - $" + c.entryZone.zone.top.toFixed(2) : "—"}
- عودة السعر للمنطقة: ${c.entryZone.priceReturned ? "نعم" : "لا"}
- Status: ${c.entryZone.passed ? "PASSED ✓" : "FAILED ✗"}` : ""}

${c.riskReward ? `=== نسبة العائد/المخاطرة ===
- النسبة: 1:${c.riskReward.ratio?.toFixed(2) ?? "0"} (مطلوب 1:1.3-3)
- مسافة الـ SL: $${c.riskReward.slDistance?.toFixed(2) ?? "—"}
- مسافة الـ TP: $${c.riskReward.tpDistance?.toFixed(2) ?? "—"}
- مستوى السيولة التالي: ${c.riskReward.nextLiquidityLevel ? "$" + c.riskReward.nextLiquidityLevel.toFixed(2) : "—"}
- Status: ${c.riskReward.passed ? "PASSED ✓" : "FAILED ✗"}` : ""}

${s.hasSetup ? `=== الإعداد المكتشف ===
✓ إعداد صالح! ${s.trade?.type} @ $${s.trade?.entry?.toFixed(2)} | SL $${s.trade?.stopLoss?.toFixed(2)} | TP1 $${s.trade?.takeProfit1?.toFixed(2)} | TP2 $${s.trade?.takeProfit2?.toFixed(2)} | TP3 $${s.trade?.takeProfit3?.toFixed(2)} | R:R 1:${s.trade?.rrRatio?.toFixed(2)} | Lot ${s.trade?.lotSize?.toFixed(3)} | Risk $${s.trade?.riskAmount?.toFixed(2)}` : `✗ ${s.notSetupReason ?? "لا يوجد إعداد"}`}

${last10.length > 0 ? `=== آخر 10 شمعات 15m ===
${last10.map((c) => `  ${new Date(c.time * 1000).toISOString().slice(11, 16)}: O=${c.open.toFixed(2)} H=${c.high.toFixed(2)} L=${c.low.toFixed(2)} C=${c.close.toFixed(2)}`).join("\n")}` : ""}

${spec.outputFormat}`;

  return { system: spec.systemPrompt, user };
}
