"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation"; // ✅ ajoute ça
import { ArrowLeft } from "lucide-react"; // ✅ import de l’icône

type Asset = { id: string; userId: string; assetName: string };
type Plan = { id: string; userId: string; title: string; createdAt: number };
type Step = { id: string; planId: string; title: string; order: number };

export default function SettingsPage() {
  const router = useRouter(); // ✅ ajoute ça

  const [assets, setAssets] = useState<Asset[]>([]);
  const [newAsset, setNewAsset] = useState("");
  const [assetBusy, setAssetBusy] = useState(false);

  // Plans & Steps
  // state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [newPlan, setNewPlan] = useState("");
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState(false); // ✅ nouveau

  const [steps, setSteps] = useState<Step[]>([]);
  const [newStep, setNewStep] = useState("");

  // initial load
  useEffect(() => {
    (async () => {
      await refreshAssets();
      await refreshPlans();
    })();
  }, []);

  useEffect(() => {
    if (!activePlanId) return;
    refreshSteps(activePlanId);
  }, [activePlanId]);

  async function refreshAssets() {
    try {
      const r = await fetch("/api/assets", { cache: "no-store" });
      if (r.status === 401) return router.replace("/login"); // ✅
      const j = await r.json();
      setAssets(Array.isArray(j.assets) ? j.assets : []);
    } catch {
      // facultatif: toast/etat d'erreur
    }
  }

  function normAssetName(s: string) {
    return s.trim();
  }

  // refresh plans (gère 401 + activePlanId cohérent)
  async function refreshPlans() {
    try {
      const r = await fetch("/api/plans", { cache: "no-store" });
      if (r.status === 401) return router.replace("/login");
      const j = await r.json();
      const list: Plan[] = Array.isArray(j.plans) ? j.plans : [];
      setPlans(list);

      if (!list.length) {
        setActivePlanId(null);
        setSteps([]);
        return;
      }

      // si l'actif n'existe plus, sélectionne le premier
      if (!activePlanId || !list.some((p) => p.id === activePlanId)) {
        setActivePlanId(list[0].id);
      }
    } catch {
      // option: toast d'erreur
    }
  }

  // pense aussi à 401 pour steps (optionnel mais cohérent)
  async function refreshSteps(planId: string) {
    const r = await fetch(`/api/plans/${planId}/steps`, { cache: "no-store" });
    if (r.status === 401) return router.replace("/login");
    const j = await r.json();
    setSteps(j.steps ?? []);
  }

  // CRUD Assets
  async function addAsset() {
    const name = normAssetName(newAsset);
    if (!name || assetBusy) return;
    setAssetBusy(true); // ✅

    try {
      const r = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetName: name }),
      });
      if (r.status === 401) return router.replace("/login"); // ✅
      if (!r.ok) {
        // Option simple: recharger la liste pour rester correct
        await refreshAssets();
        return;
      }
      const { asset } = await r.json();
      // ✅ Optimistic: ajoute localement sans refetch total
      setAssets((prev) =>
        prev.some((a) => a.id === asset.id) ? prev : [asset, ...prev]
      );
      setNewAsset("");
    } catch {
      // ignore/affiche erreur si tu veux
    } finally {
      setAssetBusy(false);
    }
  }

  async function deleteAsset(id: string) {
    if (assetBusy) return;
    setAssetBusy(true);
    // ✅ Optimistic: retire localement tout de suite
    setAssets((prev) => prev.filter((a) => a.id !== id));
    try {
      const r = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (r.status === 401) return router.replace("/login"); // ✅
      if (!r.ok) {
        // rollback simple si échec
        await refreshAssets();
      }
    } catch {
      await refreshAssets();
    } finally {
      setAssetBusy(false);
    }
  }

  // CRUD Plans
  // créer un plan (optimistic + anti double-clic + 401)
  async function addPlan() {
    const title = normTitle(newPlan);
    if (!title || planBusy) return;
    setPlanBusy(true);
    try {
      const r = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (r.status === 401) return router.replace("/login");
      if (!r.ok) {
        await refreshPlans(); // garde l'état cohérent
        return;
      }
      const { plan } = await r.json();
      // ✅ optimistic: ajoute localement et rend actif
      setPlans((prev) => [plan, ...prev]);
      setActivePlanId(plan.id);
      setNewPlan("");
    } catch {
      await refreshPlans();
    } finally {
      setPlanBusy(false);
    }
  }

  // supprimer un plan (URL corrigée + optimistic + 401)
  async function deletePlan(id: string) {
    if (planBusy) return;
    setPlanBusy(true);

    // optimistic: retire localement
    setPlans((prev) => prev.filter((p) => p.id !== id));
    if (activePlanId === id) {
      setActivePlanId(null);
      setSteps([]);
    }

    try {
      const r = await fetch(`/api/plans/${id}`, { method: "DELETE" }); // ✅ singulier
      if (r.status === 401) return router.replace("/login");
      if (!r.ok) {
        // rollback simple
        await refreshPlans();
      } else if (!activePlanId) {
        // si plus d'actif, choisis-en un si dispo
        const next = (await (await fetch("/api/plans")).json()).plans ?? [];
        if (next?.length) setActivePlanId(next[0].id);
      }
    } catch {
      await refreshPlans();
    } finally {
      setPlanBusy(false);
    }
  }

  // CRUD Steps
  async function addStep() {
    if (!activePlanId || !newStep.trim()) return;
    await fetch(`/api/plans/${activePlanId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newStep.trim() }),
    });
    setNewStep("");
    refreshSteps(activePlanId);
  }
  async function deleteStep(id: string) {
    await fetch(`/api/steps/${id}`, { method: "DELETE" });
    if (activePlanId) refreshSteps(activePlanId);
  }
  async function renameStep(id: string, title: string) {
    await fetch(`/api/steps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (activePlanId) refreshSteps(activePlanId);
  }
  async function moveStep(idx: number, dir: -1 | 1) {
    if (!activePlanId) return;
    const arr = [...steps];
    const j = idx,
      k = idx + dir;
    if (k < 0 || k >= arr.length) return;
    [arr[j], arr[k]] = [arr[k], arr[j]];
    // push new order to API
    await fetch(`/api/plans/${activePlanId}/steps/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepIds: arr.map((s) => s.id) }),
    });
    setSteps(arr);
  }

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === activePlanId) ?? null,
    [plans, activePlanId]
  );

  // utils
  function normTitle(s: string) {
    return s.trim();
  }

  return (
    <main className="pb-20 min-h-screen p-4 bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto grid gap-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-indigo-400 hover:text-indigo-300"
            title="Retour au Dashboard"
          >
            <ArrowLeft className="w-6 h-6" /> {/* icône */}
          </button>
          <h1 className="text-2xl font-bold">⚙️ Settings</h1>
        </div>

        {/* Assets */}
        <section className="rounded-2xl border border-gray-800 p-4 bg-gray-900/50">
          <h2 className="text-lg font-semibold mb-3">🪙 Assets</h2>
          <div className="flex gap-2 mb-3">
            <input
              value={newAsset}
              onChange={(e) => setNewAsset(e.target.value)}
              placeholder="Ex: USDJPY"
              className="flex-1 rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 outline-none"
            />
            <button
              onClick={addAsset}
              className="rounded-lg px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white"
            >
              Ajouter
            </button>
          </div>
          <ul className="space-y-2">
            {assets.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 px-3 py-2"
              >
                <span>{a.assetName}</span>
                <button
                  onClick={() => deleteAsset(a.id)}
                  className="text-rose-400 hover:underline"
                >
                  Supprimer
                </button>
              </li>
            ))}
            {assets.length === 0 && (
              <p className="text-gray-400 text-sm">Aucun asset.</p>
            )}
          </ul>
        </section>

        {/* Plans */}
        <section className="rounded-2xl border border-gray-800 p-4 bg-gray-900/50">
          <h2 className="text-lg font-semibold mb-3">🗂 Plans</h2>
          <div className="flex gap-2 mb-3">
            <input
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              placeholder="Ex: Plan JPY"
              className="flex-1 rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 outline-none"
            />
            <button
              onClick={addPlan}
              disabled={planBusy || !newPlan.trim()}
              className="rounded-lg px-3 py-2 bg-indigo-500 disabled:opacity-60 hover:bg-indigo-400 text-white"
            >
              {planBusy ? "Création..." : "Créer"}
            </button>
          </div>
          <div className="grid gap-2">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  p.id === activePlanId
                    ? "border-indigo-500"
                    : "border-gray-800"
                }`}
              >
                <button
                  onClick={() => setActivePlanId(p.id)}
                  className="text-left flex-1 hover:underline"
                >
                  {p.title}
                </button>
                <button
                  onClick={() => deletePlan(p.id)}
                  className="text-rose-400 hover:underline"
                >
                  Supprimer
                </button>
              </div>
            ))}
            {plans.length === 0 && (
              <p className="text-gray-400 text-sm">Aucun plan.</p>
            )}
          </div>
        </section>

        {/* Steps du plan sélectionné */}
        <section className="rounded-2xl border border-gray-800 p-4 bg-gray-900/50">
          <h2 className="text-lg font-semibold mb-3">
            ✅ Étapes {selectedPlan ? `— ${selectedPlan.title}` : ""}
          </h2>
          {!selectedPlan ? (
            <p className="text-gray-400 text-sm">Sélectionne un plan.</p>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                <input
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  placeholder="Ex: Scanner USDJPY"
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 outline-none"
                />
                <button
                  onClick={addStep}
                  className="rounded-lg px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white"
                >
                  Ajouter
                </button>
              </div>

              <ul className="space-y-2">
                {steps.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-800 px-3 py-2"
                  >
                    <button onClick={() => moveStep(i, -1)} className="px-2">
                      ↑
                    </button>
                    <button onClick={() => moveStep(i, +1)} className="px-2">
                      ↓
                    </button>
                    <input
                      defaultValue={s.title}
                      onBlur={(e) => renameStep(s.id, e.target.value)}
                      className="flex-1 rounded bg-transparent outline-none"
                    />
                    <button
                      onClick={() => deleteStep(s.id)}
                      className="text-rose-400 hover:underline"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
                {steps.length === 0 && (
                  <p className="text-gray-400 text-sm">Aucune étape.</p>
                )}
              </ul>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
