module.exports=[41494,e=>{"use strict";var t=e.i(41095);let i={id:"smc_ict_strict",name:"SMC/ICT Strict Strategy",nameAr:"استراتيجية SMC/ICT الصارمة",description:"محلل آلي متخصص في مدرسة مفاهيم الأموال الذكية (SMC/ICT) — 5 شروط صارمة",priority:1,active:!0,systemPrompt:`أنت الآن متداول آلي متخصص محترف في مدرسة مفاهيم الأموال الذكية (SMC/ICT).
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
   - نسبة المخاطرة: 0.5-1.5% من رأس المال ($5-15 على $1000).
   - نسبة العائد إلى المخاطرة (RRR): لا تقل عن 1:1.3 (الحد الأدنى) إلى 1:3 (الهدف).
   - وقف الخسارة (Stop Loss): أبعد من القاع/القمة المحلية بـ 5 pips لحماية الصفقة من الضوضاء السعرية.
   - الهدف (Take Profit): مستويات السيولة التالية (أقرب قمة/قاع رئيسي).

المطلوب منك الآن:
- إذا تحققت الشروط 100%: زودني فوراً بالتالي: (نوع الصفقة، نقطة الدخول، وقف الخسارة، أهداف جني الأرباح، ونسبة المخاطرة).
- إذا نقص شرط واحد فقط: اكتب لي الرسالة التالية بدقة: "لا توجد فرصة مكتملة الشروط حالياً حسب مدرسة SMC" ووضح السبب بأسطر قليلة.

كن احترافياً، موضوعياً، واتبع القواعد الصارمة بدون اجتهاد شخصي. استخدم مصطلحات ICT (Liquidity Sweep, CHoCH, BOS, FVG, Order Block, Premium/Discount, Smart Money, Displacement, Mitigation).`,outputFormat:`أعطني النتيجة في صيغة JSON فقط (بدون نص إضافي قبل أو بعد) بهذا الشكل بالضبط:
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
}`},r=[i,{id:"wyckoff_method",name:"Wyckoff Method",nameAr:"طريقة وايكوف",description:"محلل آلي خبير في مدرسة وايكوف — اكتشاف Accumulation/Distribution + Spring + JAC + LPS",priority:2,active:!0,systemPrompt:`أنت محلل آلي خبير في مدرسة وايكوف (Wyckoff Method).
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

كن احترافياً، موضوعياً، واتبع منهج وايكوف بدقة. استخدم المصطلحات: Trading Range, Selling/Buying Climax, Spring, Upthrust, Jump Across the Creek, Fall Through the Ice, LPS, LPSY, Backup, Shakeout, Sign of Strength, Sign of Weakness, Effort vs Result, Cause/Effect.`,outputFormat:`أعطني النتيجة في صيغة JSON فقط (بدون نص إضافي قبل أو بعد) بهذا الشكل:
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
}`}],o=null;function n(e){return e[Math.floor(Math.random()*e.length)]}async function a(e,i=3){let r;for(let o=0;o<=i;o++)try{let i=(await t.default.create()).chat.completions.create({messages:[{role:"system",content:e.system},{role:"user",content:e.user}],thinking:{type:"disabled"},temperature:.5,max_tokens:1500}),r=new Promise((e,t)=>setTimeout(()=>t(Error("AI timeout")),15e3)),o=await Promise.race([i,r]),n=o?.choices?.[0]?.message?.content;if(!n||0===n.trim().length)throw Error("Empty AI response");return n}catch(t){r=t;let e=String(t?.message||"").includes("429")||String(t?.message||"").includes("Too many");if(o<i){let t=e?2e3*Math.pow(2,o):1e3*(o+1);await new Promise(e=>setTimeout(e,t));continue}}throw r}async function s(e){if(o&&Date.now()-o.ts<6e4&&o.hasSetup===e.hasSetup&&e.currentPrice>0&&Math.abs(o.price-e.currentPrice)/e.currentPrice<.005)return o.result;try{var t;let n,s,d,c,u,l=(t={currentPrice:e.currentPrice,conditions:e.conditions,strategy:{hasSetup:e.hasSetup,trade:e.trade,notSetupReason:e.notSetupReason},last10Candles:e.visualization?.m15Candles?.slice(-10)},n=r.find(e=>"smc_ict_strict"===e.id&&e.active)??null??i,s=t.conditions??{},d=t.strategy??{},c=t.last10Candles??[],u=`=== بيانات السوق الحالية ===
السعر الحالي: $${t.currentPrice.toFixed(2)}
الفريمات المفحوصة: Daily + 4H + 15m

${s.htfTrend?`=== كشف الاتجاه العام ===
- Daily EMA50: $${s.htfTrend.dailyTrend?.ema50?.toFixed(2)??"—"} / EMA200: $${s.htfTrend.dailyTrend?.ema200?.toFixed(2)??"—"} / slope: ${s.htfTrend.dailyTrend?.slope??"—"}
- 4H EMA20: $${s.htfTrend.h4Trend?.ema20?.toFixed(2)??"—"} / EMA50: $${s.htfTrend.h4Trend?.ema50?.toFixed(2)??"—"} / slope: ${s.htfTrend.h4Trend?.slope??"—"}
- الاتجاه النهائي: ${s.htfTrend.direction??"—"}
- Status: ${s.htfTrend.passed?"PASSED ✓":"FAILED ✗"}`:""}

${s.liquiditySweep?`=== كشف سحب السيولة ===
- النوع: ${s.liquiditySweep.type??"none"}
- المستوى المحوم: $${s.liquiditySweep.sweptLevel?.toFixed(2)??"—"}
- Status: ${s.liquiditySweep.passed?"PASSED ✓":"FAILED ✗"}`:""}

${s.choch?`=== كشف CHoCH ===
- الاتجاه: ${s.choch.direction??"none"}
- المستوى المكسور: $${s.choch.brokenLevel?.toFixed(2)??"—"}
- إغلاق جسم الشمعة: ${s.choch.bodyClose?"مؤكد":"غير مؤكد"}
- Status: ${s.choch.passed?"PASSED ✓":"FAILED ✗"}`:""}

${s.entryZone?`=== منطقة الدخول ===
- النوع: ${s.entryZone.type??"none"}
- النطاق: ${s.entryZone.zone?"$"+s.entryZone.zone.bottom.toFixed(2)+" - $"+s.entryZone.zone.top.toFixed(2):"—"}
- عودة السعر للمنطقة: ${s.entryZone.priceReturned?"نعم":"لا"}
- Status: ${s.entryZone.passed?"PASSED ✓":"FAILED ✗"}`:""}

${s.riskReward?`=== نسبة العائد/المخاطرة ===
- النسبة: 1:${s.riskReward.ratio?.toFixed(2)??"0"} (مطلوب 1:1.3-3)
- مسافة الـ SL: $${s.riskReward.slDistance?.toFixed(2)??"—"}
- مسافة الـ TP: $${s.riskReward.tpDistance?.toFixed(2)??"—"}
- مستوى السيولة التالي: ${s.riskReward.nextLiquidityLevel?"$"+s.riskReward.nextLiquidityLevel.toFixed(2):"—"}
- Status: ${s.riskReward.passed?"PASSED ✓":"FAILED ✗"}`:""}

${d.hasSetup?`=== الإعداد المكتشف ===
✓ إعداد صالح! ${d.trade?.type} @ $${d.trade?.entry?.toFixed(2)} | SL $${d.trade?.stopLoss?.toFixed(2)} | TP1 $${d.trade?.takeProfit1?.toFixed(2)} | TP2 $${d.trade?.takeProfit2?.toFixed(2)} | TP3 $${d.trade?.takeProfit3?.toFixed(2)} | R:R 1:${d.trade?.rrRatio?.toFixed(2)} | Lot ${d.trade?.lotSize?.toFixed(3)} | Risk $${d.trade?.riskAmount?.toFixed(2)}`:`✗ ${d.notSetupReason??"لا يوجد إعداد"}`}

${c.length>0?`=== آخر 10 شمعات 15m ===
${c.map(e=>`  ${new Date(1e3*e.time).toISOString().slice(11,16)}: O=${e.open.toFixed(2)} H=${e.high.toFixed(2)} L=${e.low.toFixed(2)} C=${e.close.toFixed(2)}`).join("\n")}`:""}

${n.outputFormat}`,{system:n.systemPrompt,user:u}),p=await a(l),S=p.indexOf("{"),$=p.lastIndexOf("}");if(-1===S||-1===$)throw Error("No JSON in response");let m=p.slice(S,$+1),y=JSON.parse(m),h={marketNarrative:String(y.marketNarrative??"").trim(),setupValidity:String(y.setupValidity??"").trim(),riskCommentary:String(y.riskCommentary??"").trim(),executionPlan:String(y.executionPlan??"").trim(),alternativeScenarios:Array.isArray(y.alternativeScenarios)?y.alternativeScenarios.map(e=>String(e).trim()).filter(Boolean).slice(0,3):[],confidenceAdjustment:Number(y.confidenceAdjustment)||0,finalVerdict:["BUY","SELL","WAIT"].includes(String(y.finalVerdict).toUpperCase())?String(y.finalVerdict).toUpperCase():e.hasSetup?e.trade.type:"WAIT",modelUsed:"GLM-4-Plus",timestamp:Date.now()};return o={result:h,ts:Date.now(),hasSetup:e.hasSetup,price:e.currentPrice},h}catch(i){let t=function(e){let t=e.conditions,i=t.htfTrend.direction,r="bullish"===i?"صاعد":"bearish"===i?"هابط":"متذبذب";if(e.hasSetup&&e.trade){let i=e.trade,o="BUY"===i.type,a=Math.abs(i.entry-i.stopLoss),s=Math.abs(i.takeProfit3-i.entry),d=[`السوق يعرض ديناميكية ${r} على الفريمات الكبرى مع تجمّع سيولة واضح. نمط Smart Money تكرر بظهور سحب سيولة ${"sell-side"===t.liquiditySweep.type?"بيعية":"شرائية"} متبوع بكسر هيكل ${"up"===t.choch.direction?"صاعد":"هابط"} على فريم 15 دقيقة. الإغلاق بجسم شمعة قوي يعكس دخول المال المؤسسي.`,`تحليل السيولة يشير إلى أن المال الذكي أكمل دورة سحب على فريم 15 دقيقة، مع تشكيل ${t.entryZone.type} ناتج عن الإزاحة السعرية. الهيكل العام ${r} على الفريمات الكبرى يدعم استمرار الزخم نحو أهداف السيولة التالية.`,`السياق المؤسسي الحالي يكشف اكتمال نموذج SMC الكلاسيكي: سحب سيولة، كسر هيكل (CHoCH)، ومنطقة ${t.entryZone.type}. السعر يعكس من منطقة Premium/Discount مع تأكيد جسم الشمعة، مما يشير إلى دخول مشترين/بائعين مؤسسيين.`],c=[`الإعداد صالح 100% بناءً على معايير ICT الصارمة: سحب ${"sell-side"===t.liquiditySweep.type?"Sell-side":"Buy-side"} Liquidity + ${"up"===t.choch.direction?"Bullish":"Bearish"} CHoCH مع إغلاق جسم شمعة قوي + ${t.entryZone.type} غير مُتعادل + عودة السعر للمنطقة. النسبة 1:${i.rrRatio.toFixed(2)} تتجاوز الحد الأدنى المطلوب 1:3.`,`الفرصة مصنّفة "A+ Setup" وفق معايير المال الذكي: تكامل 5 شروط (HTF Alignment + Liquidity Sweep + CHoCH + FVG/OB + R:R) ضمن تسلسل منطقي. الإغلاق بجسم الشمعة (${t.choch.bodyClose?"مؤكد":"غير مؤكد"}) يمنح الصفقة مصداقية مؤسسية عالية.`,`الإعداد يعكس نمط Reversal نموذجي على فريم 15 دقيقة: ${t.entryZone.type} كمنطقة عودة سعرية + ${"up"===t.choch.direction?"CHoCH صاعد":"CHoCH هابط"} كتأكيد + السيولة المسحوبة كمحفّز للحركة. هذا التركيب إحصائياً يحقق نسب نجاح عالية عند الـ backtesting.`],u=[`إدارة المخاطر صارمة: مخاطرة ${i.riskPercent}% = $${i.riskAmount.toFixed(2)} على حساب $1000. SL موضوع على بُعد 5 pips من القاع المحلي ($${i.stopLoss.toFixed(2)}) لحماية الصفقة من الضوضاء السعرية. R:R 1:${i.rrRatio.toFixed(2)} يحقق الحد الأدنى المؤسسي 1:3، مع هدف نهائي على مسافة $${s.toFixed(2)}.`,`الوقاية风险管理 تتبع نموذج 1% Rule: حد أقصى للخسارة $${i.riskAmount.toFixed(2)} على لوت ${i.lotSize.toFixed(3)}، مع SL موضوع على مسافة $${a.toFixed(2)} فقط — تحديد دقيق للـ "Invalidation Point". الأهداف متدرجة (TP1/TP2/TP3) لتحقيق توزيع المخاطر وتعظيم العائد عبر Partial Closing.`,`الإطار الزمني للصفقة على فريم 15 دقيقة يفرض وقف محكم (${a.toFixed(2)}$) مع تدرج الأهداف. نسبة المخاطرة 1% تحمي رأس المال من التذبذب العرضي، بينما R:R 1:${i.rrRatio.toFixed(2)} يحقق ميزة إحصائية (Edge) إيجابية طالما نسبة الفوز > 25%.`],l=[`1) انتظر عودة السعر لمسة ${t.entryZone.type} ($${t.entryZone.zone?.bottom.toFixed(2)}-$${t.entryZone.zone?.top.toFixed(2)}).
2) ضع أمر ${o?"Buy Stop/Sell Limit":"Sell Stop/Buy Limit"} عند $${i.entry.toFixed(2)}.
3) SL ثابت عند $${i.stopLoss.toFixed(2)} (5 pips بعد القمة/القاع المحلي).
4) TP1 عند $${i.takeProfit1.toFixed(2)} — إغلاق 30% من الصفقة + نقل SL لـ Break-Even.
5) TP2 عند $${i.takeProfit2.toFixed(2)} — إغلاق 30% + تريلينغ لـ SL خلف السعر.
6) TP3 عند $${i.takeProfit3.toFixed(2)} — إغلاق 40% المتبقية عند الوصول لمستوى السيولة التالي.`,`استراتيجية التنفيذ المؤسسية:
• الأمر: ${i.type} على $${i.entry.toFixed(2)}
• الإدخال: عند لمس ${t.entryZone.type} + تأكيد رفض الشمعة
• الحماية: SL $${i.stopLoss.toFixed(2)} (لا تحريك قبل TP1)
• توزيع الإغلاق: 30%/30%/40% على TP1/TP2/TP3
• التحول: بعد TP1، نقل SL لـ Break-Even + تريلينغ على كل candle جديد`],p=[[`لو كسر السعر $${i.stopLoss.toFixed(2)} قبل الدخول، النمط يفشل — انتظر إعداد جديد.`,`لو وصل TP1 بسرعة (< 30 دقيقة)، يمكن تحريك SL لـ BE فوراً وتعظيم R:R.`,`لو لم يلمس ${t.entryZone.type} خلال 4 ساعات، قوة النمط تضعف — التمسك بالانتظار.`],[`سيناريو بديل 1: استمرار السحب لـ سيولة أبعد قبل الارتداد. راقب الـ Order Block التالي.`,`سيناريو بديل 2: اختراق TP3 بزخم قوي — مراقبة لامتداد ${t.entryZone.type} على فريم أعلى.`,`سيناريو بديل 3: فشل CHoCH إذا كسر السعر القمة/القاع السابق — خروج فوري.`]];return{marketNarrative:n(d),setupValidity:n(c),riskCommentary:n(u),executionPlan:n(l),alternativeScenarios:n(p),confidenceAdjustment:0,finalVerdict:i.type,modelUsed:"rule-based",timestamp:Date.now()}}let o=e.notSetupReason??"",a=[`الإعداد غير مكتمل — يجب انتظار اكتمال جميع الشروط الخمسة قبل الدخول. التداول بنمط ناقص يكسر ميزة الـ Edge الإحصائي ويعرّض الحساب لمخاطر غير محسوبة.`,`الشرط المفقود يجعل الإعداد غير قابل للتنفيذ وفق المنهج المؤسسي. التزام صارم بالشروط هو ما يميّز المتداول المحترف عن المضارب — ننتظر الفرصة المكتملة.`,`عدم اكتمال الشروط يرفض الإعداد آلياً. ICT يتطلب تكامل 5 عناصر (HTF + Sweep + CHoCH + Zone + R:R) لتكوين نموذج قابل للتنفيذ — أي نقص يعني WAIT.`],s=[`بما أنه لا توجد فرصة، لا توجد مخاطرة. القاعدة الذهبية: "الصفقة الرابحة هي التي لا دخلت فيها". حماية رأس المال من الصفقات الناقصة هو جوهر إدارة المخاطر المؤسسية.`,`عدم الدخول في صفقة بدون إعداد مكتمل = حماية الـ 1% المخصص للمخاطرة من الضياع. متداولو ICT المحترفون يقضون 80% من وقتهم في الانتظار، و 20% فقط في التنفيذ.`,`الانتظار استراتيجية بحد ذاتها. الـ 1% Risk Rule يحميك من "FOMO Trades" الناتجة عن أنماط ناقصة. السوق سيعطي فرصاً كاملة لاحقاً — لا حاجة لإجبار صفقة.`],d=[`1) راقب شارت 15 دقيقة بشكل مستمر.
2) انتظر سحب سيولة واضح (wick beyond swing low/high).
3) انتظر كسر هيكل بجسم شمعة (لا wick فقط).
4) انتظر عودة السعر لـ FVG أو OB.
5) تحقق من R:R ≥ 1:3 قبل التنفيذ.
6) تنفيذ فقط عند اكتمال جميع الشروط.`,`خطة المراقبة:
• راقب جلسات London (07:00 UTC) و NY (12:00 UTC) — أعلى احتمال للسحب
• حدد المستويات الرئيسية على HTF مسبقاً
• انتظر النمط الكامل قبل الدخول — لا تخمن
• استخدم التنبيهات السعرية على مستويات السيولة`],c=[[`راقب تشكل Order Block جديد على 15 دقيقة بعد حركة قوية.`,`انتظر فتح جلسة London أو NY لزيادة احتمال السحب.`,`لو تحسنت ظروف HTF (Daily + 4H توافق)، قد يتشكل إعداد صالح قريباً.`],[`راقب اختراقات/كسور على فريمات 1H و 4H لتوقع اتجاه HTF.`,`تابع الأخبار الاقتصادية (FOMC, NFP, CPI) التي قد تخلق سيولة جديدة.`,`عند اكتمال أي شرط جديد، التحليل سيتحدث تلقائياً.`]];return{marketNarrative:n([`السوق حالياً يفتقر للإعداد المؤسسي المكتمل. ${o}. هذا يدل على أن المال الذكي لم يكمل بعد دورة السحب/كسر الهيكل، مما يتطلب صبراً إضافياً قبل الدخول.`,`تحليل Smart Money يكشف عدم اكتمال النمط الكلاسيكي على فريم 15 دقيقة. ${o}. المنتظر راقب تشكل سحب سيولة جديد قبل النظر في أي دخول، لأن الدخول بنمط ناقص = مخاطرة بدون ميزة إحصائية.`,`السياق الحالي لا يوفر فرصة A+ وفق معايير ICT. ${o}. الاستراتيجية الصارمة ترفض الإجبار على صفقة بدون اكتمال الشروط الخمسة، والصبر هنا هو نفسه الإستراتيجية.`]),setupValidity:n(a),riskCommentary:n(s),executionPlan:n(d),alternativeScenarios:n(c),confidenceAdjustment:0,finalVerdict:"WAIT",modelUsed:"rule-based",timestamp:Date.now()}}(e);return o={result:t,ts:Date.now(),hasSetup:e.hasSetup,price:e.currentPrice},t}}e.s(["generateSMCStrictAIAnalysis",()=>s],41494)}];

//# sourceMappingURL=src_lib_smc-strict-ai_ts_9ee72c84._.js.map