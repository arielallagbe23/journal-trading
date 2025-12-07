// lib/user.ts
import { adminDb } from "@/lib/firebase-admin";
import { randomUUID as nodeRandomUUID } from "crypto";

export type User = { id: string; email: string; passwordHash: string; nickname: string };

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

export function saveUser(user: { email: string; passwordHash: string; nickname: string }) {
  const email = normalizeEmail(user.email);

  // check rapide en mémoire pour limiter les doublons évidents
  if (_usersByEmail.has(email)) {
    // on retourne l’existant pour rester non-bloquant (optionnel),
    // ou on pourrait throw une erreur sync. Ici je retourne l’existant.
    return _usersByEmail.get(email)!;
  }

  const u: User = {
    id: genId(),
    email,
    passwordHash: user.passwordHash,
    nickname: user.nickname,
  };

  // write-through en mémoire
  putInCaches(u);

  // persistance en arrière-plan
  (async () => {
    try {
      // NOTE: ceci n’empêche PAS les races inter-process.
      // Pour empêcher les doublons à coup sûr :
      // - utiliser une transaction et réserver doc emails/{email}
      // - ou utiliser emails comme ID du user (docId = email)
      await adminDb.collection("users").doc(u.id).set(u);
    } catch (err) {
      console.error("Firestore persist failed:", err);
      // option: rollback cache si l’écriture échoue
      // _usersByEmail.delete(email);
      // _usersById.delete(u.id);
    }
  })();

  return u;
}
