"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { CalendarEvent } from "@/app/api/calendar/route";

type BiasData = { bias: "up" | "down" | "neutral"; summary: string } | null;

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// Devises affichées dans cet ordre dans le récap
const CURRENCY_ORDER = ["USD", "JPY", "CNY"] as const;

const FLAG: Record<string, string> = {
  USD: "🇺🇸",
  JPY: "🇯🇵",
  CNY: "🇨🇳",
};

const CURRENCY_LABEL: Record<string, string> = {
  USD: "Dollar américain",
  JPY: "Yen japonais",
  CNY: "Yuan chinois · impact indirect JPY",
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

function getWeekDays(): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// Mots-clés qui rendent un jour "Critique" même si impact = Medium
const CRITICAL_KEYWORDS = [
  "non-farm", "nfp", "payroll",
  "fomc", "federal reserve", "fed chair", "powell",
  "boj", "bank of japan", "ueda", "rate decision", "interest rate",
  "cpi", "inflation",
  "gdp", "gross domestic",
  "pce",
];

type Vigilance = "critique" | "haute" | "calme";

function getVigilance(events: CalendarEvent[]): Vigilance {
  if (!events.length) return "calme";
  const hasHigh = events.some((e) => e.impact === "High");
  const hasCriticalKeyword = events.some((e) =>
    CRITICAL_KEYWORDS.some((kw) => e.title.toLowerCase().includes(kw))
  );
  if (hasHigh || hasCriticalKeyword) return "critique";
  if (events.some((e) => e.impact === "Medium")) return "haute";
  return "calme";
}

function VigilanceBadge({ v, size = "sm" }: { v: Vigilance; size?: "sm" | "lg" }) {
  const base = size === "lg" ? "px-3 py-1 rounded-full text-sm font-bold" : "px-2 py-0.5 rounded-full text-xs font-semibold";
  if (v === "critique") return <span className={`${base} bg-rose-900/70 text-rose-300`}>🔴 Critique</span>;
  if (v === "haute")    return <span className={`${base} bg-amber-900/60 text-amber-300`}>⚠️ Vigilance haute</span>;
  return                       <span className={`${base} bg-emerald-900/50 text-emerald-400`}>✅ Calme</span>;
}

function BiasBadge({ b }: { b: "up" | "down" | "neutral" }) {
  if (b === "up")
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300">↑ Haussier</span>;
  if (b === "down")
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-900/60 text-rose-300">↓ Baissier</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-300">— Neutre</span>;
}

function ImpactPill({ impact }: { impact: "Low" | "Medium" | "High" }) {
  if (impact === "High")
    return (
      <span className="px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap" style={{ backgroundColor: "#FCEBEB", color: "#A32D2D" }}>
        ● Fort
      </span>
    );
  if (impact === "Medium")
    return (
      <span className="px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap" style={{ backgroundColor: "#FAEEDA", color: "#854F0B" }}>
        ● Moyen
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap bg-gray-800 text-gray-400">
      ● Faible
    </span>
  );
}

export default function NewsPage() {
  const router = useRouter();
  const weekDays = getWeekDays();
  const todayKey = toParisDKey(new Date());
  const todayMidnight = new Date(new Date().setHours(0, 0, 0, 0));

  const [grouped, setGrouped] = useState<Record<string, CalendarEvent[]>>({});
  const [calLoading, setCalLoading] = useState(true);
  const [calError, setCalError] = useState(false);
  const [bias, setBias] = useState<BiasData>(null);
  const [biasLoading, setBiasLoading] = useState(false);

  const fetchBias = useCallback(async (events: CalendarEvent[]) => {
    if (!events.length) return;
    setBiasLoading(true);
    try {
      const r = await fetch("/api/calendar/bias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todayEvents: events }),
      });
      const j = await r.json() as { ok: boolean; bias?: "up" | "down" | "neutral"; summary?: string };
      if (j.ok && j.bias && j.summary) setBias({ bias: j.bias, summary: j.summary });
    } catch {
      // graceful degradation
    } finally {
      setBiasLoading(false);
    }
  }, []);

  const fetchCalendar = useCallback(async () => {
    setCalLoading(true);
    setCalError(false);
    setBias(null);
    try {
      const r = await fetch("/api/calendar");
      const j = await r.json() as { ok: boolean; grouped?: Record<string, CalendarEvent[]> };
      if (!j.ok || !j.grouped) throw new Error();
      setGrouped(j.grouped);
      const todays = j.grouped[todayKey] ?? [];
      if (todays.length) fetchBias(todays);
    } catch {
      setCalError(true);
    } finally {
      setCalLoading(false);
    }
  }, [todayKey, fetchBias]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const todayEvents = grouped[todayKey] ?? [];

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 pb-12">
      <div className="max-w-xl mx-auto flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-indigo-400 hover:text-indigo-300">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">📅 Calendrier Macro USD/JPY</h1>
        </div>

        {/* Error */}
        {calError && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 text-center flex flex-col gap-3">
            <p className="text-gray-400 text-sm">Données indisponibles</p>
            <button onClick={fetchCalendar} className="mx-auto flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-sm">
              <RefreshCw className="w-4 h-4" /> Réessayer
            </button>
          </div>
        )}

        {/* Week strip */}
        {!calError && (
          <div className="grid grid-cols-5 gap-1.5">
            {weekDays.map((day) => {
              const key = toParisDKey(day);
              const events = grouped[key] ?? [];
              const highCount = events.filter((e) => e.impact === "High").length;
              const medCount = events.filter((e) => e.impact === "Medium").length;
              const lowCount = events.filter((e) => e.impact === "Low").length;
              const isToday = key === todayKey;
              const isPast = day < todayMidnight;

              return (
                <div
                  key={key}
                  className="rounded-xl bg-gray-900/60 p-2 flex flex-col items-center gap-1"
                  style={{
                    border: isToday ? "2px solid #6366f1" : "1px solid rgb(31,41,55)",
                    opacity: isPast && !isToday ? 0.45 : 1,
                  }}
                >
                  <span className="text-xs text-gray-400">{DAY_LABELS[day.getDay()]}</span>
                  <span className={`text-sm font-bold ${isToday ? "text-indigo-400" : "text-gray-100"}`}>
                    {day.getDate()}
                  </span>
                  <div className="flex gap-0.5 flex-wrap justify-center min-h-[10px]">
                    {Array.from({ length: highCount }).map((_, i) => (
                      <span key={`h${i}`} className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    ))}
                    {Array.from({ length: medCount }).map((_, i) => (
                      <span key={`m${i}`} className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    ))}
                    {Array.from({ length: lowCount }).map((_, i) => (
                      <span key={`l${i}`} className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {calLoading && !calError && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 text-center">
            <p className="text-gray-400 text-sm animate-pulse">Chargement du calendrier…</p>
          </div>
        )}

        {/* Vigilance semaine */}
        {!calLoading && !calError && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vigilance de la semaine</p>
            <div className="flex flex-col gap-2">
              {weekDays.map((day) => {
                const key = toParisDKey(day);
                const events = grouped[key] ?? [];
                const v = getVigilance(events);
                const isToday = key === todayKey;
                const isPast = day < todayMidnight;
                const highEvents = events.filter((e) => e.impact === "High" || CRITICAL_KEYWORDS.some((kw) => e.title.toLowerCase().includes(kw)));
                const label = DAY_LABELS[day.getDay()] + " " + day.getDate();

                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{
                      background: isToday ? "rgba(99,102,241,0.08)" : "transparent",
                      opacity: isPast && !isToday ? 0.45 : 1,
                    }}
                  >
                    <span className={`text-sm w-14 shrink-0 ${isToday ? "text-indigo-400 font-bold" : "text-gray-400"}`}>
                      {label}
                    </span>
                    <VigilanceBadge v={v} />
                    {highEvents.length > 0 && (
                      <span className="text-xs text-gray-500 truncate flex-1">
                        {highEvents.map((e) => e.title).join(" · ")}
                      </span>
                    )}
                    {events.length === 0 && (
                      <span className="text-xs text-gray-600">Aucun événement USD/JPY</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Today recap card */}
        {!calLoading && !calError && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 flex flex-col gap-4">

            {/* Card header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base">Aujourd'hui · USD/JPY</span>
                <VigilanceBadge v={getVigilance(todayEvents)} />
                {bias && !biasLoading && <BiasBadge b={bias.bias} />}
                {biasLoading && <span className="text-xs text-gray-500 animate-pulse">Analyse en cours…</span>}
              </div>
              <button onClick={fetchCalendar} className="text-gray-500 hover:text-indigo-400 transition shrink-0" title="Rafraîchir">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* AI summary */}
            {bias?.summary && (
              <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-indigo-500 pl-3 italic">
                {bias.summary}
              </p>
            )}

            {/* No events */}
            {todayEvents.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-2">Aucun événement majeur USD/JPY aujourd'hui.</p>
            )}

            {/* Events grouped by currency */}
            {CURRENCY_ORDER.map((currency) => {
              const events = todayEvents.filter((e) => e.country === currency);
              if (!events.length) return null;

              return (
                <div key={currency} className="flex flex-col gap-2">
                  {/* Currency header */}
                  <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">{FLAG[currency]}</span>
                    <div>
                      <span className="text-sm font-bold text-gray-100">{currency}</span>
                      <span className="text-xs text-gray-500 ml-2">{CURRENCY_LABEL[currency]}</span>
                    </div>
                    <span className="ml-auto text-xs text-gray-600 tabular-nums">
                      {events.length} événement{events.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Event cards */}
                  {events.map((e, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-gray-950/70 border border-gray-800 p-3 flex items-start gap-3"
                      style={{ borderLeft: `3px solid ${e.impact === "High" ? "#ef4444" : e.impact === "Medium" ? "#f59e0b" : "#4b5563"}` }}
                    >
                      {/* Time */}
                      <div className="shrink-0 flex flex-col items-center pt-0.5">
                        <span className="text-xs font-mono font-semibold text-gray-300">{e.parisTime}</span>
                        <span className="text-xs text-gray-600">Paris</span>
                      </div>

                      {/* Divider */}
                      <div className="w-px self-stretch bg-gray-800 shrink-0" />

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-sm font-semibold text-gray-100 leading-snug">{e.title}</p>
                        {(e.forecast || e.previous || e.actual) && (
                          <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                            {e.forecast && <span>Prévu <span className="text-gray-300 font-medium">{e.forecast}</span></span>}
                            {e.previous && <span>Préc. <span className="text-gray-400">{e.previous}</span></span>}
                            {e.actual && <span>Réel <span className="text-emerald-400 font-semibold">{e.actual}</span></span>}
                          </div>
                        )}
                      </div>

                      {/* Impact */}
                      <div className="shrink-0 pt-0.5">
                        <ImpactPill impact={e.impact} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

          </div>
        )}

        {/* Legend */}
        {!calLoading && !calError && (
          <div className="flex gap-4 text-xs text-gray-600 justify-center">
            <span>🇺🇸 USD · 🇯🇵 JPY · 🇨🇳 CNY inclus</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Fort</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Moyen</span>
          </div>
        )}

      </div>
    </main>
  );
}
