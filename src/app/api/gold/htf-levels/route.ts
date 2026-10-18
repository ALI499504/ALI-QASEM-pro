import { NextResponse } from "next/server";
import { detectHTFLevelsSetup } from "@/lib/htf-levels-strategy";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET() {
  try {
    const setup = await detectHTFLevelsSetup(10000);
    return NextResponse.json(setup);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "htf-levels failed" }, { status: 500 });
  }
}
