import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { subscription: { include: { plan: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    if (user.banned) {
      return NextResponse.json({ error: "تم حظر هذا الحساب. تواصل مع الإدارة" }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
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
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "login failed" }, { status: 500 });
  }
}
