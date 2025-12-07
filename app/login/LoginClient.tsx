"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, FormEvent, ChangeEvent } from "react";

export default function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setIsError(false);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erreur inconnue");
      router.replace("/dashboard");
    } catch (err) {
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
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-300">
            Mot de passe
          </label>
          <input
            id="password"
            className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2"
            type="password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
          />
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
            className={`text-sm text-center ${
              isError ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {msg}
          </p>
        )}

        <p className="text-sm text-center text-gray-400">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-indigo-400 hover:underline">
            Inscrivez-vous
          </Link>
        </p>

        <p className="text-sm text-center">
          <Link href="/forgot-password" className="text-indigo-400 hover:underline">
            Mot de passe oublié ?
          </Link>
        </p>

        {/* 👇 lien de retour vers l'accueil */}
        <p className="text-sm text-center">
          <Link href="/" className="text-indigo-400 hover:underline">
            ← Retour à l’accueil
          </Link>
        </p>
      </form>
    </main>
  );
}
