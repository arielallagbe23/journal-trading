// app/api/plans/[planId]/steps/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { getPlanById } from "@/lib/plans";
import { addStep, getStepsByPlan } from "@/lib/steps";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> } // 👈 Promise
) {
  const { planId } = await params; // 👈 await
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  try {
    const plan = await getPlanById(planId);
    if (!plan || plan.userId !== uid) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const steps = await getStepsByPlan(planId);
    return NextResponse.json({ steps });
  } catch (e) {
    console.error("GET steps failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> } // 👈 Promise
) {
  const { planId } = await params; // 👈 await
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  try {
    const plan = await getPlanById(planId);
    if (!plan || plan.userId !== uid) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { title, order } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "title requis" }, { status: 400 });
    }

    const step = await addStep({ planId, title: title.trim(), order });
    return NextResponse.json({ ok: true, step }, { status: 201 });
  } catch (e) {
    console.error("POST steps failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
