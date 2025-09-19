// app/api/plans/[planId]/steps/reorder/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { getPlanById } from "@/lib/plans";
import { getStepsByPlan } from "@/lib/steps";
import { adminDb } from "@/lib/firebase-admin";

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: NextRequest, { params }: { params: { planId: string } }) {
  // 1) Auth stricte
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  try {
    // 2) Ownership
    const plan = await getPlanById(params.planId);
    if (!plan || plan.userId !== uid) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    // 3) Parse
    const { stepIds } = await req.json();
    if (!Array.isArray(stepIds) || stepIds.length === 0) {
      return NextResponse.json({ error: "stepIds requis" }, { status: 400 });
    }

    // 4) Restreindre aux steps du plan
    const existing = await getStepsByPlan(params.planId); // Firestore
    const allowed = new Set(existing.map(s => s.id));

    // 5) Prépare les updates (order = 1..n)
    const updates = stepIds
      .filter(id => allowed.has(id))
      .map((id, i) => ({ id, order: i + 1 }));

    // 6) Batch Firestore (chunk <= 450 pour marge)
    for (const group of chunk(updates, 450)) {
      const batch = adminDb.batch();
      for (const u of group) {
        const ref = adminDb.collection("steps").doc(u.id);
        batch.update(ref, { order: u.order });
      }
      await batch.commit();
    }

    // 7) Retourne la liste réordonnée
    const steps = await getStepsByPlan(params.planId);
    return NextResponse.json({ ok: true, steps });
  } catch (e) {
    console.error("REORDER steps failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
