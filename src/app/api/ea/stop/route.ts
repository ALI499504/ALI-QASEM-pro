import { NextResponse } from "next/server";
import { stopEA } from "@/lib/ea/expert-advisor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/ea/stop — Stop the Expert Advisor
export async function POST() {
  const result = stopEA();
  return NextResponse.json(result);
}
