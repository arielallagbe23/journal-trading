// lib/transactions.ts
import { adminDb } from "@/lib/firebase-admin";

export type Transaction = {
  id: string;
  userId: string;
  asset: string;
  timeframe: string;
  dateIn: string;
  dateOut: string | null;
  status: "open" | "closed";
  emotionBefore: string;
  emotionAfter: string | null;
  respectPlan: number;          // 0..100 (calculé)
  confidence: boolean | null;   // oui/non/null
  result: "win" | "loss" | null;
  profit: number | null;

  // 👇 nouveaux champs
  planId: string | null;
  checkedStepIds: string[];
};

// --- utils ---
function pct(done: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.round((done / total) * 100);
}

// steps est une collection à plat avec planId
async function getTotalStepsForPlan(planId: string | null): Promise<number> {
  if (!planId) return 0;
  const snap = await adminDb.collection("steps").where("planId", "==", planId).get();
  return snap.size;
}

async function computeRespectFromChecked(planId: string | null, checked: string[]): Promise<number> {
  const total = await getTotalStepsForPlan(planId);
  return pct(checked.length, total);
}

// --- CREATE ---
export async function addTransaction(input: {
  userId: string;
  asset: string;
  timeframe: string;
  emotionBefore: string;
  confidence?: boolean | null;

  // nouveau flux "by steps"
  planId?: string | null;
  checkedStepIds?: string[];

  // (fallback legacy toléré)
  respectSteps?: number;
  totalSteps?: number;
}): Promise<Transaction> {
  const planId = input.planId ?? null;
  const checkedStepIds = Array.isArray(input.checkedStepIds) ? input.checkedStepIds : [];

  // 1) nouveau calcul prioritaire
  let respectPlan = await computeRespectFromChecked(planId, checkedStepIds);

  // 2) fallback si l’ancien front envoie encore respectSteps/totalSteps
  if (respectPlan === 0 && (input.respectSteps ?? 0) > 0) {
    respectPlan = pct(input.respectSteps ?? 0, input.totalSteps ?? 0);
  }

  const tx: Transaction = {
    id: crypto.randomUUID(),
    userId: input.userId,
    asset: input.asset.trim(),
    timeframe: input.timeframe.trim(),
    dateIn: new Date().toISOString(),
    dateOut: null,
    status: "open",
    emotionBefore: input.emotionBefore.trim(),
    emotionAfter: null,
    respectPlan,
    confidence: input.confidence ?? null,
    result: null,
    profit: null,

    // nouveaux champs
    planId,
    checkedStepIds,
  };

  await adminDb.collection("transactions").doc(tx.id).set(tx);
  return tx;
}

// --- READ ---
export async function getTransactionsByUser(userId: string): Promise<Transaction[]> {
  const snap = await adminDb.collection("transactions").where("userId", "==", userId).get();
  return snap.docs.map((d) => d.data() as Transaction);
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const doc = await adminDb.collection("transactions").doc(id).get();
  return doc.exists ? (doc.data() as Transaction) : null;
}

// --- UPDATE ---
export async function updateTransaction(
  id: string,
  patch: Partial<Transaction> & {
    // nouveaux champs acceptés
    planId?: string | null;
    checkedStepIds?: string[];

    // fallback legacy
    respectSteps?: number;
    totalSteps?: number;
  }
): Promise<Transaction | null> {
  const cur = await getTransactionById(id);
  if (!cur) return null;

  // prépare les valeurs candidates post-patch (sans persister)
  const nextPlanId = patch.planId !== undefined ? patch.planId : cur.planId;
  const nextChecked = patch.checkedStepIds !== undefined ? patch.checkedStepIds : cur.checkedStepIds;

  let respectPlan = cur.respectPlan;

  const planChanged = patch.planId !== undefined && patch.planId !== cur.planId;
  const checkedChanged = patch.checkedStepIds !== undefined;

  if (planChanged || checkedChanged) {
    respectPlan = await computeRespectFromChecked(nextPlanId ?? null, Array.isArray(nextChecked) ? nextChecked : []);
  } else if (typeof patch.respectSteps === "number" || typeof patch.totalSteps === "number") {
    // fallback legacy si pas de changements sur plan/checked
    respectPlan = pct(patch.respectSteps ?? 0, patch.totalSteps ?? 0);
  }

  const updated: Transaction = {
    ...cur,
    ...patch,
    planId: nextPlanId ?? null,
    checkedStepIds: Array.isArray(nextChecked) ? nextChecked : [],
    respectPlan,
  };

  await adminDb.collection("transactions").doc(id).set(updated);
  return updated;
}

// --- DELETE ---
export async function deleteTransaction(id: string): Promise<boolean> {
  const exists = await getTransactionById(id);
  if (!exists) return false;
  await adminDb.collection("transactions").doc(id).delete();
  return true;
}
