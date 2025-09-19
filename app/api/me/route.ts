export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getUserIdByToken } from "@/lib/session";
import { findUserById } from "@/lib/users";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? null;
  const userId = getUserIdByToken(token);
  if (!userId) return NextResponse.json({ authenticated: false });

  const user = findUserById(userId);
  return NextResponse.json({
    authenticated: true,
    user: user ? { id: user.id, email: user.email, nickname: user.nickname } : null,
  });
}
