import { NextResponse } from "next/server";
import { updateEAConfig, getEAConfig } from "@/lib/ea/expert-advisor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/ea/config — Get current config
// POST /api/ea/config — Update config (body: Partial<EAConfig>)
export async function GET() {
  return NextResponse.json({ config: getEAConfig() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = updateEAConfig(body);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? "Failed to update config" },
      { status: 500 }
    );
  }
}
