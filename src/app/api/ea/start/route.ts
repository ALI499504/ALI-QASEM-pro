import { NextResponse } from "next/server";
import { startEA } from "@/lib/ea/expert-advisor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/ea/start — Start the Expert Advisor
// Body: optional Partial<EAConfig> to update config before starting
export async function POST(req: Request) {
  try {
    let config = undefined;
    try {
      const body = await req.json();
      config = body;
    } catch {
      // no body — use defaults
    }
    const result = startEA(config);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? "Failed to start EA" },
      { status: 500 }
    );
  }
}
