// lib/plans.ts
import { adminDb } from "@/lib/firebase-admin";

export type Plan = { id: string; userId: string; title: string; createdAt: number };

export async function addPlan(input: { userId: string; title: string }): Promise<Plan> {
  const plan: Plan = {
    id: crypto.randomUUID(),
    userId: input.userId,
    title: input.title.trim(),
    createdAt: Date.now(),
  };
  await adminDb.collection("plans").doc(plan.id).set(plan);
  return plan;
}

export async function getPlansByUser(userId: string): Promise<Plan[]> {
  const snap = await adminDb.collection("plans").where("userId", "==", userId).get(); // <- plus d'orderBy
  return snap.docs
    .map(d => d.data() as Plan)
    .sort((a, b) => a.createdAt - b.createdAt); // <- tri côté code
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const doc = await adminDb.collection("plans").doc(id).get();
  return doc.exists ? (doc.data() as Plan) : null;
}
