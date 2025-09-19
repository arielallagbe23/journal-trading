// lib/session.ts
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "session";

// si SESSION_SECRET existe -> tokens signés (stateless, compatible Vercel)
// sinon -> fallback Map en mémoire (dev local)
const SECRET = process.env.SESSION_SECRET;

const g: any = globalThis as any;
const _sessions: Map<string, string> = g.__SESSIONS__ ?? new Map(); // token -> userId
if (!g.__SESSIONS__) g.__SESSIONS__ = _sessions;

// --- utils base64url ---
function b64url(buf: Buffer | string) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlToBuf(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

// --- impl stateless (HS256) ---
function makeSignedToken(userId: string, ttlSec = 60 * 60 * 24 * 7) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({ sub: userId, iat: now, exp: now + ttlSec, jti: crypto.randomUUID() })
  );
  const toSign = `${header}.${payload}`;
  const sig = createHmac("sha256", SECRET!).update(toSign).digest();
  return `${toSign}.${b64url(sig)}`;
}

function verifySignedToken(token?: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [h, p, s] = parts;
  const toSign = `${h}.${p}`;
  const expected = createHmac("sha256", SECRET!).update(toSign).digest();
  let got: Buffer;
  try {
    got = b64urlToBuf(s);
  } catch {
    return null;
  }
  if (expected.length !== got.length) return null;
  if (!timingSafeEqual(expected, got)) return null;

  try {
    const payload = JSON.parse(b64urlToBuf(p).toString("utf8"));
    if (typeof payload?.sub !== "string") return null;
    if (typeof payload?.exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) > payload.exp) return null; // expiré
    return payload.sub as string;
  } catch {
    return null;
  }
}

// --- API publique (signatures inchangées, sync) ---
export function createSession(userId: string) {
  if (SECRET) {
    // stateless, aucun stockage serveur
    return makeSignedToken(userId);
  }
  // fallback dev: mémoire
  const token = crypto.randomUUID();
  _sessions.set(token, userId);
  return token;
}

export function getUserIdByToken(token?: string | null) {
  if (SECRET) {
    return verifySignedToken(token);
  }
  if (!token) return null;
  return _sessions.get(token) ?? null;
}

export function destroySession(token?: string | null) {
  if (SECRET) {
    // stateless: rien à révoquer côté serveur.
    // Le logout se fait en effaçant le cookie (ce que tu fais déjà).
    return;
  }
  if (!token) return;
  _sessions.delete(token);
}
