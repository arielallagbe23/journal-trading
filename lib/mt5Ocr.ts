export type ParsedOcrTrade = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  volume: number | null;
  entryPrice: number | null;
  exitPrice: number | null;
  closedAt: string | null;
  profit: number | null;
  rawLines: string[];
};

const headerRegex = /^([A-Z0-9.]+)\s+(buy|sell)\s+([\d.,\s]+)/i;
const priceRegex = /(\d+(?:[.,]\d+)?)[\s]*(?:->|→|to)[\s]*(\d+(?:[.,]\d+)?)/i;
const dateRegex =
  /(\d{4})[.\-/](\d{2})[.\-/](\d{2})[^\d]+(\d{2}):(\d{2}):(\d{2})/;

function genId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  return Math.random().toString(36).slice(2);
}

function normalizeNumber(raw?: string | null) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d,.\-]/g, "").replace(/,/g, ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function toIsoDate(match: RegExpMatchArray) {
  const [, year, month, day, hour, minute, second] = match;
  try {
    const iso = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ).toISOString();
    return iso;
  } catch {
    return null;
  }
}

export function parseMt5HistoryText(text: string): ParsedOcrTrade[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const trades: ParsedOcrTrade[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const header = line.match(headerRegex);
    if (!header) {
      i++;
      continue;
    }

    const [, symbolRaw, sideRaw, volumeRaw] = header;
    const rawLines = [line];
    const trade: ParsedOcrTrade = {
      id: genId(),
      symbol: symbolRaw.replace(/[^A-Z0-9.]/g, "").toUpperCase(),
      side: sideRaw.toLowerCase() === "sell" ? "sell" : "buy",
      volume: normalizeNumber(volumeRaw),
      entryPrice: null,
      exitPrice: null,
      closedAt: null,
      profit: null,
      rawLines,
    };

    let consumed = 1;

    if (i + consumed < lines.length) {
      const maybePrice = lines[i + consumed];
      const match = maybePrice.match(priceRegex);
      if (match) {
        trade.entryPrice = normalizeNumber(match[1]);
        trade.exitPrice = normalizeNumber(match[2]);
        rawLines.push(maybePrice);
        consumed++;
      }
    }

    let lookahead = 0;
    while (lookahead < 4 && i + consumed + lookahead < lines.length) {
      const candidate = lines[i + consumed + lookahead];
      if (candidate.match(headerRegex)) break;

      rawLines.push(candidate);

      if (!trade.closedAt) {
        const dateMatch = candidate.match(dateRegex);
        if (dateMatch) trade.closedAt = toIsoDate(dateMatch);
      }

      if (trade.profit === null) {
        const profitMatch =
          candidate.match(/[-+]?\d+(?:[.,]\d+)?/) ?? undefined;
        if (profitMatch) trade.profit = normalizeNumber(profitMatch[0]);
      }

      lookahead++;
    }

    trades.push(trade);
    i += consumed + lookahead;
  }

  return trades;
}
