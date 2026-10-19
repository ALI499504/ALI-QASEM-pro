import { NextResponse } from "next/server";
import { AccountInfoDouble, AccountInfoInteger, AccountInfoString } from "@/lib/mql5";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/mql5/account-info
// Optional: ?property=ACCOUNT_BALANCE  (returns single property)
// Default: returns all account properties
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const property = url.searchParams.get("property");

    if (property) {
      // Return single property
      let value: number | string;
      const propNum = parseInt(property);
      if (isNaN(propNum)) {
        return NextResponse.json({ error: "Invalid property" }, { status: 400 });
      }
      // Try as double first
      value = await AccountInfoDouble(propNum);
      if (value === 0) {
        // Try as integer
        value = await AccountInfoInteger(propNum);
        if (value === 0) {
          // Try as string
          value = await AccountInfoString(propNum);
        }
      }
      return NextResponse.json({ property: propNum, value });
    }

    // Return all properties
    const [balance, equity, profit, margin, marginFree, marginLevel, login, leverage] = await Promise.all([
      AccountInfoDouble(0), // ACCOUNT_BALANCE
      AccountInfoDouble(3), // ACCOUNT_EQUITY
      AccountInfoDouble(2), // ACCOUNT_PROFIT
      AccountInfoDouble(4), // ACCOUNT_MARGIN
      AccountInfoDouble(5), // ACCOUNT_MARGIN_FREE
      AccountInfoDouble(6), // ACCOUNT_MARGIN_LEVEL
      AccountInfoInteger(0), // ACCOUNT_LOGIN
      AccountInfoInteger(2), // ACCOUNT_LEVERAGE
    ]);

    const [name, server, currency, company] = await Promise.all([
      AccountInfoString(0), AccountInfoString(1), AccountInfoString(2), AccountInfoString(3),
    ]);

    return NextResponse.json({
      balance, equity, profit, margin, marginFree, marginLevel,
      login, leverage,
      name, server, currency, company,
      tradeAllowed: (await AccountInfoInteger(4)) === 1,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch account info" },
      { status: 500 }
    );
  }
}
