import { NextResponse } from "next/server";
import { detectRoleReversalSetup } from "@/lib/role-reversal-strategy";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET() {
  try {
    const setup = await detectRoleReversalSetup(10000);
    return NextResponse.json(setup);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "role-reversal failed" }, { status: 500 });
  }
}
