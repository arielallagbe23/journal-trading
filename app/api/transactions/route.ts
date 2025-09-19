export const runtime = "nodejs";
// app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { addTransaction, getTransactionsByUser } from "@/lib/transactions";

export async function GET(req: NextRequest) {
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  try {
    const transactions = await getTransactionsByUser(uid);
    return NextResponse.json({ transactions });
  } catch (e) {
    console.error("GET /api/transactions failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }

  const { asset, timeframe, emotionBefore } = body ?? {};
  if (!asset || !timeframe || !emotionBefore) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  try {
    const tx = await addTransaction({
      userId: uid,
      asset,
      timeframe,
      emotionBefore,
      confidence: body.confidence ?? null,
      respectSteps: body.respectSteps ?? 0,
      totalSteps: body.totalSteps ?? 0,
    });
    return NextResponse.json({ ok: true, transaction: tx }, { status: 201 });
  } catch (e) {
    console.error("POST /api/transactions failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
