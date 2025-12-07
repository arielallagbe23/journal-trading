"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setIsError(false);

    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Impossible de mettre à jour le mot de passe.");
      setMessage("✅ Mot de passe mis à jour. Vous pouvez maintenant vous connecter.");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Erreur inattendue.";
      setIsError(true);
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-4 bg-gray-950 text-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 p-6 rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur shadow-xl"
      >
        <h1 className="text-2xl font-semibold text-center">Mot de passe oublié</h1>
        <p className="text-sm text-center text-gray-400">
          Version simplifiée : saisis ton email et un nouveau mot de passe.
        </p>

        <div>
          <label htmlFor="email" className="block text-sm text-gray-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm text-gray-300">
            Nouveau mot de passe
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            minLength={8}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm text-gray-300">
            Confirmer le mot de passe
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            minLength={8}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg px-4 py-2 bg-indigo-500 text-white font-medium hover:bg-indigo-400 transition disabled:opacity-60"
        >
          {loading ? "Mise à jour..." : "Réinitialiser"}
        </button>

        {message && (
          <p className={`text-sm text-center ${isError ? "text-rose-400" : "text-emerald-400"}`}>
            {message}
          </p>
        )}

        <p className="text-sm text-center text-gray-400">
          <Link href="/login" className="text-indigo-400 hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      </form>
    </main>
  );
}
