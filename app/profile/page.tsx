"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Toast from "@/app/components/Toast";

export default function ProfilePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (res.status === 401) { router.replace("/login"); return; }
      const { user } = await res.json();
      setNickname(user.nickname);
      setEmail(user.email);
      setEmailVerified(user.emailVerified ?? false);
      setNewNickname(user.nickname);
      setLoading(false);
    })();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: newNickname }),
      });
      const j = await res.json();
      if (!res.ok) { setToast(j.error ?? "Erreur lors de la sauvegarde"); return; }
      setNickname(j.user.nickname);
      setToast("Profil mis à jour ✓");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-gray-950 text-gray-100">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 bg-gray-950 text-gray-100">
      <Toast message={toast} onClear={() => setToast("")} />
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-indigo-400 hover:text-indigo-300">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">👤 Profil</h1>
        </div>

        <section className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
          <div>
            <p className="text-xs text-gray-400">Email</p>
            <p className="text-sm text-gray-200">{email}</p>
            {!emailVerified && (
              <p className="text-xs text-yellow-400 mt-1">⚠ Email non vérifié</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400">Nickname actuel</p>
            <p className="text-sm text-gray-200">{nickname}</p>
          </div>
        </section>

        <form onSubmit={handleSave} className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 space-y-4">
          <h2 className="text-base font-semibold">Modifier le nickname</h2>
          <input
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            minLength={2}
            maxLength={30}
            required
            className="w-full rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/40"
            placeholder="Nouveau nickname"
          />
          <button
            type="submit"
            disabled={saving || newNickname.trim() === nickname}
            className="w-full rounded-lg px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-medium"
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </form>
      </div>
    </main>
  );
}
