export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmailOrFetch, updateUserPasswordHash } from "@/lib/users";

export async function POST(req: NextRequest) {
  let body: { email?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!email.trim() || !newPassword.trim()) {
    return NextResponse.json({ error: "email et nouveau mot de passe requis" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Mot de passe trop court (8 caractères min)" }, { status: 400 });
  }

  let user;
  try {
    user = await findUserByEmailOrFetch(email);
  } catch (err) {
    console.error("Forgot password lookup failed:", err);
    return NextResponse.json({ error: "SERVICE_INDISPONIBLE" }, { status: 500 });
  }
  if (!user) {
    // simple retour pour cette première version
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  let updated;
  try {
    updated = await updateUserPasswordHash(user.id, hash);
  } catch (err) {
    console.error("Forgot password update failed:", err);
    return NextResponse.json({ error: "SERVICE_INDISPONIBLE" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Impossible de mettre à jour ce compte" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
