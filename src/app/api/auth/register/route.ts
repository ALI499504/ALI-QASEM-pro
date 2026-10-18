import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل بالفعل" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const freePlan = await db.subscriptionPlan.findUnique({ where: { name: "Free" } });

    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || email.split("@")[0],
        role: "USER",
        subscription: freePlan
          ? {
              create: {
                planId: freePlan.id,
                status: "ACTIVE",
              },
            }
          : undefined,
      },
      include: { subscription: { include: { plan: true } } },
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      subscription: user.subscription
        ? {
            status: user.subscription.status,
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
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "register failed" }, { status: 500 });
  }
}
