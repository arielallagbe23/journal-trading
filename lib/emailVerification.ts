import { adminDb } from "@/lib/firebase-admin";
import { randomBytes } from "crypto";

const COLLECTION = "emailVerificationTokens";
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function createVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + TTL_MS;

  const existing = await adminDb.collection(COLLECTION).where("userId", "==", userId).get();
  const batch = adminDb.batch();
  existing.docs.forEach((doc) => batch.delete(doc.ref));
  batch.set(adminDb.collection(COLLECTION).doc(token), { userId, expiresAt });
  await batch.commit();

  return token;
}

export async function consumeVerificationToken(token: string): Promise<string | null> {
  const doc = await adminDb.collection(COLLECTION).doc(token).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  await doc.ref.delete();
  if (Date.now() > data.expiresAt) return null;
  return data.userId as string;
}
