// app/api/transactions/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { getTransactionById, updateTransaction, deleteTransaction } from "@/lib/transactions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 👈 Promise
) {
  const { id } = await params; // 👈 await
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  try {
    const tx = await getTransactionById(id);
    if (!tx || tx.userId !== uid) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const patch = await req.json();
    const updated = await updateTransaction(id, patch);
    return NextResponse.json({ ok: true, transaction: updated });
  } catch (e) {
    console.error("PATCH /api/transactions/:id failed:", e);
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 👈 Promise
) {
  const { id } = await params; // 👈 await
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
