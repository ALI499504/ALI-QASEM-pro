"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export default function RiskWarningBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-l from-amber-950/40 via-amber-900/30 to-amber-950/40 border-b border-amber-500/30">
      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 py-2 flex items-center gap-2 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span className="text-amber-100/90 flex-1">
          <span className="font-bold text-amber-300 ml-1">تنبيه مخاطر:</span>
          تداول الفوركس والمعادن ينطوي على مخاطر عالية قد تؤدي إلى خسارة كامل رأس المال. هذه المنصة لأغراض تعليمية واستشارية فقط ولا تُعد نصيحة استثمارية.
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400/70 hover:text-amber-300 transition flex-shrink-0"
          aria-label="إغلاق"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
