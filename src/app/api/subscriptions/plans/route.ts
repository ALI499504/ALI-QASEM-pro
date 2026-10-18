import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST — assign subscription to user (admin)
export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { userId, planId, durationDays } = await req.json();

    // Delete existing subscription
    await db.subscription.deleteMany({ where: { userId } });

    // Create new subscription
    const sub = await db.subscription.create({
      data: {
        userId,
        planId,
        status: "ACTIVE",
        endDate: new Date(Date.now() + (durationDays ?? 30) * 86400000),
      },
      include: { plan: true },
    });

    return NextResponse.json({
      subscription: {
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        plan: sub.plan
          ? {
              name: sub.plan.name,
              nameAr: sub.plan.nameAr,
              maxTrades: sub.plan.maxTrades,
              maxLotSize: sub.plan.maxLotSize,
              maxLeverage: sub.plan.maxLeverage,
            }
          : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
