"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Settings, LayoutDashboard, LogIn, UserPlus } from "lucide-react";

type User = { id?: string; email: string; nickname: string };

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (res.status === 401) {
          if (!cancelled) setUser(null);
        } else if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) setUser(data?.user ?? null);
        } else {
          if (!cancelled) setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header / Emblème */}
      <header className="pt-14 px-6">
        <div className="mx-auto max-w-sm text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 grid place-items-center shadow-lg">
            <span className="text-3xl">🦈</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">KondoJT</h1>
          <p className="text-sm text-gray-400">Ton journal de trading, simple et rapide.</p>
        </div>
      </header>

      {/* Bandeau rappel */}
      <section className="mt-6 px-6">
        <div
          className="mx-auto max-w-sm flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3"
          role="note"
          onClick={() => router.push("/settings")}
        >
          <Bell className="w-5 h-5 text-indigo-400" />
          <p className="text-sm">
            <span className="font-medium text-indigo-300">Rappel</span> : pense à noter tes trades
            aujourd’hui.
          </p>
        </div>
      </section>

      {/* Contenu principal */}
      <section className="px-6 mt-10">
        <div className="mx-auto max-w-sm">
          {loading ? (
            // Skeleton mobile-friendly
            <div className="space-y-3">
              <div className="h-11 rounded-xl bg-gray-800/60 animate-pulse" />
              <div className="h-11 rounded-xl bg-gray-800/60 animate-pulse" />
              <div className="h-5 w-28 rounded bg-gray-800/60 mt-2 animate-pulse" />
            </div>
          ) : user ? (
            <>
              <p className="text-center text-sm text-gray-300">
                Bienvenue <b>{user.nickname}</b> 👋
              </p>

              <div className="mt-5 grid gap-3">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white font-medium h-12"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Ouvrir le dashboard
                </button>

                <button
                  onClick={() => router.push("/settings")}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-800 hover:border-gray-700 h-12"
                >
                  <Settings className="w-5 h-5" />
                  Paramètres
                </button>
              </div>

              <form
                className="mt-4 flex justify-center"
                action={async () => {
                  await fetch("/api/logout", { method: "POST" });
                  router.replace("/login");
                }}
              >
                <button className="inline-flex items-center gap-1 text-sm text-rose-400 hover:underline">
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-gray-300">
                Connecte-toi pour accéder à ton journal.
              </p>
              <div className="mt-5 grid gap-3">
                <button
                  onClick={() => router.push("/login")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white font-medium h-12"
                >
                  <LogIn className="w-5 h-5" />
                  Se connecter
                </button>

                <button
                  onClick={() => router.push("/signup")}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-800 hover:border-gray-700 h-12"
                >
                  <UserPlus className="w-5 h-5" />
                  Créer un compte
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer mini */}
      <footer className="mt-12 pb-8">
        <p className="text-center text-xs text-gray-500">© {new Date().getFullYear()} KondoJT</p>
      </footer>
    </main>
  );
}
