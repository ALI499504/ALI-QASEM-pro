import { NextResponse } from "next/server";
import {
  getMultiAgentState,
  runMultiAgentCycle,
  startMultiAgentLoop,
} from "@/lib/multi-agent-system";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

// GET /api/gold/multi-agent?balance=1000
// Returns current state of all 6 agents + consensus
export async function GET(req: Request) {
  const url = new URL(req.url);
  const balance = Number(url.searchParams.get("balance") || 1000);
  const action = url.searchParams.get("action");

  startMultiAgentLoop(balance);

  if (action === "run") {
    const state = await runMultiAgentCycle(balance);
    return NextResponse.json(state);
  }

  return NextResponse.json(getMultiAgentState());
}

// POST: force a cycle
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const balance = Number(body?.balance || 1000);
    const state = await runMultiAgentCycle(balance);
    return NextResponse.json(state);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
