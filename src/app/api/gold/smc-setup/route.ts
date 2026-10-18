import { NextResponse } from "next/server";
import { detectSMCSetup } from "@/lib/smc-strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const setup = await detectSMCSetup(10000);
    return NextResponse.json(setup);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "smc-setup failed" }, { status: 500 });
  }
}
