import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — list all users (admin only)
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const users = await db.user.findMany({
      include: { subscription: { include: { plan: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        banned: u.banned,
        createdAt: u.createdAt,
        subscription: u.subscription
          ? {
              status: u.subscription.status,
              endDate: u.subscription.endDate,
              plan: u.subscription.plan
                ? { name: u.subscription.plan.name, nameAr: u.subscription.plan.nameAr }
                : null,
            }
          : null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// PUT — update user (ban/unban, change role)
export async function PUT(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { userId, banned, role } = await req.json();
    const data: any = {};
    if (banned !== undefined) data.banned = banned;
    if (role !== undefined) data.role = role;

    const updated = await db.user.update({ where: { id: userId }, data });
    return NextResponse.json({ success: true, user: { id: updated.id, banned: updated.banned, role: updated.role } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
