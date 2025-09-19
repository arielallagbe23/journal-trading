export const runtime = "nodejs";
// app/api/plans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { addPlan, getPlansByUser } from "@/lib/plans";

export async function GET(req: NextRequest) {
  // 401 seulement si la session est absente
  let userId: string;
  try {
    userId = requireUserId(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const plans = await getPlansByUser(userId);
    return NextResponse.json({ plans });
  } catch (e) {
    console.error("GET /api/plans failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = requireUserId(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { title } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "title requis" }, { status: 400 });
    }
    const plan = await addPlan({ userId, title: title.trim() });
    return NextResponse.json({ ok: true, plan }, { status: 201 });
  } catch (e) {
    console.error("POST /api/plans failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
