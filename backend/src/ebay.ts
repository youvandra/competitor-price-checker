import { config } from "./config.js";
import { TtlCache } from "./cache.js";
import { cleanSeller } from "./util.js";
import type { NormalizedOffer } from "./types.js";

// eBay adapter: keyword -> Apify eBay search -> NormalizedOffer[].
// eBay has NO shared Buy Box — "competitors" are similar Buy-It-Now listings
// surfaced by the search query. This is keyword-based (Definition B).

interface RawEbayItem {
  title?: string;
  price?: number;
  shippingCost?: string; // "Free delivery" | "+US $5.99 delivery" | ""
  condition?: string; // "Brand New" | "New" | "Used" | ...
  listingType?: string; // "Buy It Now" | "Auction"
  sellerName?: string;
  sellerFeedbackPercent?: string;
  url?: string;
}

/** eBay reports shipping as free text. Pull a number out, treat "free" as 0. */
export function parseShipping(s: string | undefined): number {
  if (!s) return 0;
  if (/free/i.test(s)) return 0;
  const m = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

/**
 * eBay keyword search surfaces accessories/related items alongside the product.
 * When the caller gives their own price we can anchor to it and drop listings
 * far outside a sensible band (e.g. $8 mouse pads when the mouse is ~$95). If
 * filtering would leave too few, we keep the full set rather than return noise.
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

export interface EbayFetch {
  offers: NormalizedOffer[];
  currency: string;
  totalOffers: number;
}

const cache = new TtlCache<EbayFetch>(config.offersCacheTtlMs);

export async function fetchEbayOffers(
  query: string
): Promise<{ data: EbayFetch; fromCache: boolean }> {
  const key = `ebay:${query.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return { data: cached, fromCache: true };

  if (!config.apifyToken) throw new Error("APIFY_TOKEN not configured");

  const url =
    `https://api.apify.com/v2/acts/${config.apifyEbayActor}` +
    `/run-sync-get-dataset-items?token=${config.apifyToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchQueries: [query],
      maxProductsPerSearch: config.ebayMaxItems,
      maxSearchPages: 1,
      listingType: "buy_it_now",
      condition: ["new"],
      sort: "best_match",
    }),
  });

  if (!res.ok) throw new Error(`Apify eBay actor failed: HTTP ${res.status}`);

  const raw = (await res.json()) as RawEbayItem[];
  const rows = Array.isArray(raw) ? raw : [];
  const totalOffers = rows.length;

  const offers: NormalizedOffer[] = rows
    .filter(
      (o) =>
        typeof o.price === "number" &&
        /new/i.test(o.condition ?? "") &&
        !/auction/i.test(o.listingType ?? "")
    )
    .map((o) => {
      const price = o.price as number;
      const shipping = parseShipping(o.shippingCost);
      return {
        sellerName: cleanSeller(o.sellerName),
        price,
        shipping,
        landed: Math.round((price + shipping) * 100) / 100,
        condition: o.condition || "New",
        prime: false,
        sellerRating: o.sellerFeedbackPercent,
      };
    });

  const data: EbayFetch = { offers, currency: "$", totalOffers };
  cache.set(key, data);
  return { data, fromCache: false };
}
