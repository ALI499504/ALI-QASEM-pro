"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "ar" | "en";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
}

const I18nContext = createContext<I18nContextType>({
  lang: "ar",
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string) => key,
  dir: "rtl",
});

// Translation dictionary
const translations: Record<string, { ar: string; en: string }> = {
  // Header
  "app.title": { ar: "M.ROBOT", en: "M.ROBOT" },
  "app.subtitle": { ar: "منصة تداول الذهب بالذكاء الاصطناعي", en: "AI-Powered Gold Trading Platform" },
  "app.version": { ar: "إصدار 2026", en: "Version 2026" },
  "header.live_price": { ar: "سعر الذهب اللحظي", en: "Live Gold Price" },
  "header.last_update": { ar: "آخر تحديث", en: "Last update" },
  "header.refresh": { ar: "تحديث", en: "Refresh" },
  "header.settings": { ar: "إعدادات", en: "Settings" },
  "header.notifications": { ar: "التنبيهات", en: "Alerts" },
  "header.muted": { ar: "مكتوم", en: "Muted" },
  "header.market_open": { ar: "السوق مفتوح", en: "Market Open" },
  "header.broker": { ar: "الوسيط", en: "Broker" },
  "header.connect": { ar: "اتصال", en: "Connect" },
  "header.connected": { ar: "متصل", en: "Connected" },
  "header.disconnected": { ar: "غير متصل", en: "Disconnected" },

  // Sections
  "section.account_summary": { ar: "ملخص الحساب", en: "Account Summary" },
  "section.consensus": { ar: "إجماع الوكلاء الأذكياء", en: "AI Agents Consensus" },
  "section.live_price": { ar: "سعر الذهب اللحظي", en: "Live Gold Price" },
  "section.trade_plan": { ar: "خطة تداول اليوم", en: "Daily Trade Plan" },
  "section.agent_tracker": { ar: "متتبع أداء الوكلاء", en: "Agent Performance Tracker" },
  "section.neural_board": { ar: "لوحة القرار العصبي", en: "Neural Decision Board" },
  "section.multi_timeframe": { ar: "تحليل متعدد الأطر الزمنية", en: "Multi-Timeframe Analysis" },
  "section.risk_calc": { ar: "حاسبة المخاطر", en: "Risk Calculator" },
  "section.trading_sessions": { ar: "جلسات التداول", en: "Trading Sessions" },
  "section.chart": { ar: "الرسم البياني اللحظي", en: "Live Chart" },
  "section.candle_patterns": { ar: "كشف الأنماط الشموعية", en: "Candlestick Patterns" },
  "section.smc": { ar: "مفاهيم المال الذكي", en: "Smart Money Concepts" },
  "section.fibonacci": { ar: "مستويات فيبوناتشي", en: "Fibonacci Levels" },
  "section.session_stats": { ar: "إحصائيات الجلسات", en: "Session Statistics" },
  "section.trading_panel": { ar: "لوحة التداول المباشر", en: "Live Trading Panel" },
  "section.multi_agent": { ar: "نظام الوكلاء الأذكياء", en: "Multi-Agent System" },
  "section.indicators": { ar: "المؤشرات الفنية المتقدمة", en: "Technical Indicators" },
  "section.heatmap": { ar: "مصفوفة الإشارات", en: "Signal Heatmap" },
  "section.correlation": { ar: "مصفوفة الارتباط", en: "Correlation Matrix" },
  "section.backtest": { ar: "محرك Backtest", en: "Backtest Engine" },
  "section.equity_curve": { ar: "منحنى الملكية", en: "Equity Curve" },
  "section.performance": { ar: "مؤشرات الأداء", en: "Performance Metrics" },
  "section.economic_calendar": { ar: "التقويم الاقتصادي", en: "Economic Calendar" },
  "section.sentiment": { ar: "مقياس المشاعر السوقية", en: "Market Sentiment" },
  "section.order_book": { ar: "دفتر الطلبات", en: "Order Book" },
  "section.trade_flow": { ar: "تدفق الصفقات", en: "Trade Flow" },
  "section.news": { ar: "أخبار الذهب", en: "Gold News" },
  "section.watchlist": { ar: "قائمة المتابعة", en: "Watchlist" },
  "section.signals_history": { ar: "سجل الإشارات", en: "Signals History" },

  // Trading
  "trade.buy": { ar: "شراء", en: "Buy" },
  "trade.sell": { ar: "بيع", en: "Sell" },
  "trade.hold": { ar: "انتظار", en: "Hold" },
  "trade.strong_buy": { ar: "شراء قوي", en: "Strong Buy" },
  "trade.strong_sell": { ar: "بيع قوي", en: "Strong Sell" },
  "trade.execute": { ar: "تنفيذ", en: "Execute" },
  "trade.lot_size": { ar: "حجم العقد", en: "Lot Size" },
  "trade.leverage": { ar: "الرافعة المالية", en: "Leverage" },
  "trade.stop_loss": { ar: "وقف الخسارة", en: "Stop Loss" },
  "trade.take_profit": { ar: "أخذ الربح", en: "Take Profit" },
  "trade.entry": { ar: "الدخول", en: "Entry" },
  "trade.order_type": { ar: "نوع الأمر", en: "Order Type" },
  "trade.market": { ar: "سوقي", en: "Market" },
  "trade.limit": { ar: "محدد", en: "Limit" },
  "trade.stop": { ar: "إيقاف", en: "Stop" },
  "trade.oco": { ar: "OCO (واحد يلغي الآخر)", en: "OCO (One-Cancels-Other)" },
  "trade.trailing": { ar: "متتبع", en: "Trailing" },
  "trade.positions": { ar: "الصفقات المفتوحة", en: "Open Positions" },
  "trade.close": { ar: "إغلاق", en: "Close" },
  "trade.balance": { ar: "الرصيد", en: "Balance" },
  "trade.equity": { ar: "الملكية", en: "Equity" },
  "trade.margin_used": { ar: "الهامش المستخدم", en: "Used Margin" },
  "trade.free_margin": { ar: "الهامر المتاح", en: "Free Margin" },
  "trade.margin_level": { ar: "مستوى الهامش", en: "Margin Level" },
  "trade.floating_pnl": { ar: "الربح/الخسارة العائمة", en: "Floating P/L" },

  // Drawing tools
  "draw.tools": { ar: "أدوات الرسم", en: "Drawing Tools" },
  "draw.trendline": { ar: "خط اتجاه", en: "Trend Line" },
  "draw.horizontal": { ar: "خط أفقي", en: "Horizontal Line" },
  "draw.rectangle": { ar: "مستطيل", en: "Rectangle" },
  "draw.clear": { ar: "مسح الكل", en: "Clear All" },
  "draw.support": { ar: "دعم", en: "Support" },
  "draw.resistance": { ar: "مقاومة", en: "Resistance" },

  // Common
  "common.live": { ar: "مباشر", en: "Live" },
  "common.loading": { ar: "جاري التحميل...", en: "Loading..." },
  "common.confidence": { ar: "الثقة", en: "Confidence" },
  "common.agreement": { ar: "التوافق", en: "Agreement" },
  "common.USD": { ar: "دولار أمريكي للأونصة", en: "USD per ounce" },
  "common.today_change": { ar: "تغير اليوم", en: "Today's Change" },
  "common.high": { ar: "أعلى", en: "High" },
  "common.low": { ar: "أدنى", en: "Low" },
  "common.open": { ar: "افتتاح", en: "Open" },

  // Risk warning
  "risk.warning": {
    ar: "تداول الفوركس والمعادن ينطوي على مخاطر عالية قد تؤدي إلى خسارة كامل رأس المال. هذه المنصة لأغراض تعليمية واستشارية فقط ولا تُعد نصيحة استثمارية.",
    en: "Trading forex and metals involves high risk that may result in total capital loss. This platform is for educational and advisory purposes only and does not constitute investment advice."
  },
  "risk.banner_title": { ar: "تنبيه مخاطر:", en: "Risk Warning:" },
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar");

  // Load saved language from localStorage
  useEffect(() => {
    const saved = (typeof window !== "undefined" ? localStorage.getItem("lang") : null) as Language | null;
    if (saved === "ar" || saved === "en") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(saved);
    }
  }, []);

  // Update document direction and lang attribute
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("lang", newLang);
    }
  };

  const toggleLang = () => setLang(lang === "ar" ? "en" : "ar");

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] ?? entry.ar ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
