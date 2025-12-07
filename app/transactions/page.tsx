"use client";

import { Fragment, useEffect, useState, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Folder,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { parseMt5HistoryText, ParsedOcrTrade } from "@/lib/mt5Ocr";
import type Tesseract from "tesseract.js";

type Plan = { id: string; title: string };
type Step = { id: string; title: string };
type Asset = { id: string; assetName: string };

export default function TransactionsPage() {
  const router = useRouter();

  // form création
  const [asset, setAsset] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [emotionBefore, setEmotionBefore] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [checkedSteps, setCheckedSteps] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  // --- états supplémentaires pour l’édition ---
  const [editConfidence, setEditConfidence] = useState<boolean | null>(null);
  const [editEmotionAfter, setEditEmotionAfter] = useState("");
  const [editResult, setEditResult] = useState<"win" | "loss" | "">("");
  const [editProfit, setEditProfit] = useState<string>(""); // string pour l’input

  const initEditRestore = useRef(false);
  const initialCheckedFromTx = useRef<string[]>([]);

  // Select reset stylé, compatible iOS/Safari
  function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    const { className = "", ...rest } = props;
    return (
      <div className="relative">
        <select
          {...rest}
          className={
            "mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 " +
            "px-3 py-2 pr-9 outline-none appearance-none " + // <-- le cœur du fix
            "focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 " +
            "disabled:opacity-60 " +
            className
          }
        />
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          aria-hidden="true"
        />
      </div>
    );
  }

  // liste des transactions ouvertes
  const [openTx, setOpenTx] = useState<
    {
      id: string;
      asset: string;
      dateIn: string;
      timeframe?: string;
      emotionBefore?: string;
      planId?: string | null;
      checkedStepIds?: string[];
    }[]
  >([]);

  // --- ÉDITION INLINE (ETATS + HANDLERS) ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAsset, setEditAsset] = useState("");
  const [editTimeframe, setEditTimeframe] = useState("");
  const [editEmotionBefore, setEditEmotionBefore] = useState("");

  // 👇 AJOUT pour plan/étapes en mode édition
  const [editSelectedPlan, setEditSelectedPlan] = useState(""); // plan choisi dans l’édition
  const [editSteps, setEditSteps] = useState<Step[]>([]); // étapes du plan sélectionné (édition)
  const [editCheckedSteps, setEditCheckedSteps] = useState<string[]>([]); // étapes cochées (édition)

  function computePct(done: number, total: number) {
    if (total <= 0) return 0;
    return Math.round((done / total) * 100);
  }

  function strengthColor(pct: number) {
    // style "mot de passe" : rouge → orange → jaune → vert
    if (pct === 0) return "bg-rose-600";
    if (pct < 35) return "bg-orange-500";
    if (pct < 70) return "bg-yellow-400";
    if (pct < 100) return "bg-lime-400";
    return "bg-emerald-500";
  }

  function handleUseParsedRow(row: ParsedOcrTrade) {
    setAsset(row.symbol);
    setEmotionBefore((prev) =>
      prev
        ? prev
        : row.side === "buy"
        ? "confiant"
        : "indecis"
    );
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      /* no-op */
    }
  }

  function startEdit(tx: any) {
    setEditingId(tx.id);
    setEditAsset(tx.asset ?? "");
    setEditTimeframe(tx.timeframe ?? "");
    setEditEmotionBefore(tx.emotionBefore ?? "");
    setEditConfidence(
      typeof tx.confidence === "boolean" ? tx.confidence : null
    );
    setEditEmotionAfter(tx.emotionAfter ?? "");
    setEditResult(tx.result ?? "");
    setEditProfit(typeof tx.profit === "number" ? String(tx.profit) : "");

    // ✅ init plan + steps + checked depuis la tx
    const checked = Array.isArray(tx.checkedStepIds) ? tx.checkedStepIds : [];
    initialCheckedFromTx.current = checked;
    initEditRestore.current = true; // marqueur: première restauration
    setEditSelectedPlan(tx.planId ?? ""); // ⚠️ déclenche l'useEffect ci-dessous
    setEditSteps([]);
    setEditCheckedSteps(checked); // valeur provisoire (sera ré-intersectée après fetch)
  }

  // helper d'intersection
  const intersect = (a: string[], bIds: string[]) => {
    const allowed = new Set(bIds);
    return a.filter((id) => allowed.has(id));
  };

  function cancelEdit() {
    setEditingId(null);
    setEditAsset("");
    setEditTimeframe("");
    setEditEmotionBefore("");
    setEditConfidence(null);
    setEditEmotionAfter("");
    setEditResult("");
    setEditProfit("");

    // 👇 reset plan/étapes (édition)
    setEditSelectedPlan("");
    setEditSteps([]);
    setEditCheckedSteps([]);
  }

  useEffect(() => {
    if (!editingId) return; // seulement en mode édition
    if (!editSelectedPlan) {
      setEditSteps([]);
      setEditCheckedSteps([]);
      return;
    }
    let aborted = false;

    (async () => {
      const r = await fetch(`/api/plans/${editSelectedPlan}/steps`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const j = await r.json();
      if (aborted) return;

      const steps = j.steps ?? [];
      setEditSteps(steps);

      const stepIds = steps.map((s: Step) => s.id);

      if (initEditRestore.current) {
        // 1er chargement : on part de ce qui vient de la transaction
        const restored = intersect(initialCheckedFromTx.current, stepIds);
        setEditCheckedSteps(restored);
        initEditRestore.current = false;
      } else {
        // changement de plan en cours d'édition : on garde ce qui existe dans le nouveau plan
        setEditCheckedSteps((prev) => intersect(prev, stepIds));
      }
    })();

    return () => {
      aborted = true;
    };
  }, [editSelectedPlan, editingId]);

  function toggleEditStep(id: string) {
    setEditCheckedSteps((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function saveEdit() {
    if (!editingId) return;

    const res = await fetch(`/api/transactions/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asset: editAsset,
        timeframe: editTimeframe,
        emotionBefore: editEmotionBefore,
        confidence: editConfidence,
        emotionAfter: editEmotionAfter || null,
        result: editResult || null,
        profit: editProfit === "" ? null : Number(editProfit),

        // ✅ important pour le calcul serveur
        planId: editSelectedPlan || null,
        checkedStepIds: editCheckedSteps,
        // ❌ plus nécessaire si le serveur recalcule : respectSteps/totalSteps
      }),
    });

    const j = await res.json();
    if (!res.ok) return alert(j?.error ?? "Erreur de mise à jour");

    // MAJ locale (si tu affiches ces infos quelque part)
    setOpenTx((prev) =>
      prev.map((t) =>
        t.id === editingId
          ? {
              ...t,
              asset: editAsset,
              timeframe: editTimeframe,
              emotionBefore: editEmotionBefore,
              confidence: editConfidence,
              emotionAfter: editEmotionAfter || null,
              result: (editResult as any) || null,
              profit: editProfit === "" ? null : Number(editProfit),
              planId: editSelectedPlan || null,
              checkedStepIds: editCheckedSteps,
            }
          : t
      )
    );
    cancelEdit();
  }

  async function closeEdit() {
    if (!editingId) return;
    if (!editResult) return alert("Choisis le résultat (win / loss)");
    if (editProfit === "")
      return alert("Renseigne le profit (positif ou négatif)");

    const profitNum = Number(editProfit);
    if (!Number.isFinite(profitNum)) return alert("Profit invalide");

    const body = {
      asset: editAsset,
      timeframe: editTimeframe,
      emotionBefore: editEmotionBefore,
      confidence: editConfidence,
      emotionAfter: editEmotionAfter || "",
      result: editResult,
      profit: profitNum,
      status: "closed" as const,
      dateOut: new Date().toISOString(),

      // ✅ indispensable
      planId: editSelectedPlan || null,
      checkedStepIds: editCheckedSteps,
    };

    const res = await fetch(`/api/transactions/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const j = await res.json();
    if (!res.ok) return alert(j?.error ?? "Erreur de clôture");

    setOpenTx((prev) => prev.filter((t) => t.id !== editingId));
    cancelEdit();
  }

  // --- FETCHS INIT ---
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/plans", { cache: "no-store" });
      const j = await r.json();
      setPlans(j.plans ?? []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/assets", { cache: "no-store" });
      const j = await r.json();
      setAssets(j.assets ?? []);
    })();
  }, []);

  // steps du plan
  useEffect(() => {
    if (!selectedPlan) {
      setSteps([]);
      setCheckedSteps([]);
      return;
    }
    (async () => {
      const r = await fetch(`/api/plans/${selectedPlan}/steps`, {
        cache: "no-store",
      });
      const j = await r.json();
      setSteps(j.steps ?? []);
      setCheckedSteps([]);
    })();
  }, [selectedPlan]);

  // liste des transactions (ouvertes)
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/transactions", { cache: "no-store" });
      const j = await r.json();
      const txs = j.transactions ?? [];
      setOpenTx(txs.filter((t: any) => t.status === "open"));
    })();
  }, [message]); // recharge après création

  // check/uncheck une étape
  function toggleStep(id: string) {
    setCheckedSteps((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  // création transaction
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          timeframe,
          emotionBefore,

          // ✅ nouveau contrat (serveur recalcule respectPlan)
          planId: selectedPlan || null,
          checkedStepIds: checkedSteps,

          // ❌ optionnel/fallback : respectSteps/totalSteps plus nécessaires
          // respectSteps: checkedSteps.length,
          // totalSteps: steps.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ Erreur: ${data.error ?? "inconnue"}`);
      } else {
        setMessage("✅ Transaction créée !");
        setAsset("");
        setTimeframe("");
        setEmotionBefore("");
        setSelectedPlan("");
        setSteps([]);
        setCheckedSteps([]);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Erreur réseau");
    }
  }

  function JaugeRespect({ done, total }: { done: number; total: number }) {
    const pct = computePct(done, total);
    return (
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Respect des étapes</span>
          <span>
            {done}/{total} ({pct}%)
          </span>
        </div>
        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${strengthColor(
              pct
            )} transition-all duration-300`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <main className="pb-20 min-h-screen p-4 bg-gray-950 text-gray-100">
      <div className="max-w-xl mx-auto grid gap-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-indigo-400 hover:text-indigo-300"
            title="Retour au Dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">➕ Nouvelle Transaction</h1>
        </div>

        <ImageImportPanel onUseRow={handleUseParsedRow} />

        {/* Form */}
        <section className="rounded-2xl border border-gray-800 p-4 bg-gray-900/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Asset */}
            <div>
              {/* Asset */}
              <label className="block text-sm text-gray-300">Asset</label>
              <Select value={asset} onChange={(e) => setAsset(e.target.value)}>
                <option value="">-- Choisir un actif --</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.assetName}>
                    {a.assetName}
                  </option>
                ))}
              </Select>
            </div>

            {/* Timeframe */}
            <div>
              <label className="block text-sm text-gray-300">Timeframe</label>
              <Select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                <option value="">-- Choisir un timeframe --</option>
                <option value="H1">H1</option>
                <option value="H4">H4</option>
                <option value="D1">D1</option>
              </Select>
            </div>

            {/* Plan */}
            <div>
              <label className="block text-sm text-gray-300">Plan</label>
              <Select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                <option value="">-- Choisir un plan --</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </div>

            {/* Étapes */}
            {steps.length > 0 && (
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Étapes du plan
                </label>
                <ul className="space-y-2">
                  {steps.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checkedSteps.includes(s.id)}
                        onChange={() => toggleStep(s.id)}
                        className="accent-indigo-500"
                      />
                      <span>{s.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Émotion avant */}
            <div>
              <label className="block text-sm text-gray-300">
                Émotion avant
              </label>
              <Select
                value={emotionBefore}
                onChange={(e) => setEmotionBefore(e.target.value)}
              >
                <option value="">-- Choisir une émotion --</option>
                <option value="indecis">indecis</option>
                <option value="confiant">confiant</option>
                <option value="mitigé">mitigé</option>
              </Select>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold"
            >
              Ajouter
            </button>
          </form>

          {message && <p className="mt-4 text-sm text-gray-200">{message}</p>}
        </section>

        {/* Tableau des transactions ouvertes */}
        {openTx.length > 0 && (
          <section className="mb-20 rounded-2xl border border-gray-800 p-4 bg-gray-900/50">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
              <Folder className="w-5 h-5 text-indigo-400" />
              Transactions ouvertes
            </h2>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2 px-2">Actif</th>
                  <th className="py-2 px-2">Date entrée</th>
                  <th className="py-2 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {openTx.map((tx) => (
                  <Fragment key={tx.id}>
                    <tr className="border-t border-gray-800 hover:bg-gray-800/30 transition">
                      <td className="py-2 px-2">{tx.asset}</td>
                      <td className="py-2 px-2">
                        {new Date(tx.dateIn).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(tx)}
                            className="p-2 rounded bg-yellow-500 hover:bg-yellow-400 text-white"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              await fetch(`/api/transactions/${tx.id}`, {
                                method: "DELETE",
                              });
                              setOpenTx((prev) =>
                                prev.filter((t) => t.id !== tx.id)
                              );
                            }}
                            className="p-2 rounded bg-rose-500 hover:bg-rose-400 text-white"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {editingId === tx.id && (
                      <tr className="border-t border-gray-800 bg-gray-900/60">
                        <td colSpan={3} className="py-3 px-2">
                          <div className="grid md:grid-cols-3 gap-3">
                            {/* --- Plan & Étapes (édition) --- */}
                            <div className="md:col-span-3 rounded-lg border border-gray-800 p-3 bg-gray-900/70">
                              {/* Sélecteur du plan */}
                              <div className="mb-2">
                                <label className="block text-xs text-gray-400">
                                  Plan
                                </label>
                                <Select
                                  value={editSelectedPlan}
                                  onChange={(e) =>
                                    setEditSelectedPlan(e.target.value)
                                  }
                                >
                                  <option value="">
                                    -- Choisir un plan --
                                  </option>
                                  {plans.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.title}
                                    </option>
                                  ))}
                                </Select>
                              </div>

                              {/* Étapes du plan */}
                              {editSteps.length > 0 && (
                                <div className="space-y-2">
                                  <label className="block text-xs text-gray-400">
                                    Étapes du plan
                                  </label>
                                  <ul className="space-y-2">
                                    {editSteps.map((s) => (
                                      <li
                                        key={s.id}
                                        className="flex items-center gap-2"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={editCheckedSteps.includes(
                                            s.id
                                          )}
                                          onChange={() => toggleEditStep(s.id)}
                                          className="accent-indigo-500"
                                        />
                                        <span>{s.title}</span>
                                      </li>
                                    ))}
                                  </ul>

                                  {/* Jauge de respect */}
                                  <JaugeRespect
                                    done={editCheckedSteps.length}
                                    total={editSteps.length}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Asset */}
                            <div>
                              <label className="block text-xs text-gray-400">
                                Asset
                              </label>
                              <Select
                                value={editAsset}
                                onChange={(e) => setEditAsset(e.target.value)}
                              >
                                <option value="">-- Choisir un actif --</option>
                                {assets.map((a) => (
                                  <option key={a.id} value={a.assetName}>
                                    {a.assetName}
                                  </option>
                                ))}
                              </Select>
                            </div>

                            {/* Timeframe */}
                            <div>
                              <label className="block text-xs text-gray-400">
                                Timeframe
                              </label>
                              <Select
                                value={editTimeframe}
                                onChange={(e) =>
                                  setEditTimeframe(e.target.value)
                                }
                              >
                                <option value="">
                                  -- Choisir un timeframe --
                                </option>
                                <option value="M15">M15</option>
                                <option value="H1">H1</option>
                                <option value="H4">H4</option>
                                <option value="D1">D1</option>
                              </Select>
                            </div>

                            {/* Émotion avant */}
                            <div>
                              <label className="block text-xs text-gray-400">
                                Émotion avant
                              </label>
                              <Select
                                value={editEmotionBefore}
                                onChange={(e) =>
                                  setEditEmotionBefore(e.target.value)
                                }
                              >
                                <option value="">
                                  -- Choisir une émotion --
                                </option>
                                <option value="Confiant">😎 Confiant</option>
                                <option value="Stressé">😬 Stressé</option>
                                <option value="Indécis">🤔 Indécis</option>
                              </Select>
                            </div>

                            {/* Confiance stratégie */}
                            <div>
                              <label className="block text-xs text-gray-400">
                                Confiance stratégie
                              </label>
                              <Select
                                value={
                                  editConfidence === null
                                    ? ""
                                    : editConfidence
                                    ? "yes"
                                    : "no"
                                }
                                onChange={(e) =>
                                  setEditConfidence(
                                    e.target.value === ""
                                      ? null
                                      : e.target.value === "yes"
                                  )
                                }
                              >
                                <option value="">— Non renseigné —</option>
                                <option value="yes">Oui</option>
                                <option value="no">Non</option>
                              </Select>
                            </div>

                            {/* Émotion après */}
                            <div>
                              <label className="block text-xs text-gray-400">
                                Émotion après
                              </label>
                              <Select
                                value={editEmotionAfter}
                                onChange={(e) =>
                                  setEditEmotionAfter(e.target.value)
                                }
                              >
                                <option value="">— Non renseigné —</option>
                                <option value="Confiant">😎 Confiant</option>
                                <option value="Stressé">😬 Stressé</option>
                                <option value="Indécis">🤔 Indécis</option>
                              </Select>
                            </div>

                            {/* Résultat & Profit */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-400">
                                  Résultat
                                </label>
                                <Select
                                  value={editResult}
                                  onChange={(e) =>
                                    setEditResult(
                                      e.target.value as "win" | "loss" | ""
                                    )
                                  }
                                >
                                  <option value="">— N/A —</option>
                                  <option value="win">✅ Win</option>
                                  <option value="loss">❌ Loss</option>
                                </Select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400">
                                  Profit
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editProfit}
                                  onChange={(e) =>
                                    setEditProfit(e.target.value)
                                  }
                                  placeholder="ex: 12.50 ou -8"
                                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              onClick={cancelEdit}
                              type="button"
                              className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={saveEdit}
                              type="button"
                              className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={closeEdit}
                              type="button"
                              className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
                              title="Clôturer la transaction"
                            >
                              Clôturer
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}

type ImageImportPanelProps = {
  onUseRow?: (row: ParsedOcrTrade) => void;
};

function ImageImportPanel({ onUseRow }: ImageImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "processing" | "done" | "error">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedOcrTrade[]>([]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(file: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPhase("processing");
    setProgress(0);
    setError(null);
    setRows([]);

    try {
      type TesseractImport = Tesseract & { default?: Tesseract };
      const tesseract = (await import("tesseract.js")) as TesseractImport;
      const recognizeFn: Tesseract["recognize"] | undefined =
        tesseract.recognize ?? tesseract.default?.recognize;
      if (!recognizeFn) throw new Error("OCR indisponible");

      const result = await recognizeFn(file, "eng", {
        logger: (msg: Tesseract.LoggerMessage) => {
          if (typeof msg?.progress === "number") {
            setProgress(Math.round(msg.progress * 100));
          }
        },
      });

      const text = result?.data?.text ?? "";
      const parsed = parseMt5HistoryText(text);
      setRows(parsed);
      setPhase("done");
      if (parsed.length === 0) {
        setError(
          "Aucune ligne sûre détectée. Utilise une capture plus nette ou recadre l’historique."
        );
      }
    } catch (err) {
      console.error("OCR error:", err);
      setError(
        "Impossible de lire l’image. Vérifie la connexion et la netteté de la capture."
      );
      setPhase("error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-300 grid place-items-center">
          <ImageIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Import via capture</h2>
          <p className="text-xs text-gray-400">
            Dépose ta capture MT5, on OCRise et on alimente un tableau prêt à
            valider.
          </p>
        </div>
      </div>

      <label className="cursor-pointer border-2 border-dashed border-gray-700 hover:border-indigo-400 transition rounded-2xl p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onInputChange}
        />
        <div className="flex flex-col items-center gap-2 text-sm text-gray-400">
          <span className="text-indigo-300 font-medium">
            {phase === "processing" ? "Lecture en cours…" : "Déposer / Choisir"}
          </span>
          <p className="text-xs">
            JPG, PNG ou capture iOS. Idéalement zoomée sur l’onglet
            “Transactions”.
          </p>
        </div>
      </label>

      {previewUrl && (
        <div className="relative rounded-xl overflow-hidden border border-gray-800 h-80">
          <NextImage
            src={previewUrl}
            alt="Capture importée"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
            unoptimized
            priority={false}
          />
        </div>
      )}

      {phase === "processing" && (
        <div className="flex items-center gap-3 text-sm text-gray-200">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          OCR {progress}%
        </div>
      )}

      {phase === "done" && !error && rows.length > 0 && (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-300 border-b border-gray-800 bg-gray-900/70">
            <CheckCircle2 className="w-4 h-4" />
            {rows.length} transaction(s) détectée(s)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-gray-400 text-left">
                  <th className="px-3 py-2">Actif</th>
                  <th className="px-3 py-2">Volume</th>
                  <th className="px-3 py-2">Entrée → Sortie</th>
                  <th className="px-3 py-2">Sortie</th>
                  <th className="px-3 py-2">P&L</th>
                  {onUseRow && <th className="px-3 py-2 text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-800 text-gray-100"
                  >
                    <td className="px-3 py-2">
                      <div className="font-semibold">{row.symbol}</div>
                      <p className="text-xs text-gray-400">
                        {row.side.toUpperCase()}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      {row.volume !== null ? row.volume : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.entryPrice !== null && row.exitPrice !== null ? (
                        <span>
                          {row.entryPrice} → {row.exitPrice}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.closedAt
                        ? new Date(row.closedAt).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {row.profit === null ? (
                        "—"
                      ) : (
                        <span
                          className={
                            row.profit >= 0
                              ? "text-emerald-300"
                              : "text-rose-300"
                          }
                        >
                          {row.profit >= 0 ? "+" : ""}
                          {row.profit.toFixed(2)}
                        </span>
                      )}
                    </td>
                    {onUseRow && (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onUseRow(row)}
                          className="px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs"
                        >
                          Pré-remplir
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-3 py-2 text-xs text-gray-400 border-t border-gray-800">
            Vérifie chaque ligne avant de créer officiellement la transaction.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </section>
  );
}
