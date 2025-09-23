export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { getTransactionById, updateTransaction, deleteTransaction } from "@/lib/transactions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } } // ✅ pas de Promise ici
) {
  const { id } = params;
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  try {
    const tx = await getTransactionById(id);
    if (!tx || tx.userId !== uid) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const patchBody: any = await req.json();

    // ✅ normalise les nouveaux champs (laisser passer brut mais sécurisé)
    const normalized: any = { ...patchBody };

    if ("planId" in patchBody) {
      normalized.planId =
        patchBody.planId === null ? null :
        (typeof patchBody.planId === "string" && patchBody.planId.trim().length > 0 ? patchBody.planId : null);
    }
    if ("checkedStepIds" in patchBody) {
      normalized.checkedStepIds = Array.isArray(patchBody.checkedStepIds)
        ? patchBody.checkedStepIds.filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
        : [];
    }

    // (optionnel) sécuriser profit en number/null
    if ("profit" in patchBody) {
      if (patchBody.profit === null || patchBody.profit === "") {
        normalized.profit = null;
      } else if (typeof patchBody.profit === "number" && Number.isFinite(patchBody.profit)) {
        normalized.profit = patchBody.profit;
      } else {
        return NextResponse.json({ error: "INVALID_PROFIT" }, { status: 400 });
      }
    }

    const updated = await updateTransaction(id, normalized);
    return NextResponse.json({ ok: true, transaction: updated });
  } catch (e) {
    console.error("PATCH /api/transactions/:id failed:", e);
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } } // ✅ pas de Promise ici
) {
  const { id } = params;
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  try {
    const tx = await getTransactionById(id);
    if (!tx || tx.userId !== uid) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    await deleteTransaction(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/transactions/:id failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
