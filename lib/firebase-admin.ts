// lib/firebase-admin.ts
import { cert, getApps, getApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey = process.env.FIREBASE_PRIVATE_KEY;

// Guard rails: crash tôt avec un message clair si mal configuré
if (!projectId) throw new Error("Missing FIREBASE_PROJECT_ID");
if (!clientEmail) throw new Error("Missing FIREBASE_CLIENT_EMAIL");
if (!rawKey) throw new Error("Missing FIREBASE_PRIVATE_KEY");

// Vercel stocke souvent la clé avec des \n échappés
const privateKey = rawKey.replace(/\\n/g, "\n");

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });

export const adminDb = getFirestore(app);

// (optionnel) si tu utilises l'émulateur en local
// if (process.env.FIRESTORE_EMULATOR_HOST) {
//   adminDb.settings({ ssl: false, host: process.env.FIRESTORE_EMULATOR_HOST });
// }
