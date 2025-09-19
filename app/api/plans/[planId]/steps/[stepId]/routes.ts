// app/api/steps/[stepId]/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { getPlanById } from "@/lib/plans";
import { getStepById, updateStep, deleteStep } from "@/lib/steps";

export async function PATCH(req: NextRequest, { params }: { params: { stepId: string } }) {
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  try {
    const step = await getStepById(params.stepId);
    if (!step) return NextResponse.json({ error: "STEP_NOT_FOUND" }, { status: 404 });

    const plan = await getPlanById(step.planId);
    if (!plan || plan.userId !== uid) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const patch = await req.json();
    const updated = await updateStep(params.stepId, patch);
    return NextResponse.json({ ok: true, step: updated });
  } catch (e) {
    console.error("PATCH step failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { stepId: string } }) {
  let uid: string;
  try { uid = requireUserId(req); }
  catch { return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }); }

  try {
    const step = await getStepById(params.stepId);
    if (!step) return NextResponse.json({ error: "STEP_NOT_FOUND" }, { status: 404 });

    const plan = await getPlanById(step.planId);
    if (!plan || plan.userId !== uid) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    await deleteStep(params.stepId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE step failed:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
