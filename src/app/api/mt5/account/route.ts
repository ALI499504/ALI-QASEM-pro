import { NextResponse } from "next/server";
import { getMT5Account } from "@/lib/metaapi-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/mt5/account — current MT5 account info (balance, equity, P/L, margin)
export async function GET() {
  try {
    const account = await getMT5Account();
    return NextResponse.json({ account }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch account" },
      { status: 500 }
    );
  }
}
