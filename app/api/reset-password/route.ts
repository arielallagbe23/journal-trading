export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { consumeResetToken } from "@/lib/passwordReset";
import { updateUserPasswordHash } from "@/lib/users";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, retryAfter } = checkRateLimit(`reset:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie dans " + retryAfter + "s" },
      { status: 429 }
    );
  }

  let body: { token?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!token || !newPassword) {
    return NextResponse.json({ error: "token et nouveau mot de passe requis" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Mot de passe trop court (8 caractères min)" }, { status: 400 });
  }

  const userId = await consumeResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  const updated = await updateUserPasswordHash(userId, hash);
  if (!updated) {
    return NextResponse.json({ error: "Impossible de mettre à jour ce compte" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
