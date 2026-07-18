import { config } from "./config.js";
import { TtlCache } from "./cache.js";
import { cleanSeller, currencySymbol } from "./util.js";
import type { NormalizedOffer } from "./types.js";

// Walmart adapter: keyword -> Apify Walmart search -> NormalizedOffer[].
// Keyword-based (Definition B), like eBay: "competitors" are the listings a
// search surfaces. Walmart items are New; the scraper reports no shipping cost,
// so landed == price.

interface RawWalmartItem {
  name?: string;
  price?: number;
  currency?: string;
  rating?: number;
  seller?: string;
  availability?: string;
  url?: string;
}

export interface WalmartFetch {
  offers: NormalizedOffer[];
  currency: string;
  totalOffers: number;
}

const cache = new TtlCache<WalmartFetch>(config.offersCacheTtlMs);

export async function fetchWalmartOffers(
  query: string
): Promise<{ data: WalmartFetch; fromCache: boolean }> {
  const key = `walmart:${query.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return { data: cached, fromCache: true };

  if (!config.apifyToken) throw new Error("APIFY_TOKEN not configured");

  const url =
    `https://api.apify.com/v2/acts/${config.apifyWalmartActor}` +
    `/run-sync-get-dataset-items?token=${config.apifyToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchKeywords: [query],
      maxResults: config.walmartMaxItems,
    }),
  });

  if (!res.ok) throw new Error(`Apify Walmart actor failed: HTTP ${res.status}`);

  const raw = (await res.json()) as RawWalmartItem[];
  const rows = Array.isArray(raw) ? raw : [];
  const totalOffers = rows.length;

  const inStock = (a: string | undefined) =>
    !a || /in stock|available/i.test(a);

  const offers: NormalizedOffer[] = rows
    .filter((o) => typeof o.price === "number" && o.price > 0 && inStock(o.availability))
    .map((o) => {
      const price = o.price as number;
      return {
        sellerName: cleanSeller(o.seller),
        price,
        shipping: 0,
        landed: price,
        condition: "New",
        prime: false,
        sellerRating: typeof o.rating === "number" ? String(o.rating) : undefined,
      };
    });

  const currency = currencySymbol(rows.find((o) => o.currency)?.currency);
  const data: WalmartFetch = { offers, currency, totalOffers };
  cache.set(key, data);
  return { data, fromCache: false };
}
