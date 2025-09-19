// lib/steps.ts
import { adminDb } from "@/lib/firebase-admin";

export type Step = { id: string; planId: string; title: string; order: number };

export async function addStep(input: { planId: string; title: string; order?: number }): Promise<Step> {
  const step: Step = {
    id: crypto.randomUUID(),
    planId: input.planId,
    title: input.title.trim(),
    order: input.order ?? Date.now(), // simple ordre croissant
  };
  await adminDb.collection("steps").doc(step.id).set(step);
  return step;
}

export async function getStepsByPlan(planId: string): Promise<Step[]> {
  // pas d'orderBy pour éviter d’exiger un index composite
  const snap = await adminDb.collection("steps").where("planId", "==", planId).get();
  return snap.docs.map(d => d.data() as Step).sort((a, b) => a.order - b.order);
}

export async function getStepById(id: string): Promise<Step | null> {
  const doc = await adminDb.collection("steps").doc(id).get();
  return doc.exists ? (doc.data() as Step) : null;
}

export async function updateStep(id: string, patch: Partial<Step>): Promise<Step | null> {
  const cur = await getStepById(id);
  if (!cur) return null;
  const next: Step = { ...cur, ...patch, title: (patch.title ?? cur.title).trim() };
  await adminDb.collection("steps").doc(id).set(next);
  return next;
}

export async function deleteStep(id: string): Promise<boolean> {
  const cur = await getStepById(id);
  if (!cur) return false;
  await adminDb.collection("steps").doc(id).delete();
  return true;
}

export async function reorderSteps(planId: string, stepIds: string[]): Promise<Step[]> {
  // sécurise: ne réordonne que les steps du plan cible
  const existing = await getStepsByPlan(planId);
  const allowed = new Set(existing.map(s => s.id));

  const batch = adminDb.batch();
  let pos = 1;
  for (const id of stepIds) {
    if (!allowed.has(id)) continue;
    const ref = adminDb.collection("steps").doc(id);
    batch.update(ref, { order: pos++ });
  }
  await batch.commit();
  return getStepsByPlan(planId);
}
