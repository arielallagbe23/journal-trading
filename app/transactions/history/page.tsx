"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";

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
  respectPlan?: number; // 0..100
  confidence?: boolean | null; // oui/non/null
};

export default function HistoryPage() {
  const router = useRouter();
  const [closedTx, setClosedTx] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
const perPage = 10;

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

  return (
    <main className="min-h-screen p-4 bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto grid gap-6">
        {/* Header */}
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
            Historique des transactions
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="py-2 px-2">Actif</th>
                    <th className="py-2 px-2">TF</th>
                    <th className="py-2 px-2">Entrée</th>
                    <th className="py-2 px-2">Sortie</th>
                    <th className="py-2 px-2">Résultat</th>
                    <th className="py-2 px-2">Profit</th>
                    <th className="py-2 px-2">Respect</th>
                    <th className="py-2 px-2">Confiance</th>
                    <th className="py-2 px-2">Avant</th>
                    <th className="py-2 px-2">Après</th>
                  </tr>
                </thead>
                <tbody>
  {paginatedTx.map((t) => (
    <tr
      key={t.id}
      className="border-t border-gray-800 hover:bg-gray-800/30 transition"
    >
                      <td className="py-2 px-2">{t.asset}</td>
                      <td className="py-2 px-2">{t.timeframe}</td>
                      <td className="py-2 px-2">
                        {new Date(t.dateIn).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2 px-2">
                        {t.dateOut
                          ? new Date(t.dateOut).toLocaleString("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td className="py-2 px-2">
                        {t.result ? (
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              t.result === "win"
                                ? "bg-emerald-600/20 text-emerald-300"
                                : "bg-rose-600/20 text-rose-300"
                            }`}
                          >
                            {t.result === "win" ? "Win" : "Loss"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {typeof t.profit === "number" && t.result ? (
                          t.result === "win" ? (
                            <span className="text-emerald-300">
                              +{Math.abs(t.profit).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-rose-300">
                              -{Math.abs(t.profit).toFixed(2)}
                            </span>
                          )
                        ) : typeof t.profit === "number" ? (
                          // au cas où on a un profit mais pas de result (fallback neutre)
                          <span
                            className={
                              t.profit >= 0
                                ? "text-emerald-300"
                                : "text-rose-300"
                            }
                          >
                            {t.profit.toFixed(2)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {typeof t.respectPlan === "number"
                          ? `${t.respectPlan}%`
                          : "—"}
                      </td>
                      <td className="py-2 px-2">
                        {t.confidence === true
                          ? "Oui"
                          : t.confidence === false
                          ? "Non"
                          : "—"}
                      </td>
                      <td className="py-2 px-2">{t.emotionBefore || "—"}</td>
                      <td className="py-2 px-2">{t.emotionAfter || "—"}</td>
                    </tr>
                  ))}
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
