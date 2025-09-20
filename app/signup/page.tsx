"use client";

import { useState, FormEvent, ChangeEvent } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const onEmailChange = (e: ChangeEvent<HTMLInputElement>) =>
    setEmail(e.target.value);
  const onPasswordChange = (e: ChangeEvent<HTMLInputElement>) =>
    setPassword(e.target.value);
  const onNicknameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setNickname(e.target.value);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setIsError(false);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nickname }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        user?: { email: string; nickname: string };
      };

      if (!res.ok) {
        throw new Error(data?.error || "Erreur inconnue");
      }

      setMsg(`Bienvenue ${data.user?.nickname} 🎉`);
      setEmail("");
      setPassword("");
      setNickname("");
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
        <h1 className="text-2xl font-semibold text-center">Créer un compte</h1>

        <div>
          <label htmlFor="nickname" className="block text-sm text-gray-300">
            Pseudo
          </label>
          <input
            id="nickname"
            className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500"
            type="text"
            value={nickname}
            onChange={onNicknameChange}
            required
            placeholder="Ex: TraderPro"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm text-gray-300">
            Email
          </label>
          <input
            id="email"
            className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500"
            type="email"
            value={email}
            onChange={onEmailChange}
            autoComplete="email"
            required
            placeholder="vous@exemple.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-300">
            Mot de passe
          </label>
          <input
            id="password"
            className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500"
            type="password"
            value={password}
            onChange={onPasswordChange}
            minLength={8}
            autoComplete="new-password"
            required
            placeholder="********"
          />
          <p className="mt-1 text-xs text-gray-400">8 caractères minimum.</p>
        </div>

        <button
          className="w-full rounded-lg px-4 py-2 bg-indigo-500 text-white font-medium hover:bg-indigo-400 transition disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Création..." : "S'inscrire"}
        </button>
        <p className="text-sm text-center text-gray-400">
          Déjà inscrit ?{" "}
          <a href="/login" className="text-indigo-400 hover:underline">
            Connectez-vous
          </a>
        </p>

        {msg && (
          <p
            className={`text-sm text-center ${
              isError ? "text-rose-400" : "text-emerald-400"
            }`}
            aria-live="polite"
            role="status"
          >
            {isError ? `Erreur: ${msg}` : msg}
          </p>
        )}

        {/* 👇 lien de retour vers l'accueil */}
        <p className="text-sm text-center">
          <a href="/" className="text-indigo-400 hover:underline">
            ← Retour à l’accueil
          </a>
        </p>
      </form>
    </main>
  );
}
