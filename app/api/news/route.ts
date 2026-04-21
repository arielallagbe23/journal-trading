export const runtime = "nodejs";
import { NextResponse } from "next/server";

export type NewsArticle = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  tags: string[];
};

const FEEDS = [
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml",         source: "BBC World" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml",      source: "BBC Business" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml",           source: "Al Jazeera" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "NYT World" },
  { url: "https://feeds.marketwatch.com/marketwatch/topstories/", source: "MarketWatch" },
];

const RELEVANT = [
  "japan", "japanese", "yen", "boj", "bank of japan", "ueda", "tokyo",
  "dollar", "usd", "fed", "federal reserve", "powell", "trump", "treasury",
  "china", "chinese", "yuan", "beijing", "xi jinping", "tariff", "trade war",
  "war", "attack", "military", "strike", "missile", "conflict", "troops",
  "oil", "crude", "opec", "hormuz", "energy", "sanction",
  "taiwan", "ukraine", "korea", "iran",
  "inflation", "recession", "gdp", "rate hike", "rate cut",
];

function tag(text: string): string[] {
  const t = text.toLowerCase();
  const tags: string[] = [];
  if (/japan|japanese|yen|boj|bank of japan|ueda|tokyo/.test(t))              tags.push("🇯🇵");
  if (/\bus\b|\busa\b|america|dollar|\bfed\b|federal reserve|powell|trump|treasury/.test(t)) tags.push("🇺🇸");
  if (/china|chinese|yuan|beijing|xi jinping/.test(t))                        tags.push("🇨🇳");
  if (/war|attack|military|strike|missile|conflict|troops|invasion/.test(t))  tags.push("⚔️");
  if (/oil|crude|opec|hormuz|energy/.test(t))                                 tags.push("🛢️");
  if (/tariff|trade war|sanction|import|export/.test(t))                      tags.push("📊");
  return tags;
}

function isRelevant(text: string) {
  const t = text.toLowerCase();
  return RELEVANT.some((kw) => t.includes(kw));
}

// Extraction simple sans dépendance — fonctionne avec les RSS standards
function parseCdata(raw: string) {
  return raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function parseXml(xml: string, source: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  for (const [, block] of blocks) {
    const rawTitle = block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? "";
    const rawLink  = block.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1]
                  ?? block.match(/<guid[^>]*>(https?[^<]+)<\/guid>/)?.[1] ?? "";
    const rawDate  = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    const rawDesc  = block.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1] ?? "";

    const title = parseCdata(rawTitle).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    const url   = parseCdata(rawLink).trim();
    const desc  = parseCdata(rawDesc).replace(/<[^>]+>/g, "").trim();

    if (!title || !url) continue;
    const text = title + " " + desc;
    if (!isRelevant(text)) continue;
    const tags = tag(text);
    if (!tags.length) continue;

    items.push({ title, url, source, publishedAt: rawDate, tags });
  }
  return items;
}

export async function GET() {
  const settled = await Promise.allSettled(
    FEEDS.map(({ url, source }) =>
      fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RSSBot/1.0)" },
        signal: AbortSignal.timeout(8000),
      })
        .then((r) => r.text())
        .then((xml) => parseXml(xml, source))
    )
  );

  const all = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  const articles = all
    .filter((a, i, arr) => arr.findIndex((b) => b.title === a.title) === i)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 20);

  return NextResponse.json({ ok: true, articles });
}
