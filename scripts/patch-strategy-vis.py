#!/usr/bin/env python3
"""Patch smc-strict-strategy.ts to add visualization data to all return statements."""

PATH = "/home/z/my-project/src/lib/smc-strict-strategy.ts"
with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add helper function before the main function
helper = """// === Build visualization data for the chart ===
function buildVisualization(
  m15: Candle[],
  conditions: SMCStrictConditions,
  trade?: { entry: number; stopLoss: number; takeProfit1: number; takeProfit2: number; takeProfit3: number }
): SMCStrictResult["visualization"] {
  const last50 = m15.slice(-50);
  const dir = conditions.htfTrend.direction;
  const htfLabel = "Daily " + (conditions.htfTrend.dailyTrend.slope === "up" ? "UP" : conditions.htfTrend.dailyTrend.slope === "down" ? "DN" : "->") + " | 4H " + (conditions.htfTrend.h4Trend.slope === "up" ? "UP" : conditions.htfTrend.h4Trend.slope === "down" ? "DN" : "->");
  return {
    m15Candles: last50,
    htfDirection: dir,
    htfLabel,
    annotations: {
      sweepLevel: conditions.liquiditySweep.sweptLevel || undefined,
      sweepType: conditions.liquiditySweep.type || undefined,
      chochLevel: conditions.choch.brokenLevel || undefined,
      chochDirection: conditions.choch.direction || undefined,
      entryZoneTop: conditions.entryZone.zone?.top,
      entryZoneBottom: conditions.entryZone.zone?.bottom,
      entryZoneType: conditions.entryZone.type || undefined,
      entry: trade?.entry,
      stopLoss: trade?.stopLoss,
      takeProfit1: trade?.takeProfit1,
      takeProfit2: trade?.takeProfit2,
      takeProfit3: trade?.takeProfit3,
      nextLiquidityLevel: conditions.riskReward.nextLiquidityLevel || undefined,
    },
  };
}

"""

MAIN_FUNC = "export async function computeSMCStrictSignal"
idx = content.find(MAIN_FUNC)
if idx == -1:
    print("MAIN_FUNC not found")
else:
    content = content[:idx] + helper + content[idx:]
    print(f"Inserted helper at index {idx}")

# 2. Patch all return statements to include visualization field
replacements = [
    # HTF fail
    (
        """      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      timestamp,
    };
  }

  const direction = conditions.htfTrend.direction;""",
        """      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      visualization: buildVisualization(m15, conditions),
      timestamp,
    };
  }

  const direction = conditions.htfTrend.direction;""",
    ),
    # Sweep fail
    (
        """      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      timestamp,
    };
  }

  // === Condition 3: CHoCH on 15m""",
        """      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      visualization: buildVisualization(m15, conditions),
      timestamp,
    };
  }

  // === Condition 3: CHoCH on 15m""",
    ),
    # CHoCH fail
    (
        """      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      timestamp,
    };
  }

  // === Condition 4: FVG or OB""",
        """      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      visualization: buildVisualization(m15, conditions),
      timestamp,
    };
  }

  // === Condition 4: FVG or OB""",
    ),
    # Zone fail
    (
        """      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      timestamp,
    };
  }

  // === Condition 5: R:R >= 1:3""",
        """      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      visualization: buildVisualization(m15, conditions),
      timestamp,
    };
  }

  // === Condition 5: R:R >= 1:3""",
    ),
    # RR fail
    (
        """      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      timestamp,
    };
  }

  // === ALL 5 CONDITIONS MET""",
        """      conditions,
      currentPrice,
      dailyCandlesCount: daily.length,
      h4CandlesCount: h4.length,
      m15CandlesCount: m15.length,
      visualization: buildVisualization(m15, conditions),
      timestamp,
    };
  }

  // === ALL 5 CONDITIONS MET""",
    ),
    # Success return
    (
        """  return {
    hasSetup: true,
    trade,
    conditions,
    currentPrice,
    dailyCandlesCount: daily.length,
    h4CandlesCount: h4.length,
    m15CandlesCount: m15.length,
    timestamp,
  };
}""",
        """  return {
    hasSetup: true,
    trade,
    conditions,
    currentPrice,
    dailyCandlesCount: daily.length,
    h4CandlesCount: h4.length,
    m15CandlesCount: m15.length,
    visualization: buildVisualization(m15, conditions, trade),
    timestamp,
  };
}""",
    ),
]

patched_count = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        patched_count += 1
        print(f"  patched: {old[:60].strip()[:50]}...")
    else:
        print(f"  NOT FOUND: {old[:60].strip()[:50]}...")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)
print(f"\nPatched {patched_count}/{len(replacements)} returns. File size: {len(content)} chars")
