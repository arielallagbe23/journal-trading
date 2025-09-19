"use client";

import { useState, FormEvent, ChangeEvent, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const router = useRouter();
  const search = useSearchParams();
  const next = useMemo(() => search.get("next") || "/dashboard", [search]);

  // bloque les doubles requêtes
  const abortRef = useRef<AbortController | null>(null);

  function normEmail(v: string) {
    return v.trim().toLowerCase();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setIsError(false);

    // validation basique côté client
    const eNorm = normEmail(email);
    if (!eNorm || !password) {
      setIsError(true);
      setMsg("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);

    // annule une requête précédente si nécessaire
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // same-origin => les cookies de session seront bien pris en compte
        body: JSON.stringify({ email: eNorm, password }),
        signal: ac.signal,
      });

      // essaie de parser proprement même si erreur
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        /* ignore parse error */ 
      }

      if (!res.ok) {
        // messages un poil plus explicites selon le code
        const base = typeof data?.error === "string" ? data.error : "Erreur inconnue";
        const message =
          res.status === 401
            ? "Identifiants invalides."
            : res.status === 429
            ? "Trop de tentatives, réessayez un peu plus tard."
            : base;
        throw new Error(message);
      }

      // succès
      setIsError(false);
      setMsg("Connecté !");
      // Redirige vers ?next=… si fourni, sinon dashboard
      router.replace(next);
      // si tu restais sur la même page, tu pourrais faire un router.refresh()
    } catch (err) {
      if ((err as any)?.name === "AbortError") return; // requête précédente annulée
      const message = err instanceof Error ? err.message : "Erreur inattendue";
      setIsError(true);
      setMsg(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-4 bg-gray-950 text-gray-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 p-6 rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur shadow-xl"
        autoComplete="on"
      >
        <h1 className="text-2xl font-semibold text-center">Connexion</h1>

        <div>
          <label htmlFor="email" className="block text-sm text-gray-300">
            Email
          </label>
          <input
            id="email"
            className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2"
            type="email"
            inputMode="email"
            autoComplete="username email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            onBlur={() => setEmail((v) => normEmail(v))}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-300">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 pr-20"
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute inset-y-0 right-2 my-1 px-2 rounded-md text-xs bg-gray-800 hover:bg-gray-700"
              aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              disabled={loading}
            >
              {showPwd ? "Masquer" : "Afficher"}
            </button>
          </div>
          {capsOn && (
            <p className="mt-1 text-xs text-amber-400">Attention : Verr. Maj activée</p>
          )}
        </div>

        <button
          disabled={loading}
          className="w-full rounded-lg px-4 py-2 bg-indigo-500 text-white font-medium hover:bg-indigo-400 transition disabled:opacity-60"
          type="submit"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        {msg && (
          <p
            role="status"
            className={`text-sm text-center ${isError ? "text-rose-400" : "text-emerald-400"}`}
          >
            {msg}
          </p>
        )}

        <p className="text-sm text-center text-gray-400">
          Pas encore de compte ?{" "}
          <a href="/signup" className="text-indigo-400 hover:underline">
            Inscrivez-vous
          </a>
        </p>
      </form>
    </main>
  );
}
