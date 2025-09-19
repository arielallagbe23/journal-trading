export const runtime = "nodejs";
// app/api/asset/[assetId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { getAssetById, removeAsset } from "@/lib/assets";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const userId = requireUserId(req);

    const a = await getAssetById(params.assetId); // <-- Firestore
    if (!a || a.userId !== userId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await removeAsset(params.assetId); // <-- Firestore
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
