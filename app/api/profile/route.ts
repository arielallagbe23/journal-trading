export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { findUserById, updateNickname } from "@/lib/users";

export async function GET(req: NextRequest) {
  let userId: string;
  try { userId = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  const user = findUserById(userId);
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({
    user: { id: user.id, email: user.email, nickname: user.nickname, emailVerified: user.emailVerified ?? false },
  });
}

export async function PATCH(req: NextRequest) {
  let userId: string;
  try { userId = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  let body: { nickname?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }

  const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
  if (!nickname || nickname.length < 2 || nickname.length > 30) {
    return NextResponse.json({ error: "Nickname invalide (2–30 caractères)" }, { status: 400 });
  }

  const updated = await updateNickname(userId, nickname);
  if (!updated) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  return NextResponse.json({ ok: true, user: { id: updated.id, email: updated.email, nickname: updated.nickname } });
}
