"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "./LoadingSpinner"; // ✅ importe ton spinner

type Me =
  | { authenticated: false }
  | { authenticated: true; user: { email: string; nickname: string } };

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = (await res.json()) as Me;
      setMe(data);
      if (!data.authenticated) router.replace("/login");
    })();
  }, [router]);

  // ✅ Tant que `me` est null ou pas encore avec un nickname → affiche le spinner
  if (!me || !("authenticated" in me) || (me.authenticated && !me.user.nickname)) {
    return (
      <main className="min-h-screen grid place-items-center bg-gray-950 text-gray-100">
        <LoadingSpinner label="Chargement du profil..." />
      </main>
    );
  }

  if (!me.authenticated) return null;

  return (
    <main className="min-h-screen p-4 bg-gray-950 text-gray-100">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        {/* Header */}
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-bold">
            Journal de {me.user.nickname} 👋
          </h1>
          <p className="text-gray-400 text-sm">{me.user.email}</p>
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

          {/* 👤 Profil (placeholder) */}
          <button
            type="button"
            onClick={() =>
              alert(
                "👤 Profil utilisateur — en cours de développement.\nBientôt: photo, pseudo, préférences…"
              )
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
