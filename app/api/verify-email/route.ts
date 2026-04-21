export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/emailVerification";
import { markEmailVerified } from "@/lib/users";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ error: "token manquant" }, { status: 400 });
  }

  const userId = await consumeVerificationToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 400 });
  }

  await markEmailVerified(userId);
  return NextResponse.redirect(new URL("/dashboard?verified=1", req.url));
}
