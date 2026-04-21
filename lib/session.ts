// lib/session.ts
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "session";

// si SESSION_SECRET existe -> tokens signés (stateless, compatible Vercel)
// sinon -> fallback Map en mémoire (dev local)
const SECRET = process.env.SESSION_SECRET;

const g = globalThis as typeof globalThis & Record<string, unknown>;

type SessionEntry = { userId: string; expiresAt: number };
const _sessions: Map<string, SessionEntry> =
  (g.__SESSIONS__ as Map<string, SessionEntry> | undefined) ?? new Map();
if (!g.__SESSIONS__) g.__SESSIONS__ = _sessions;

const _blacklist: Set<string> =
  (g.__SESSION_BLACKLIST__ as Set<string> | undefined) ?? new Set();
if (!g.__SESSION_BLACKLIST__) g.__SESSION_BLACKLIST__ = _blacklist;

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

function extractPayload(p: string): Record<string, unknown> | null {
  try { return JSON.parse(b64urlToBuf(p).toString("utf8")); }
  catch { return null; }
}

function verifySignedToken(token?: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [h, p, s] = parts;
  const toSign = `${h}.${p}`;
  const expected = createHmac("sha256", SECRET!).update(toSign).digest();
  let got: Buffer;
  try { got = b64urlToBuf(s); } catch { return null; }
  try { if (!timingSafeEqual(expected, got)) return null; } catch { return null; }

  const payload = extractPayload(p);
  if (!payload) return null;
  if (typeof payload.sub !== "string") return null;
  if (typeof payload.exp !== "number") return null;
  if (Math.floor(Date.now() / 1000) > payload.exp) return null;
  if (typeof payload.jti === "string" && _blacklist.has(payload.jti)) return null; // révoqué

  return typeof payload.sub === "string" ? payload.sub : null;
}

const DEV_TTL_SEC = 60 * 60 * 24 * 7; // 7 jours (identique aux tokens signés)

// --- API publique ---
export function createSession(userId: string) {
  if (SECRET) return makeSignedToken(userId);
  const token = crypto.randomUUID();
  _sessions.set(token, { userId, expiresAt: Date.now() + DEV_TTL_SEC * 1000 });
  return token;
}

export function getUserIdByToken(token?: string | null) {
  if (SECRET) return verifySignedToken(token);
  if (!token) return null;
  const entry = _sessions.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _sessions.delete(token); return null; }
  return entry.userId;
}

export function destroySession(token?: string | null) {
  if (!token) return;
  if (SECRET) {
    // révoque le token signé via son jti
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = extractPayload(parts[1]);
      if (typeof payload?.jti === "string") _blacklist.add(payload.jti);
    }
    return;
  }
  _sessions.delete(token);
}
