import { NextResponse } from "next/server";
import { detectWyckoffSetup } from "@/lib/wyckoff-strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const setup = await detectWyckoffSetup(10000);
    return NextResponse.json(setup);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "wyckoff failed" }, { status: 500 });
  }
}
