"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { CalendarEvent } from "@/app/api/calendar/route";

type BiasData = { bias: "up" | "down" | "neutral"; summary: string } | null;

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

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

function BiasBadge({ b }: { b: "up" | "down" | "neutral" }) {
  if (b === "up")
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300">↑ Haussier</span>;
  if (b === "down")
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-900/60 text-rose-300">↓ Baissier</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-300">— Neutre</span>;
}

function ImpactPill({ impact }: { impact: "Medium" | "High" }) {
  if (impact === "High")
    return (
      <span className="px-1.5 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: "#FCEBEB", color: "#A32D2D" }}>
        Fort
      </span>
    );
  return (
    <span className="px-1.5 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: "#FAEEDA", color: "#854F0B" }}>
      Moyen
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
      // graceful degradation — pas de crash si l'API Claude échoue
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
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 pb-10">
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
            <button
              onClick={fetchCalendar}
              className="mx-auto flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-sm"
            >
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
              const isToday = key === todayKey;
              const isPast = day < todayMidnight;

              return (
                <div
                  key={key}
                  className="rounded-xl bg-gray-900/60 p-2 flex flex-col items-center gap-1 transition-opacity"
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
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {calLoading && !calError && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 text-center">
            <p className="text-gray-400 text-sm animate-pulse">Chargement du calendrier...</p>
          </div>
        )}

        {/* Today recap card */}
        {!calLoading && !calError && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 flex flex-col gap-3">

            {/* Card header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">Aujourd'hui · USD/JPY</span>
                {bias && !biasLoading && <BiasBadge b={bias.bias} />}
                {biasLoading && (
                  <span className="text-xs text-gray-500 animate-pulse">Analyse en cours…</span>
                )}
              </div>
              <button
                onClick={fetchCalendar}
                className="text-gray-500 hover:text-indigo-400 transition shrink-0"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* AI summary */}
            {bias?.summary && (
              <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-indigo-500 pl-3 italic">
                {bias.summary}
              </p>
            )}

            {/* Separator */}
            <div className="border-t border-gray-800" />

            {/* Events */}
            {todayEvents.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-2">
                Aucun événement majeur USD/JPY aujourd'hui.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {todayEvents.map((e, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm min-w-0">
                    <span className="text-gray-400 tabular-nums shrink-0 text-xs">{e.parisTime}</span>
                    <span className="flex-1 text-gray-100 truncate">{e.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-gray-500 font-medium">{e.country}</span>
                      <ImpactPill impact={e.impact} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Legend */}
        {!calLoading && !calError && (
          <div className="flex gap-4 text-xs text-gray-500 justify-center">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Fort impact</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Impact moyen</span>
          </div>
        )}

      </div>
    </main>
  );
}
