// app/api/login/route.ts
export const runtime = "nodejs";

// app/login/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store"; // optionnel

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmailOrFetch } from "@/lib/users";
import { createSession, SESSION_COOKIE } from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

if (!process.env.DUMMY_BCRYPT_HASH) {
  throw new Error(
    'Missing DUMMY_BCRYPT_HASH in .env.local — génère-en un avec : node -e "require(\'bcryptjs\').hash(\'dummy\',12).then(console.log)"'
  );
}
const DUMMY_HASH = process.env.DUMMY_BCRYPT_HASH;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, retryAfter } = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie dans " + retryAfter + "s" },
      { status: 429 }
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "email et password requis" }, { status: 400 });
  }

  const user = await findUserByEmailOrFetch(email);
  const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, hashToCheck);

  if (!user || !ok) {
    return NextResponse.json({ error: "identifiants invalides" }, { status: 401 });
  }

  // 👇 ICI le await qui corrige ton erreur
  const token = await createSession(user.id);

  const maxAge = 60 * 60 * 24 * 7;
  const res = NextResponse.json(
    {
      ok: true,
      user: { id: user.id, email: user.email, nickname: user.nickname },
      ...(process.env.NODE_ENV !== "production" ? { devOnlyToken: token } : {}),
    },
    { status: 200 }
  );

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
  });

  return res;
}
