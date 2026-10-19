import { NextResponse } from "next/server";
import { closeMT5Position } from "@/lib/mt5-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/mt5/close — close a position by ticket
// Body: { ticket: 100001 }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.ticket) {
      return NextResponse.json(
        { success: false, error: "missing ticket" },
        { status: 400 }
      );
    }
    const result = closeMT5Position(Number(body.ticket));
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Close failed" },
      { status: 500 }
    );
  }
}
