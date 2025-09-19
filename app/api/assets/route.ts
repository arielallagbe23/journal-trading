export const runtime = "nodejs";
// app/api/assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/requireUserId";
import { addAsset, getAssetsByUser } from "@/lib/assets";

export async function GET(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const assets = await getAssetsByUser(userId); // <-- await
    return NextResponse.json({ assets });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = requireUserId(req);
    const { assetName } = await req.json();
    if (!assetName) return NextResponse.json({ error: "assetName requis" }, { status: 400 });

    const asset = { id: crypto.randomUUID(), userId, assetName };
    await addAsset(asset); // <-- await
    return NextResponse.json({ ok: true, asset }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
