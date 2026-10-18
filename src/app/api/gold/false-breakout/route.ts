import { NextResponse } from "next/server";
import { detectFalseBreakoutSetup } from "@/lib/false-breakout-strategy";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET() {
  try {
    const setup = await detectFalseBreakoutSetup(10000);
    return NextResponse.json(setup);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "false-breakout failed" }, { status: 500 });
  }
}
