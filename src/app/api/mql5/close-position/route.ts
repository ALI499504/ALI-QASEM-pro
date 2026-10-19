import { NextResponse } from "next/server";
import { closeMT5Position } from "@/lib/mt5-cloud-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/mql5/close-position
// Body: { ticket: 100001 }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.ticket) {
      return NextResponse.json(
        { success: false, error: "Missing ticket" },
        { status: 400 }
      );
    }
    const result = closeMT5Position(Number(body.ticket));
    return NextResponse.json({
      ...result,
      retcode: result.success ? 10009 : 10004,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, retcode: 10011, error: e?.message ?? "Close failed" },
      { status: 500 }
    );
  }
}
