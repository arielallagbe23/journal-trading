"use client";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <html>
      <body style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Oups…</h1>
        <p>{error.message}</p>
        <button onClick={reset} style={{ padding: 8, border: "1px solid #444", borderRadius: 8 }}>
          Réessayer
        </button>
      </body>
    </html>
  );
}
