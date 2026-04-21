export const runtime = "nodejs";
import { NextResponse } from "next/server";

type RssItem = {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  author?: string;
};

type RssJson = { status: string; items: RssItem[] };

export type NewsArticle = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  tags: string[];
};

const FEEDS = [
  { url: "https://feeds.reuters.com/reuters/worldNews", source: "Reuters World" },
  { url: "https://feeds.reuters.com/reuters/businessNews", source: "Reuters Business" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World" },
];

// Mots-clés qui rendent un article pertinent pour USD/JPY
const RELEVANT_KEYWORDS = [
  "japan", "japanese", "yen", "boj", "bank of japan", "ueda", "tokyo",
  "dollar", "usd", "fed", "federal reserve", "powell", "treasury", "trump",
  "china", "chinese", "yuan", "beijing", "xi", "tariff", "trade war",
  "war", "attack", "military", "strike", "missile", "conflict", "troops", "invasion",
  "oil", "crude", "opec", "hormuz", "energy", "sanction",
  "taiwan", "ukraine", "korea", "iran", "geopolit",
  "inflation", "recession", "gdp", "rate hike", "rate cut",
];

function getTags(text: string): string[] {
  const t = text.toLowerCase();
  const tags: string[] = [];
  if (/japan|japanese|yen|boj|bank of japan|ueda|tokyo/.test(t)) tags.push("🇯🇵");
  if (/\bus\b|\busa\b|america|dollar|\bfed\b|federal reserve|powell|trump|treasury/.test(t)) tags.push("🇺🇸");
  if (/china|chinese|yuan|beijing|\bxi\b/.test(t)) tags.push("🇨🇳");
  if (/war|attack|military|strike|missile|conflict|troops|invasion/.test(t)) tags.push("⚔️");
  if (/oil|crude|opec|hormuz|energy/.test(t)) tags.push("🛢️");
  if (/tariff|trade war|sanction|import|export/.test(t)) tags.push("📊");
  return tags;
}

function isRelevant(title: string, desc: string): boolean {
  const text = (title + " " + desc).toLowerCase();
  return RELEVANT_KEYWORDS.some((kw) => text.includes(kw));
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      FEEDS.map(({ url, source }) =>
        fetch(
          `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=30`,
          { signal: AbortSignal.timeout(8000) }
        )
          .then((r) => r.json() as Promise<RssJson>)
          .then((j) =>
            j.status === "ok"
              ? j.items.map((item) => ({ ...item, source }))
              : []
          )
      )
    );

    const allItems = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    const filtered: NewsArticle[] = allItems
      .filter((item) => isRelevant(item.title, item.description ?? ""))
      .map((item) => ({
        title: item.title,
        url: item.link,
        source: item.source,
        publishedAt: item.pubDate,
        tags: getTags(item.title + " " + (item.description ?? "")),
      }))
      .filter((a) => a.tags.length > 0)
      // dédupliquer par titre
      .filter((a, i, arr) => arr.findIndex((b) => b.title === a.title) === i)
      // trier par date décroissante
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 20);

    return NextResponse.json({ ok: true, articles: filtered });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
