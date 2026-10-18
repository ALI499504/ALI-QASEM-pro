import { NextResponse } from "next/server";
import {
  getAgentStatus,
  setAgentMode,
  pauseAgent,
  resumeAgent,
  resetAgentMemory,
  runAgentCycle,
  startAgentLoop,
  getPerformanceSummary,
  type AgentMode,
} from "@/lib/ai-trading-agent";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 20;

// === GET: return current agent status ===
export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const balance = Number(url.searchParams.get("balance") || 1000);

  // Lazy-start the agent loop on first GET
  startAgentLoop(balance);

  if (action === "run") {
    // Force a fresh cycle
    const status = await runAgentCycle(balance);
    return NextResponse.json({ ...status, performance: getPerformanceSummary() });
  }

  const status = getAgentStatus();
  return NextResponse.json({ ...status, performance: getPerformanceSummary() });
}

// === POST: control agent (mode, pause, resume, reset) ===
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, mode, balance } = body;

    switch (action) {
      case "set_mode":
        if (!["MANUAL", "SEMI_AUTO", "FULL_AUTO"].includes(mode)) {
          return NextResponse.json({ error: "invalid mode" }, { status: 400 });
        }
        return NextResponse.json(setAgentMode(mode as AgentMode));

      case "pause":
        return NextResponse.json(pauseAgent());

      case "resume":
        return NextResponse.json(resumeAgent());

      case "reset":
        return NextResponse.json(resetAgentMemory());

      case "run_cycle":
        return NextResponse.json(await runAgentCycle(Number(balance || 1000)));

      default:
        return NextResponse.json({ error: "invalid action" }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
