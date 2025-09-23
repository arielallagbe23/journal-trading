"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "./LoadingSpinner";

type Me =
  | { authenticated: false }
  | { authenticated: true; user: { email?: string | null; nickname?: string | null } | null };

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as unknown;

      // garde-fou de forme
      const isAuth =
        typeof (data as any)?.authenticated === "boolean"
          ? (data as any).authenticated
          : false;

      if (!isAuth) {
        setMe({ authenticated: false });
        router.replace("/login");
        return;
      }

      const user = (data as any)?.user ?? null;
      setMe({ authenticated: true, user });
    } catch (e: any) {
      setErr(e?.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Écran d'erreur avec retry
  if (err) {
    return (
      <main className="min-h-screen grid place-items-center bg-gray-950 text-gray-100">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-semibold">Oups…</h2>
          <p className="text-sm text-gray-400">{err}</p>
          <button
            onClick={fetchMe}
            className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800"
          >
            Réessayer
          </button>
        </div>
      </main>
    );
  }

  // Pendant le chargement OU tant que le user/nickname n'est pas prêt → spinner
  const isNicknameReady =
    me &&
    "authenticated" in me &&
    me.authenticated === true &&
    me.user &&
    typeof me.user.nickname === "string" &&
    me.user.nickname.length > 0;

  if (loading || !isNicknameReady) {
    return (
      <main className="min-h-screen grid place-items-center bg-gray-950 text-gray-100">
        <LoadingSpinner label="Chargement du profil..." />
      </main>
    );
  }

  // Si on arrive ici, on a un utilisateur authentifié et un nickname sûr
  const nickname = me.user?.nickname ?? "Utilisateur";
  const email = me.user?.email ?? "";

  return (
    <main className="min-h-screen p-4 bg-gray-950 text-gray-100">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        {/* Header */}
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Journal de {nickname} 👋</h1>
          {email ? <p className="text-gray-400 text-sm">{email}</p> : null}
        </header>

        {/* Actions principales */}
        <section className="flex flex-col gap-3">
          <a
            href="/settings"
            className="w-full rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-5 text-center text-lg font-medium hover:bg-gray-800 active:bg-gray-700 transition"
          >
            ➕ Ressources
          </a>
          <a
            href="/transactions"
            className="w-full rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-5 text-center text-lg font-medium hover:bg-gray-800 active:bg-gray-700 transition"
          >
            📈 Mes Trades
          </a>
          <a
            href="/transactions/history"
            className="w-full rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-5 text-center text-lg font-medium hover:bg-gray-800 active:bg-gray-700 transition"
          >
            📜 Historique des transactions
          </a>

          {/* Profil placeholder */}
          <button
            type="button"
            onClick={() =>
              alert("👤 Profil utilisateur — en cours de développement.")
            }
            className="w-full rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-5 text-center text-lg font-medium hover:bg-gray-800 active:bg-gray-700 transition"
            aria-label="Profil utilisateur (en cours de développement)"
          >
            👤 Profil utilisateur
            <span className="ml-2 text-sm text-gray-400">(en cours de dev)</span>
          </button>
        </section>

        {/* Déconnexion */}
        <form
          action={async () => {
            await fetch("/api/logout", { method: "POST" });
            router.replace("/login");
          }}
        >
          <button className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white font-medium py-4 text-lg">
            🚪 Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
