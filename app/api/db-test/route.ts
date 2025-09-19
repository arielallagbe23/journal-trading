export const runtime = "nodejs"; // requis pour firebase-admin

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    // on lit jusque 5 docs
    const snap = await adminDb.collection("public").limit(5).get();
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // si vide, on crée un doc de test
    if (!docs.length) {
      const ref = await adminDb.collection("public").add({
        title: "Hello Firestore (server)",
        createdAt: new Date(),
      });
      const created = await ref.get();
      docs = [{ id: created.id, ...created.data() }];
    }

    return NextResponse.json({ ok: true, count: docs.length, docs });
  } catch (err: any) {
    console.error("db-test error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
