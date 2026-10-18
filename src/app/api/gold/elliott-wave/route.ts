import { NextResponse } from "next/server";
import { detectElliottWaveSetup } from "@/lib/elliott-wave-strategy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const setup = await detectElliottWaveSetup(10000);
    return NextResponse.json(setup);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "elliott-wave failed" }, { status: 500 });
  }
}
