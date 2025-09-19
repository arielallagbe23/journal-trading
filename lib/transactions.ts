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
};

// --- CREATE ---
export async function addTransaction(input: {
  userId: string;
  asset: string;
  timeframe: string;
  emotionBefore: string;
  confidence?: boolean | null;
  respectSteps?: number;
  totalSteps?: number;
}): Promise<Transaction> {
  const respectSteps = input.respectSteps ?? 0;
  const totalSteps = input.totalSteps ?? 0;
  const respectPlan = totalSteps > 0 ? Math.round((respectSteps / totalSteps) * 100) : 0;

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
  };

  await adminDb.collection("transactions").doc(tx.id).set(tx);
  return tx;
}

// --- READ ---
export async function getTransactionsByUser(userId: string): Promise<Transaction[]> {
  // Pas d'orderBy pour éviter les indexes composites → on trie côté code si besoin
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
  patch: Partial<Transaction> & { respectSteps?: number; totalSteps?: number }
): Promise<Transaction | null> {
  const cur = await getTransactionById(id);
  if (!cur) return null;

  // recalcul éventuel du respectPlan si on te passe respectSteps/totalSteps
  let respectPlan = cur.respectPlan;
  if (typeof patch.respectSteps === "number" || typeof patch.totalSteps === "number") {
    const rs = patch.respectSteps ?? 0;
    const ts = patch.totalSteps ?? 0;
    respectPlan = ts > 0 ? Math.round((rs / ts) * 100) : 0;
  }

  const updated: Transaction = {
    ...cur,
    ...patch,
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
