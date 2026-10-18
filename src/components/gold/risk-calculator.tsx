"use client";

import { useState } from "react";
import { Calculator, TrendingUp, Shield, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CONTRACT_SIZE = 100; // 1 lot = 100 oz

export default function RiskCalculator({ currentPrice }: { currentPrice: number }) {
  const [accountBalance, setAccountBalance] = useState("10000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [entry, setEntry] = useState(currentPrice.toFixed(2));
  const [stopLoss, setStopLoss] = useState((currentPrice * 0.997).toFixed(2));
  const [takeProfit, setTakeProfit] = useState((currentPrice * 1.006).toFixed(2));

  const balance = parseFloat(accountBalance) || 0;
  const riskPct = parseFloat(riskPercent) || 0;
  const entryPrice = parseFloat(entry) || 0;
  const slPrice = parseFloat(stopLoss) || 0;
  const tpPrice = parseFloat(takeProfit) || 0;

  const riskAmount = (balance * riskPct) / 100;
  const slDistance = Math.abs(entryPrice - slPrice);
  const tpDistance = Math.abs(tpPrice - entryPrice);
  const pipValuePerLot = 1; // $1 per 0.01 move per 0.01 lot
  const recommendedLots =
    slDistance > 0 ? riskAmount / (slDistance * CONTRACT_SIZE * pipValuePerLot / 100) : 0;
  const recommendedLotsCapped = Math.min(recommendedLots, 10);
  const positionValue = recommendedLotsCapped * CONTRACT_SIZE * entryPrice;
  const rrRatio = slDistance > 0 ? tpDistance / slDistance : 0;
  const potentialLoss = riskAmount;
  const potentialProfit = rrRatio * riskAmount;

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h2 className="section-heading">
          <Calculator className="w-4 h-4 section-heading-icon" />
          حاسبة المخاطر وإدارة الصفقات
        </h2>
        <span className="section-subtitle">Position Sizing</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div>
          <Label className="stat-label block">رصيد الحساب ($)</Label>
          <Input
            type="number"
            value={accountBalance}
            onChange={(e) => setAccountBalance(e.target.value)}
            className="tabular-nums ltr-nums bg-secondary border-border h-9"
          />
        </div>
        <div>
          <Label className="stat-label block">نسبة المخاطرة (%)</Label>
          <Select value={riskPercent} onValueChange={setRiskPercent}>
            <SelectTrigger className="bg-secondary border-border h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5% — متحفظ</SelectItem>
              <SelectItem value="1">1% — مقترح</SelectItem>
              <SelectItem value="2">2% — معتدل</SelectItem>
              <SelectItem value="3">3% — جريء</SelectItem>
              <SelectItem value="5">5% — مخاطرة عالية</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="stat-label block">سعر الدخول</Label>
          <Input
            type="number"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            step="0.01"
            className="tabular-nums ltr-nums bg-secondary border-border h-9"
          />
        </div>
        <div>
          <Label className="stat-label block flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" /> وقف الخسارة
          </Label>
          <Input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            step="0.01"
            className="tabular-nums ltr-nums bg-secondary border-border h-9"
          />
        </div>
      </div>

      <div className="mb-3">
        <Label className="stat-label block flex items-center gap-1">
          <TrendingUp className="w-2.5 h-2.5" /> هدف الربح (TP)
        </Label>
        <Input
          type="number"
          value={takeProfit}
          onChange={(e) => setTakeProfit(e.target.value)}
          step="0.01"
          className="tabular-nums ltr-nums bg-secondary border-border h-9"
        />
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div className="stat-box" style={{ borderColor: "rgba(200,160,80,0.3)" }}>
          <div className="stat-label">حجم العقد الموصى به</div>
          <div className="stat-value text-gold tabular-nums ltr-nums">
            {recommendedLotsCapped.toFixed(2)} لوت
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">المبلغ المخاطر به</div>
          <div className="stat-value text-bear tabular-nums ltr-nums">
            ${potentialLoss.toFixed(2)}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">الربح المتوقع</div>
          <div className="stat-value text-bull tabular-nums ltr-nums">
            +${potentialProfit.toFixed(2)}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">المخاطرة/العائد</div>
          <div className="stat-value text-info tabular-nums ltr-nums">
            1:{rrRatio.toFixed(2)}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">قيمة الصفقة</div>
          <div className="stat-value tabular-nums ltr-nums">
            ${positionValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">مسافة وقف الخسارة</div>
          <div className="stat-value text-bear tabular-nums ltr-nums">
            {slDistance.toFixed(2)} ({(slDistance * 100).toFixed(0)} pips)
          </div>
        </div>
      </div>

      {rrRatio < 2 && (
        <div className="mt-3 px-3 py-2 rounded bg-warning/10 border border-warning/30 flex items-center gap-2 text-[11px] text-warning">
          <AlertTriangle className="w-3.5 h-3.5" />
          تحذير: نسبة المخاطرة/عائد أقل من 1:2 — لا يُنصح بهذه الصفقة
        </div>
      )}
      {rrRatio >= 3 && (
        <div className="mt-3 px-3 py-2 rounded bg-bull/10 border border-bull/30 flex items-center gap-2 text-[11px] text-bull">
          <TrendingUp className="w-3.5 h-3.5" />
          ممتاز: نسبة عائد عالية — صفقة مقترحة
        </div>
      )}
    </div>
  );
}
