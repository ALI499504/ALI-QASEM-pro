import { NextResponse } from "next/server";
import {
  iMA, iDEMA, iTEMA, iFrAMA, iAMA, iVIDyA,
  iBands, iEnvelopes, iIchimoku, iSAR, iStdDev,
  iADX, iADXWilder, iAlligator, iGator,
  iRSI, iMACD, iStochastic, iCCI, iMomentum,
  iRVI, iDeMarker, iWPR, iOsMA, iTriX,
  iBearsPower, iBullsPower, iForce, iATR, iChaikin,
  iOBV, iMFI, iVolumes, iAD, iBWMFI,
  iAC, iAO, iFractals,
  CopyBuffer, IndicatorRelease,
} from "@/lib/mql5";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

// POST /api/mql5/indicator
// Body: { name: "iMA", symbol: "XAUUSD", timeframe: "15m", params: [14, 0, 1, 1], bufferIndex: 0, count: 10 }
// Returns: { handle, bufferValues, bufferNames }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, symbol = "XAUUSD", timeframe = "15m", params = [], bufferIndex = 0, count = 20 } = body;

    // Dispatch to the appropriate indicator
    let handle: number | null = null;
    switch (name) {
      case "iMA":
        handle = await iMA(symbol, timeframe, params[0] ?? 14, params[1] ?? 0, params[2] ?? 1, params[3] ?? 1);
        break;
      case "iDEMA":
        handle = await iDEMA(symbol, timeframe, params[0] ?? 14, params[1] ?? 0, params[2] ?? 1);
        break;
      case "iTEMA":
        handle = await iTEMA(symbol, timeframe, params[0] ?? 14, params[1] ?? 0, params[2] ?? 1);
        break;
      case "iFrAMA":
        handle = await iFrAMA(symbol, timeframe, params[0] ?? 14, params[1] ?? 0, params[2] ?? 1);
        break;
      case "iAMA":
        handle = await iAMA(symbol, timeframe, params[0] ?? 14, params[1] ?? 2, params[2] ?? 30, params[3] ?? 0, params[4] ?? 1);
        break;
      case "iVIDyA":
        handle = await iVIDyA(symbol, timeframe, params[0] ?? 9, params[1] ?? 12, params[2] ?? 0, params[3] ?? 1);
        break;
      case "iBands":
        handle = await iBands(symbol, timeframe, params[0] ?? 20, params[1] ?? 0, params[2] ?? 2, params[3] ?? 1);
        break;
      case "iEnvelopes":
        handle = await iEnvelopes(symbol, timeframe, params[0] ?? 14, params[1] ?? 0, params[2] ?? 0, params[3] ?? 0.1, params[4] ?? 1);
        break;
      case "iIchimoku":
        handle = await iIchimoku(symbol, timeframe, params[0] ?? 9, params[1] ?? 26, params[2] ?? 52);
        break;
      case "iSAR":
        handle = await iSAR(symbol, timeframe, params[0] ?? 0.02, params[1] ?? 0.2);
        break;
      case "iStdDev":
        handle = await iStdDev(symbol, timeframe, params[0] ?? 20, params[1] ?? 0, params[2] ?? 0, params[3] ?? 1);
        break;
      case "iADX":
        handle = await iADX(symbol, timeframe, params[0] ?? 14);
        break;
      case "iADXWilder":
        handle = await iADXWilder(symbol, timeframe, params[0] ?? 14);
        break;
      case "iAlligator":
        handle = await iAlligator(symbol, timeframe, params[0] ?? 13, params[1] ?? 8, params[2] ?? 8, params[3] ?? 5, params[4] ?? 5, params[5] ?? 3, params[6] ?? 2, params[7] ?? 1, params[8] ?? 5);
        break;
      case "iGator":
        handle = await iGator(symbol, timeframe, params[0] ?? 13, params[1] ?? 8, params[2] ?? 8, params[3] ?? 5, params[4] ?? 5, params[5] ?? 3, params[6] ?? 2, params[7] ?? 1, params[8] ?? 5);
        break;
      case "iRSI":
        handle = await iRSI(symbol, timeframe, params[0] ?? 14, params[1] ?? 1);
        break;
      case "iMACD":
        handle = await iMACD(symbol, timeframe, params[0] ?? 12, params[1] ?? 26, params[2] ?? 9, params[3] ?? 1);
        break;
      case "iStochastic":
        handle = await iStochastic(symbol, timeframe, params[0] ?? 5, params[1] ?? 3, params[2] ?? 3, params[3] ?? 0, params[4] ?? 0);
        break;
      case "iCCI":
        handle = await iCCI(symbol, timeframe, params[0] ?? 14, params[1] ?? 6);
        break;
      case "iMomentum":
        handle = await iMomentum(symbol, timeframe, params[0] ?? 14, params[1] ?? 1);
        break;
      case "iRVI":
        handle = await iRVI(symbol, timeframe, params[0] ?? 10);
        break;
      case "iDeMarker":
        handle = await iDeMarker(symbol, timeframe, params[0] ?? 14);
        break;
      case "iWPR":
        handle = await iWPR(symbol, timeframe, params[0] ?? 14);
        break;
      case "iOsMA":
        handle = await iOsMA(symbol, timeframe, params[0] ?? 12, params[1] ?? 26, params[2] ?? 9, params[3] ?? 1);
        break;
      case "iTriX":
        handle = await iTriX(symbol, timeframe, params[0] ?? 14, params[1] ?? 0, params[2] ?? 1);
        break;
      case "iBearsPower":
        handle = await iBearsPower(symbol, timeframe, params[0] ?? 13);
        break;
      case "iBullsPower":
        handle = await iBullsPower(symbol, timeframe, params[0] ?? 13);
        break;
      case "iForce":
        handle = await iForce(symbol, timeframe, params[0] ?? 13, params[1] ?? 0, params[2] ?? 1);
        break;
      case "iATR":
        handle = await iATR(symbol, timeframe, params[0] ?? 14);
        break;
      case "iChaikin":
        handle = await iChaikin(symbol, timeframe, params[0] ?? 3, params[1] ?? 10, params[2] ?? 0, params[3] ?? 1);
        break;
      case "iOBV":
        handle = await iOBV(symbol, timeframe, params[0] ?? 1);
        break;
      case "iMFI":
        handle = await iMFI(symbol, timeframe, params[0] ?? 14);
        break;
      case "iVolumes":
        handle = await iVolumes(symbol, timeframe, params[0] ?? 1);
        break;
      case "iAD":
        handle = await iAD(symbol, timeframe, params[0] ?? 1);
        break;
      case "iBWMFI":
        handle = await iBWMFI(symbol, timeframe, params[0] ?? 1);
        break;
      case "iAC":
        handle = await iAC(symbol, timeframe);
        break;
      case "iAO":
        handle = await iAO(symbol, timeframe);
        break;
      case "iFractals":
        handle = await iFractals(symbol, timeframe);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown indicator: ${name}` },
          { status: 400 }
        );
    }

    if (handle === null) {
      return NextResponse.json({ error: "Failed to create indicator" }, { status: 500 });
    }

    // Read all buffers
    const allBuffers: { name: string; values: number[]; }[] = [];
    let bufferNum = 0;
    // Try to read up to 5 buffers
    for (let i = 0; i < 5; i++) {
      try {
        const values = CopyBuffer(handle, i, 0, count);
        if (values.length === 0) break;
        // Get buffer name from a reverse lookup
        const bufferNames = [
          ["MA", "DEMA", "TEMA", "FrAMA", "AMA", "VIDyA", "StdDev", "RSI", "CCI", "Momentum", "WPR", "DeMarker", "MFI", "OBV", "Volumes", "AD", "BWMFI", "AC", "AO", "Force", "BearsPower", "BullsPower", "Chaikin", "TriX", "ATR"],
          ["UPPER", "LOWER", "SIGNAL", "MAIN", "PLUSDI", "MINUSDI"],
          ["LOWER", "SENKOUSPANA", "SENKOUSPANB", "CHINKOUSPAN", "TEETH", "LIPS"],
        ];
        const name = bufferNames.find((arr) => arr[i])?.[i] ?? `BUFFER_${i}`;
        allBuffers.push({ name, values });
        bufferNum++;
      } catch (e) {
        break;
      }
    }

    IndicatorRelease(handle);

    return NextResponse.json({
      success: true,
      indicator: name,
      symbol,
      timeframe,
      handle,
      buffers: allBuffers,
      lastValues: allBuffers.map(b => ({ name: b.name, value: b.values.at(-1) ?? null })),
      count,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Indicator calculation failed" },
      { status: 500 }
    );
  }
}
