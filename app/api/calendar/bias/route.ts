export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { todayEvents?: unknown };
    const todayEvents = body.todayEvents ?? [];

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: false, error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });

    const prompt = `Tu es un analyste macro spécialisé USDJPY.
Voici les annonces économiques USD et JPY d'aujourd'hui :
${JSON.stringify(todayEvents)}
Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "bias": "up|down|neutral",
  "summary": "1-2 phrases sur le biais directionnel USDJPY aujourd'hui"
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`Anthropic returned ${res.status}`);

    const data = await res.json() as { content?: Array<{ text: string }> };
    const text = data.content?.[0]?.text ?? "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean) as { bias: string; summary: string };

    return NextResponse.json({ ok: true, bias: parsed.bias, summary: parsed.summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/calendar/bias failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
