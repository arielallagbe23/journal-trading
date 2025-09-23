export const runtime = "nodejs";
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
  if (
    typeof asset !== "string" || !asset.trim() ||
    typeof timeframe !== "string" || !timeframe.trim() ||
    typeof emotionBefore !== "string" || !emotionBefore.trim()
  ) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  // ✅ nouveaux champs (optionnels)
  const planId =
    body.planId === null ? null :
    (typeof body.planId === "string" && body.planId.trim().length > 0 ? body.planId : null);

  const checkedStepIds = Array.isArray(body.checkedStepIds)
    ? body.checkedStepIds.filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
    : [];

  try {
    const tx = await addTransaction({
      userId: uid,
      asset,
      timeframe,
      emotionBefore,
      confidence: body.confidence ?? null,

      // 👇 passe au nouveau contrat: le lib recalcule respectPlan
      planId,
      checkedStepIds,

      // (facultatif: garde le fallback legacy si l’ancien front existe encore)
      respectSteps: typeof body.respectSteps === "number" ? body.respectSteps : undefined,
      totalSteps: typeof body.totalSteps === "number" ? body.totalSteps : undefined,
    });
    return NextResponse.json({ ok: true, transaction: tx }, { status: 201 });
  } catch (e) {
    console.error("POST /api/transactions failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
