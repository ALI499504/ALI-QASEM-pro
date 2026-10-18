import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — list all plans
export async function GET() {
  try {
    const plans = await db.subscriptionPlan.findMany({ orderBy: { priceMonthly: "asc" } });
    return NextResponse.json({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        nameAr: p.nameAr,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        maxTrades: p.maxTrades,
        maxLotSize: p.maxLotSize,
        maxLeverage: p.maxLeverage,
        featuresAr: JSON.parse(p.featuresAr),
        active: p.active,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// POST — create plan (admin)
export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const plan = await db.subscriptionPlan.create({
      data: {
        name: body.name,
        nameAr: body.nameAr || body.name,
        priceMonthly: body.priceMonthly ?? 0,
        priceYearly: body.priceYearly ?? 0,
        maxTrades: body.maxTrades ?? 10,
        maxLotSize: body.maxLotSize ?? 0.1,
        maxLeverage: body.maxLeverage ?? 10,
        featuresAr: JSON.stringify(body.featuresAr ?? []),
        features: JSON.stringify(body.features ?? []),
        active: body.active ?? true,
      },
    });
    return NextResponse.json({ plan });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// PUT — update plan (admin)
export async function PUT(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { planId, ...updates } = await req.json();
    const data: any = {};
    if (updates.name) data.name = updates.name;
    if (updates.nameAr) data.nameAr = updates.nameAr;
    if (updates.priceMonthly !== undefined) data.priceMonthly = updates.priceMonthly;
    if (updates.priceYearly !== undefined) data.priceYearly = updates.priceYearly;
    if (updates.maxTrades !== undefined) data.maxTrades = updates.maxTrades;
    if (updates.maxLotSize !== undefined) data.maxLotSize = updates.maxLotSize;
    if (updates.maxLeverage !== undefined) data.maxLeverage = updates.maxLeverage;
    if (updates.featuresAr) data.featuresAr = JSON.stringify(updates.featuresAr);
    if (updates.active !== undefined) data.active = updates.active;

    const plan = await db.subscriptionPlan.update({ where: { id: planId }, data });
    return NextResponse.json({ plan });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// DELETE — delete plan (admin)
export async function DELETE(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("id");
    if (!planId) return NextResponse.json({ error: "id required" }, { status: 400 });

    await db.subscriptionPlan.delete({ where: { id: planId } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
