// app/api/plan/[planId]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { getPlanById } from "@/lib/plans";
import { adminDb } from "@/lib/firebase-admin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> } // 👈 Promise ici
) {
  try {
    const { planId } = await params; // 👈 on attend params
    const uid = requireUserId(req);   // si requireUserId est async chez toi, mets: await requireUserId(req)

    // 1) Vérifie que le plan existe et appartient à l'utilisateur
    const plan = await getPlanById(planId);
    if (!plan || plan.userId !== uid) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // 2) Supprime toutes les steps du plan + le plan en batch
    const stepsSnap = await adminDb.collection("steps").where("planId", "==", planId).get();

    const batch = adminDb.batch();
    stepsSnap.forEach((doc) => batch.delete(doc.ref));
    batch.delete(adminDb.collection("plans").doc(planId));

    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
