"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

type Article = {
  title: string;
  description: string | null;
  url: string;
  source: string;
  publishedAt: string;
};

export default function NewsPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          "https://api.rss2json.com/v1/api.json?rss_url=https://feeds.finance.yahoo.com/rss/2.0/headline?s=EURUSD%3DX,USDJPY%3DX,GBPUSD%3DX&region=US&lang=en-US&count=20"
        );
        const j = await r.json();
        if (j.status !== "ok") throw new Error("Feed error");
        const items: Article[] = j.items.map((item: Record<string, string>) => ({
          title: item.title,
          description: item.description?.replace(/<[^>]*>/g, "").slice(0, 120) ?? null,
          url: item.link,
          source: item.author || "Yahoo Finance",
          publishedAt: item.pubDate,
        }));
        setArticles(items);
      } catch {
        setError("Impossible de charger les news.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-indigo-400 hover:text-indigo-300"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">📰 News Forex</h1>
        </div>

        {loading && (
          <p className="text-gray-400 text-sm text-center mt-8">Chargement...</p>
        )}

        {error && (
          <p className="text-rose-400 text-sm text-center mt-8">{error}</p>
        )}

        {!loading && !error && articles.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-8">Aucune news disponible.</p>
        )}

        <ul className="flex flex-col gap-3">
          {articles.map((a, i) => (
            <li
              key={i}
              className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 flex flex-col gap-1"
            >
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white hover:text-indigo-300 flex items-start gap-2"
              >
                <span className="flex-1">{a.title}</span>
                <ExternalLink className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
              </a>
              {a.description && (
                <p className="text-gray-400 text-sm">{a.description}…</p>
              )}
              <div className="flex gap-2 text-xs text-gray-500 mt-1">
                <span>{a.source}</span>
                <span>·</span>
                <span>{new Date(a.publishedAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
