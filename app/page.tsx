"use client";

import { useEffect, useState } from "react";

type Me =
  | { authenticated: false }
  | { authenticated: true; user: { email: string; nickname: string } };

export default function Home() {
  const [me, setMe] = useState<Me | null>(null);

  async function ping() {
    const res = await fetch("/api/hello");
    const data = await res.json();
    alert(data.message);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = (await res.json()) as Me;
        setMe(data);
      } catch (err) {
        console.error("Erreur récupération user:", err);
      }
    })();
  }, []);

  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        height: "100dvh",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1>mon journal de trading</h1>
        {me && me.authenticated && (
          <p style={{ marginTop: 8 }}>
            Bienvenue <b>{me.user.nickname}</b> 👋
          </p>
        )}
        <button onClick={ping} style={{ padding: "10px 14px", marginTop: 12 }}>
          Tester le backend
        </button>
      </div>
    </main>
  );
}
