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

/**
 * POST JSON and parse the JSON response, with a hard timeout so a hung upstream
 * (e.g. a slow Apify run) fails cleanly instead of holding the request open.
 */
export async function fetchJson(
  url: string,
  body: unknown,
  timeoutMs: number,
  label: string
): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${label} failed: HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Parse a free-text shipping label into a number; "free" -> 0. */
export function parseShipping(s: string | undefined): number {
  if (!s) return 0;
  if (/free/i.test(s)) return 0;
  const m = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}
