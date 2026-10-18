import { NextResponse } from "next/server";
import { getBridgeConfig, fetchMTPositions } from "@/lib/mt-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getBridgeConfig();
  if (!config) {
    return NextResponse.json({ positions: [], count: 0, error: "not configured" });
  }
  try {
    const positions = await fetchMTPositions();
    return NextResponse.json({ positions, count: positions.length });
  } catch (e: any) {
    return NextResponse.json({ positions: [], count: 0, error: e?.message });
  }
}
