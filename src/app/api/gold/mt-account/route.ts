import { NextResponse } from "next/server";
import { getBridgeConfig, fetchMTAccount } from "@/lib/mt-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getBridgeConfig();
  if (!config) {
    return NextResponse.json({ error: "MT5 bridge not configured" }, { status: 400 });
  }
  try {
    const account = await fetchMTAccount();
    return NextResponse.json(account);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
