import { NextResponse } from "next/server";
import { detectPriceActionSetup } from "@/lib/price-action-strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const setup = await detectPriceActionSetup(10000);
    return NextResponse.json(setup);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "price-action failed" }, { status: 500 });
  }
}
