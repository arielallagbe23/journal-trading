export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { adminDb } from "@/lib/firebase-admin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params; // 👈
  try {
    const userId = await requireUserId(req);
    const doc = await adminDb.collection("assets").doc(assetId).get();
    const a = doc.exists ? doc.data() as any : null;
    if (!a || a.userId !== userId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    await adminDb.collection("assets").doc(assetId).delete();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
