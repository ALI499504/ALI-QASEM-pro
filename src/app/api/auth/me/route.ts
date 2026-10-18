import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      subscription: user.subscription
        ? {
            status: user.subscription.status,
            startDate: user.subscription.startDate,
            endDate: user.subscription.endDate,
            plan: user.subscription.plan
              ? {
                  name: user.subscription.plan.name,
                  nameAr: user.subscription.plan.nameAr,
                  maxTrades: user.subscription.plan.maxTrades,
                  maxLotSize: user.subscription.plan.maxLotSize,
                  maxLeverage: user.subscription.plan.maxLeverage,
                  featuresAr: JSON.parse(user.subscription.plan.featuresAr),
                }
              : null,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
