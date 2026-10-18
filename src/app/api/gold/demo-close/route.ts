import { NextResponse } from "next/server";
import { closeDemoPosition, closeAllDemoPositions } from "@/lib/demo-account";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/gold/demo-close
// Body: { ticket: 100001 } or { closeAll: true }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.closeAll) {
      const result = closeAllDemoPositions();
      return NextResponse.json({ success: true, ...result });
    }
    if (!body.ticket) return NextResponse.json({ error: "missing ticket" }, { status: 400 });
    const result = closeDemoPosition(Number(body.ticket));
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
