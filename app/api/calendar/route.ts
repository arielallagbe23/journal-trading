export const runtime = "nodejs";
import { NextResponse } from "next/server";

type FFEvent = {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
};

export type CalendarEvent = FFEvent & {
  impact: "Low" | "Medium" | "High";
  parisTime: string;
};

function toParisDKey(d: Date): string {
  const str = d.toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [day, month, year] = str.split("/");
  return `${year}-${month}-${day}`;
}

export async function GET() {
  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Forex Factory returned ${res.status}`);

    const data: FFEvent[] = await res.json();

    // JPY : tous impacts (Low inclus — certains events clés sont mal classés par FF)
    // USD + CNY : Medium et High uniquement
    const filtered = data.filter((e) => {
      if (e.country === "JPY") return e.impact === "Low" || e.impact === "Medium" || e.impact === "High";
      if (e.country === "USD" || e.country === "CNY") return e.impact === "Medium" || e.impact === "High";
      return false;
    });

    const grouped: Record<string, CalendarEvent[]> = {};

    for (const event of filtered) {
      const d = new Date(event.date);
      const key = toParisDKey(d);
      const parisTime = d.toLocaleTimeString("fr-FR", {
        timeZone: "Europe/Paris",
        hour: "2-digit",
        minute: "2-digit",
      });
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...(event as CalendarEvent), parisTime });
    }

    return NextResponse.json({ ok: true, grouped });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/calendar failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
