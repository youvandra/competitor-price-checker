// Shared helpers used across marketplace adapters.
import type { NormalizedOffer } from "./types.js";

/**
 * Tidy a raw marketplace seller name. Strips bracketed/parenthesized suffixes
 * (e.g. "RichMondHS [S/N Recorded]" -> "RichMondHS") and trailing separators,
 * collapses whitespace. Falls back to the trimmed original if cleaning empties it.
 */
export function cleanSeller(name: string | undefined): string {
  if (!name) return "Unknown seller";
  const stripped = name
    .replace(/[\[(].*?[\])]/g, " ") // remove [ ... ] and ( ... ) groups
    .replace(/[\[(].*$/g, " ") // remove an unclosed trailing "[..." / "(..."
    .replace(/[-–—,:|]+\s*$/g, "") // trailing separators
    .replace(/\s+/g, " ")
    .trim();
  return stripped || name.trim() || "Unknown seller";
}

/**
 * Keyword-based marketplaces (eBay, Walmart) surface accessories/related items
 * alongside the product. When the caller gives their own price we anchor to it
 * and drop listings far outside a sensible band (e.g. $8 mouse pads when the
 * mouse is ~$95). If filtering would leave too few, keep the full set.
 */
export function relevanceFilter(
  offers: NormalizedOffer[],
  anchor?: number
): NormalizedOffer[] {
  if (typeof anchor !== "number" || !Number.isFinite(anchor) || anchor <= 0) {
    return offers;
  }
  const lo = anchor * 0.4;
  const hi = anchor * 2.5;
  const kept = offers.filter((o) => o.landed >= lo && o.landed <= hi);
  return kept.length >= 2 ? kept : offers;
}

/** Map a currency code to a short symbol, falling back to $. */
export function currencySymbol(code: string | undefined): string {
  const map: Record<string, string> = { USD: "$", GBP: "£", EUR: "€" };
  return (code && map[code]) || "$";
}

// Approximate FX to USD, keyed by currency symbol. Static + disclosed — enough
// to rank marketplaces against each other, not a settlement-grade rate.
const USD_PER_SYMBOL: Record<string, number> = { "$": 1, "€": 1.08, "£": 1.27 };

/** Convert an amount in a symbol's currency to approximate USD. */
export function toUsd(amount: number, symbol: string): number {
  const rate = USD_PER_SYMBOL[symbol] ?? 1;
  return Math.round(amount * rate * 100) / 100;
}

/** True if the symbol is a known non-USD currency (i.e. it was converted). */
export function isNonUsd(symbol: string): boolean {
  return symbol !== "$" && symbol in USD_PER_SYMBOL;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postJsonOnce(
  url: string,
  body: unknown,
  timeoutMs: number,
  label: string
): Promise<{ ok: true; data: unknown } | { ok: false; status?: number; err: Error }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      return { ok: false, status: res.status, err: new Error(`${label} failed: HTTP ${res.status}`) };
    }
    return { ok: true, data: await res.json() };
  } catch (err) {
    const e =
      err instanceof Error && err.name === "AbortError"
        ? new Error(`${label} timed out after ${timeoutMs}ms`)
        : err instanceof Error
          ? err
          : new Error(String(err));
    return { ok: false, err: e };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST JSON and parse the JSON response, with a hard timeout so a hung upstream
 * fails cleanly. Retries transient failures (network errors, HTTP 429/5xx) with
 * backoff; does NOT retry timeouts (already waited long) or 4xx (deterministic).
 */
export async function fetchJson(
  url: string,
  body: unknown,
  timeoutMs: number,
  label: string,
  retries = 1
): Promise<unknown> {
  let last: Error = new Error(`${label} failed`);
  for (let attempt = 0; attempt <= retries; attempt++) {
    const r = await postJsonOnce(url, body, timeoutMs, label);
    if (r.ok) return r.data;
    last = r.err;
    const isTimeout = /timed out/.test(r.err.message);
    const transient = r.status === undefined || r.status === 429 || r.status >= 500;
    if (attempt < retries && transient && !isTimeout) {
      await sleep(400 * 2 ** attempt + Math.floor(Math.random() * 150));
      continue;
    }
    break;
  }
  throw last;
}

/** Parse a free-text shipping label into a number; "free" -> 0. */
export function parseShipping(s: string | undefined): number {
  if (!s) return 0;
  if (/free/i.test(s)) return 0;
  const m = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}
