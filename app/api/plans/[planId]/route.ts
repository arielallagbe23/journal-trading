export const runtime = "nodejs";
// app/api/plan/[planId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { getPlanById } from "@/lib/plans";
import { adminDb } from "@/lib/firebase-admin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const uid = requireUserId(req);

    // 1) Vérifie que le plan existe et appartient à l'utilisateur
    const plan = await getPlanById(params.planId);
    if (!plan || plan.userId !== uid) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // 2) Récupère les steps du plan et supprime tout en batch
    const stepsSnap = await adminDb
      .collection("steps")
      .where("planId", "==", params.planId)
      .get();

    const batch = adminDb.batch();
    stepsSnap.forEach((doc) => batch.delete(doc.ref));
    batch.delete(adminDb.collection("plans").doc(params.planId));

    await batch.commit(); // <-- Firestore only

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
