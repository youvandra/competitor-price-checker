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

/** Map a currency code to a short symbol, falling back to the code. */
export function currencySymbol(code: string | undefined): string {
  const map: Record<string, string> = { USD: "$", GBP: "£", EUR: "€" };
  return (code && map[code]) || "$";
}
