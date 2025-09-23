"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  History,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
} from "lucide-react";

type Tx = {
  id: string;
  asset: string;
  timeframe: string;
  dateIn: string;
  dateOut: string | null;
  status: "open" | "closed";
  result: "win" | "loss" | null;
  profit: number | null;
  emotionBefore?: string | null;
  emotionAfter?: string | null;
  respectPlan?: number;
  confidence?: boolean | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const [closedTx, setClosedTx] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const perPage = 10;
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});

  const totalPages = Math.ceil(closedTx.length / perPage);
  const paginatedTx = closedTx.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/transactions", { cache: "no-store" });
        const j = await r.json();
        const txs: Tx[] = j.transactions ?? [];
        setClosedTx(
          txs
            .filter((t) => t.status === "closed")
            .sort(
              (a, b) =>
                (b.dateOut ? Date.parse(b.dateOut) : 0) -
                (a.dateOut ? Date.parse(a.dateOut) : 0)
            )
        );
      } catch {
        setErr("Impossible de charger l’historique.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function fmtDate(dt?: string | null) {
    if (!dt) return "—";
    try {
      return new Date(dt).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return "—";
    }
  }

  function resultPill(result: Tx["result"]) {
    if (!result) return "—";
    const isWin = result === "win";
    return (
      <span
        className={`px-2 py-1 rounded text-xs ${
          isWin
            ? "bg-emerald-600/20 text-emerald-300"
            : "bg-rose-600/20 text-rose-300"
        }`}
      >
        {isWin ? "Win" : "Loss"}
      </span>
    );
  }

  function fmtProfit(t: Tx) {
    if (typeof t.profit !== "number") return "—";
    const val = Math.abs(t.profit).toFixed(2);
    if (t.result === "win")
      return <span className="text-emerald-300">+{val}</span>;
    if (t.result === "loss")
      return <span className="text-rose-300">-{val}</span>;
    return (
      <span className={t.profit >= 0 ? "text-emerald-300" : "text-rose-300"}>
        {t.profit.toFixed(2)}
      </span>
    );
  }

  function toggleRow(id: string) {
    setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleDelete(id: string) {
    // petite confirmation
    const ok = confirm("Supprimer définitivement cette transaction ?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "Suppression impossible");
        return;
      }
      // MAJ optimiste locale
      setClosedTx((prev) => prev.filter((t) => t.id !== id));
      // si on supprime la dernière de la page, on recule d’une page si possible
      setPage((p) => {
        const newTotal = Math.ceil((closedTx.length - 1) / perPage);
        return Math.min(p, Math.max(1, newTotal));
      });
    } catch {
      alert("Erreur réseau pendant la suppression");
    }
  }

  return (
    <main className="min-h-screen p-4 bg-gray-950 text-gray-100">
      <div className="max-w-xl mx-auto grid gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/transactions")}
            className="text-indigo-400 hover:text-indigo-300"
            title="Retour aux transactions"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" />
            Historique transactions
          </h1>
        </div>

        <section className="rounded-2xl border border-gray-800 p-4 bg-gray-900/50">
          {loading ? (
            <p className="text-gray-400 text-sm">Chargement…</p>
          ) : err ? (
            <p className="text-rose-400 text-sm">{err}</p>
          ) : closedTx.length === 0 ? (
            <p className="text-gray-400 text-sm">
              Aucune transaction clôturée.
            </p>
          ) : (
            <div className="overflow-hidden">
              {/* Mobile-first: 3 colonnes -> Actif / Sortie / Résultat */}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="py-2 px-2 w-[20%] text-center">Actif</th>
                    <th className="py-2 px-2 w-[50%] text-center">Sortie</th>
                    <th className="py-2 px-2 w-[30%] text-center">Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTx.map((t) => {
                    const open = !!openRows[t.id];
                    return (
                      <Fragment key={t.id}>
                        <tr
                          className="border-t border-gray-800 hover:bg-gray-800/30 cursor-pointer"
                          onClick={() => toggleRow(t.id)}
                          aria-expanded={open}
                        >
                          <td className="py-2 px-2 w-[20%] text-center">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{t.asset}</span>
                              {t.result === "win" ? (
                                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                              ) : t.result === "loss" ? (
                                <ArrowDownRight className="w-4 h-4 text-rose-400" />
                              ) : null}
                            </div>
                          </td>
                          <td className="py-2 px-2 w-[50%] text-center">
                            {fmtDate(t.dateOut)}
                          </td>
                          <td className="py-2 px-2 w-[30%] text-center">
                            {resultPill(t.result)}
                            <span className="inline-block align-middle ml-1 text-gray-400">
                              {open ? (
                                <ChevronUp className="w-4 h-4 inline-block" />
                              ) : (
                                <ChevronDown className="w-4 h-4 inline-block" />
                              )}
                            </span>
                          </td>
                        </tr>

                        {open && (
                          <tr className="bg-gray-900/60 border-t border-gray-800">
                            <td colSpan={3} className=" pb-2 pt-2">
                              <div className="flex flex-col space-y-2 rounded-lg">
                                {/* Ligne 1 : Timeframe / Entrée / Profit */}
                                <div className="flex w-full space-x-2">
                                  <div className="w-1/4 rounded-lg border border-gray-800 p-2 text-center">
                                    <div className="text-[11px] text-gray-400">
                                      Timeframe
                                    </div>
                                    <div className="text-sm">
                                      {t.timeframe || "—"}
                                    </div>
                                  </div>
                                  <div className="w-2/4 rounded-lg border border-gray-800 p-2 text-center">
                                    <div className="text-[11px] text-gray-400">
                                      Entrée
                                    </div>
                                    <div className="text-sm">
                                      {fmtDate(t.dateIn)}
                                    </div>
                                  </div>
                                  <div className="w-1/4 rounded-lg border border-gray-800 p-2 text-center">
                                    <div className="text-[11px] text-gray-400">
                                      Profit
                                    </div>
                                    <div className="text-sm">
                                      {fmtProfit(t)}
                                    </div>
                                  </div>
                                </div>

                                {/* Ligne 2 : Émotions */}
                                <div className="flex w-full space-x-2">
                                  <div className="flex-1 rounded-lg border border-gray-800 p-2">
                                    <div className="text-[11px] text-gray-400">
                                      Émotion avant
                                    </div>
                                    <div className="text-sm">
                                      {t.emotionBefore || "—"}
                                    </div>
                                  </div>
                                  <div className="flex-1 rounded-lg border border-gray-800 p-2">
                                    <div className="text-[11px] text-gray-400">
                                      Émotion après
                                    </div>
                                    <div className="text-sm">
                                      {t.emotionAfter || "—"}
                                    </div>
                                  </div>
                                </div>



                                {/* Ligne 3 : Respect du plan / Confiance / Supprimer */}
<div className="flex w-full gap-2 items-stretch">
  {/* Respect du plan */}
  <div className="w-1/3 rounded-lg border border-gray-800 p-2 flex flex-col justify-between min-h-[64px]">
    <div className="text-[11px] text-gray-400">Respect du plan</div>
    <div className="text-sm">
      {typeof t.respectPlan === "number" ? `${t.respectPlan}%` : "—"}
    </div>
  </div>

  {/* Confiance */}
  <div className="w-1/3 rounded-lg border border-gray-800 p-2 flex flex-col justify-between min-h-[64px]">
    <div className="text-[11px] text-gray-400">Confiance</div>
    <div className="text-sm">
      {t.confidence === true ? "Oui" : t.confidence === false ? "Non" : "—"}
    </div>
  </div>

  {/* Bouton (1/3, même hauteur) */}
  <div className="w-1/3">
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleDelete(t.id);
      }}
      className="w-full h-full rounded-lg border border-gray-800 bg-rose-600/80 hover:bg-rose-500 text-white flex items-center justify-center shadow"
      aria-label="Supprimer"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  </div>
</div>


                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded bg-gray-800 text-gray-300 disabled:opacity-50"
                  >
                    ◀ Précédent
                  </button>
                  <span className="text-gray-400">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 rounded bg-gray-800 text-gray-300 disabled:opacity-50"
                  >
                    Suivant ▶
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
