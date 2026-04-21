export const runtime = "nodejs";

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmailOrFetch, saveUser, normalizeEmail } from "@/lib/users";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { createVerificationToken } from "@/lib/emailVerification";


export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, retryAfter } = checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return Response.json(
      { error: "Trop de tentatives. Réessaie dans " + retryAfter + "s" },
      { status: 429 }
    );
  }

  try {
    const { email, password, nickname } = await req.json();
    if (!email || !password || !nickname)
      return Response.json({ error: "email, password et nickname sont requis" }, { status: 400 });

    const e = normalizeEmail(email);
    if (await findUserByEmailOrFetch(e))
      return Response.json({ error: "email déjà utilisé" }, { status: 409 });

    if (password.length < 8)
      return Response.json({ error: "mot de passe trop court (min 8)" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await saveUser({ email: e, passwordHash, nickname });

    const verifyToken = await createVerificationToken(user.id);

    return Response.json({
      ok: true,
      user: { email: user.email, nickname: user.nickname },
      // En prod: envoyer par email. En dev: retourné directement.
      ...(process.env.NODE_ENV !== "production" ? { devOnlyVerifyToken: verifyToken } : {}),
    }, { status: 201 });
  } catch (err: any) {
    if (err?.message === "EMAIL_TAKEN")
      return Response.json({ error: "email déjà utilisé" }, { status: 409 });
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
}
