export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { findUserByEmailOrFetch } from "@/lib/users";
import { createResetToken } from "@/lib/passwordReset";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, retryAfter } = checkRateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie dans " + retryAfter + "s" },
      { status: 429 }
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "email requis" }, { status: 400 });
  }

  // Réponse identique qu'un email existe ou non (évite l'énumération d'emails)
  const user = await findUserByEmailOrFetch(email).catch(() => null);
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = await createResetToken(user.id);

  // En production: envoyer le token par email (SMTP / Resend / SendGrid)
  // En dev: retourner le token directement pour les tests
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ok: true, devOnlyResetToken: token });
  }

  return NextResponse.json({ ok: true });
}
