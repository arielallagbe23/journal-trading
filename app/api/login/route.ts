// app/api/login/route.ts
export const runtime = "nodejs";

// app/login/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store"; // optionnel

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/users"; // <- sans "s"
import { createSession, SESSION_COOKIE } from "@/lib/session";

const DUMMY_HASH =
  process.env.DUMMY_BCRYPT_HASH ??
  "$2a$12$d4iH4rUoG2nQ3cG1kq0hJuv2l0b0v0y5qVZt2YwX2gYy4bK0T2mde";

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { email, password } = body ?? {};
  if (!email || !password) {
    return NextResponse.json({ error: "email et password requis" }, { status: 400 });
  }

  const user = findUserByEmail(email);
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
