export const runtime = "nodejs";

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail, saveUser, normalizeEmail } from "@/lib/users";


export async function POST(req: NextRequest) {
  try {
    const { email, password, nickname } = await req.json();
    if (!email || !password || !nickname)
      return Response.json({ error: "email, password et nickname sont requis" }, { status: 400 });

    const e = normalizeEmail(email);
    if (findUserByEmail(e))
      return Response.json({ error: "email déjà utilisé" }, { status: 409 });

    if (password.length < 8)
      return Response.json({ error: "mot de passe trop court (min 8)" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = saveUser({ email: e, passwordHash, nickname });

    return Response.json({ ok: true, user: { email: user.email, nickname: user.nickname } }, { status: 201 });
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
}
