import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  // Create default subscription plans
  const plans = [
    {
      name: "Free",
      nameAr: "مجاني",
      priceMonthly: 0,
      priceYearly: 0,
      maxTrades: 5,
      maxLotSize: 0.05,
      maxLeverage: 5,
      features: JSON.stringify(["basic_signals", "chart_access", "limited_indicators"]),
      featuresAr: JSON.stringify(["إشارات أساسية", "الوصول للرسم البياني", "مؤشرات محدودة"]),
    },
    {
      name: "Pro",
      nameAr: "احترافي",
      priceMonthly: 49,
      priceYearly: 490,
      maxTrades: 50,
      maxLotSize: 0.5,
      maxLeverage: 50,
      features: JSON.stringify(["all_signals", "multi_agent", "smc_analysis", "backtest", "advanced_indicators", "audio_alerts", "drawing_tools"]),
      featuresAr: JSON.stringify(["جميع الإشارات", "نظام الوكلاء", "تحليل SMC", "محرك Backtest", "مؤشرات متقدمة", "تنبيهات صوتية", "أدوات الرسم"]),
    },
    {
      name: "Enterprise",
      nameAr: "مؤسسي",
      priceMonthly: 199,
      priceYearly: 1990,
      maxTrades: 999,
      maxLotSize: 10,
      maxLeverage: 100,
      features: JSON.stringify(["everything_in_pro", "api_access", "multi_account", "priority_support", "custom_strategies", "white_label"]),
      featuresAr: JSON.stringify(["كل ميزات Pro", "وصول API", "متعدد الحسابات", "دعم أولوية", "استراتيجيات مخصصة", "علامة بيضاء"]),
    },
  ];

  for (const plan of plans) {
    await db.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`Plan: ${plan.name} (${plan.nameAr})`);
  }

  // Create admin user
  const adminPass = await bcrypt.hash("admin123", 10);
  await db.user.upsert({
    where: { email: "admin@mrobot.ai" },
    update: {},
    create: {
      email: "admin@mrobot.ai",
      password: adminPass,
      name: "Admin",
      role: "ADMIN",
    },
  });

  // Create demo user
  const userPass = await bcrypt.hash("user123", 10);
  const demoUser = await db.user.upsert({
    where: { email: "user@mrobot.ai" },
    update: {},
    create: {
      email: "user@mrobot.ai",
      password: userPass,
      name: "Demo User",
      role: "USER",
    },
  });

  // Assign Pro to demo user
  const proPlan = await db.subscriptionPlan.findUnique({ where: { name: "Pro" } });
  if (proPlan && demoUser) {
    await db.subscription.upsert({
      where: { userId: demoUser.id },
      update: {},
      create: {
        userId: demoUser.id,
        planId: proPlan.id,
        status: "ACTIVE",
        endDate: new Date(Date.now() + 30 * 86400000),
      },
    });
  }

  console.log("Seed done!");
  console.log("Admin: admin@mrobot.ai / admin123");
  console.log("User:  user@mrobot.ai / user123");
}

main().catch(console.error).finally(() => db.$disconnect());
