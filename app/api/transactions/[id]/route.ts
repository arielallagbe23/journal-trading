export const runtime = "nodejs";
// app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { getTransactionById, updateTransaction, deleteTransaction } from "@/lib/transactions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  try {
    const tx = await getTransactionById(params.id);
    if (!tx || tx.userId !== uid) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const patch = await req.json();
    const updated = await updateTransaction(params.id, patch);
    return NextResponse.json({ ok: true, transaction: updated });
  } catch (e) {
    console.error("PATCH /api/transactions/:id failed:", e);
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  try {
    const tx = await getTransactionById(params.id);
    if (!tx || tx.userId !== uid) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    await deleteTransaction(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/transactions/:id failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
