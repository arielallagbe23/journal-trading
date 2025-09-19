// lib/assets.ts
import { adminDb } from "@/lib/firebase-admin";

export type Asset = { id: string; userId: string; assetName: string };

// crée/persiste un asset dans Firestore
export async function addAsset(asset: Asset): Promise<Asset> {
  await adminDb.collection("assets").doc(asset.id).set(asset);
  return asset;
}

// lit les assets d'un user depuis Firestore
export async function getAssetsByUser(userId: string): Promise<Asset[]> {
  const snap = await adminDb
    .collection("assets")
    .where("userId", "==", userId)
    .get();

  return snap.docs.map((d) => d.data() as Asset);
}

// utilitaires (pour la route DELETE)
export async function getAssetById(id: string): Promise<Asset | null> {
  const doc = await adminDb.collection("assets").doc(id).get();
  return doc.exists ? (doc.data() as Asset) : null;
}

export async function removeAsset(id: string): Promise<void> {
  await adminDb.collection("assets").doc(id).delete();
}
