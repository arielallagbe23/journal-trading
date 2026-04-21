// lib/user.ts
import { adminDb } from "@/lib/firebase-admin";
import { randomUUID as nodeRandomUUID } from "crypto";

export type User = { id: string; email: string; passwordHash: string; nickname: string; emailVerified?: boolean };

const globalAny = globalThis as any;

// caches mémoire (par process)
const _usersByEmail: Map<string, User> = globalAny.__USERS_BY_EMAIL__ ?? new Map();
const _usersById: Map<string, User> = globalAny.__USERS_BY_ID__ ?? new Map();
if (!globalAny.__USERS_BY_EMAIL__) globalAny.__USERS_BY_EMAIL__ = _usersByEmail;
if (!globalAny.__USERS_BY_ID__) globalAny.__USERS_BY_ID__ = _usersById;

// état d’hydratation
const _hydr = globalAny.__USERS_HYDR__ ?? { started: false };
if (!globalAny.__USERS_HYDR__) globalAny.__USERS_HYDR__ = _hydr;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function putInCaches(u: User) {
  const normalized = normalizeEmail(u.email);
  // on force la version normalisée pour les clés ET pour le doc en mémoire
  const canon: User = { ...u, email: normalized };
  _usersByEmail.set(normalized, canon);
  _usersById.set(canon.id, canon);
  return canon;
}

function kickstartHydration() {
  if (_hydr.started) return;
  _hydr.started = true;
  (async () => {
    try {
      const snap = await adminDb.collection("users").get();
      for (const doc of snap.docs) {
        const u = doc.data() as User;
        putInCaches(u); // normalise à l’entrée
      }
      // console.log("Users cache hydrated:", _usersById.size);
    } catch (e) {
      console.error("Users cache hydration failed:", e);
    }
  })();
}
kickstartHydration();

// --- Lookups synchrones avec warm-up async identique à ton design ---

export function findUserByEmail(email: string) {
  const e = normalizeEmail(email);
  const u = _usersByEmail.get(e);
  if (u) return u;

  // warm-up en arrière-plan
  (async () => {
    try {
      const snap = await adminDb.collection("users").where("email", "==", e).limit(1).get();
      if (!snap.empty) {
        putInCaches(snap.docs[0].data() as User);
      }
    } catch (err) {
      console.error("findUserByEmail background fetch failed:", err);
    }
  })();

  return undefined; // uniforme
}

export function findUserById(id: string) {
  const u = _usersById.get(id);
  if (u) return u;

  (async () => {
    try {
      const doc = await adminDb.collection("users").doc(id).get();
      if (doc.exists) {
        putInCaches(doc.data() as User);
      }
    } catch (err) {
      console.error("findUserById background fetch failed:", err);
    }
  })();

  return undefined; // uniforme
}

// utilitaire id robustifié
function genId() {
  // web crypto si dispo, sinon fallback Node
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && crypto?.randomUUID) {
      // @ts-ignore
      return crypto.randomUUID();
    }
  } catch {}
  return nodeRandomUUID();
}

export async function saveUser(user: { email: string; passwordHash: string; nickname: string }): Promise<User> {
  const email = normalizeEmail(user.email);

  if (_usersByEmail.has(email)) throw new Error("EMAIL_TAKEN");

  // vérification Firestore pour couvrir les races inter-process
  const existing = await adminDb.collection("users").where("email", "==", email).limit(1).get();
  if (!existing.empty) {
    putInCaches(existing.docs[0].data() as User);
    throw new Error("EMAIL_TAKEN");
  }

  const u: User = {
    id: genId(),
    email,
    passwordHash: user.passwordHash,
    nickname: user.nickname,
  };

  putInCaches(u);

  try {
    await adminDb.collection("users").doc(u.id).set(u);
  } catch (err) {
    console.error("Firestore persist failed:", err);
    _usersByEmail.delete(email);
    _usersById.delete(u.id);
    throw err;
  }

  return u;
}

export async function findUserByEmailOrFetch(email: string) {
  const cached = findUserByEmail(email);
  if (cached) return cached;

  const normalized = normalizeEmail(email);
  const snap = await adminDb.collection("users").where("email", "==", normalized).limit(1).get();
  if (snap.empty) return undefined;
  return putInCaches(snap.docs[0].data() as User);
}

export async function updateNickname(userId: string, nickname: string): Promise<User | undefined> {
  const docRef = adminDb.collection("users").doc(userId);
  const doc = await docRef.get();
  if (!doc.exists) return undefined;
  await docRef.update({ nickname });
  const updated = putInCaches({ ...(doc.data() as User), nickname });
  return updated;
}

export async function markEmailVerified(userId: string): Promise<void> {
  const docRef = adminDb.collection("users").doc(userId);
  await docRef.update({ emailVerified: true });
  const doc = await docRef.get();
  if (doc.exists) putInCaches(doc.data() as User);
}

export async function updateUserPasswordHash(userId: string, passwordHash: string) {
  const docRef = adminDb.collection("users").doc(userId);
  const doc = await docRef.get();
  if (!doc.exists) return undefined;

  await docRef.update({ passwordHash });
  const updated = putInCaches({ ...(doc.data() as User), passwordHash });
  return updated;
}
