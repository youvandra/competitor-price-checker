import { config } from "./config.js";
import { TtlCache } from "./cache.js";
import { cleanSeller, currencySymbol } from "./util.js";
import type { NormalizedOffer } from "./types.js";

// Etsy adapter: keyword -> Apify Etsy search -> NormalizedOffer[].
// Keyword-based (Definition B). Handmade/vintage goods; a shop is the seller.

interface RawEtsyItem {
  name?: string;
  price?: string | number;
  currency?: string;
  shop?: string;
  shopId?: string;
  rating?: number;
  freeShipping?: boolean;
  availability?: string;
  isDigitalDownload?: boolean;
}

export interface EtsyFetch {
  offers: NormalizedOffer[];
  currency: string;
  totalOffers: number;
}

const cache = new TtlCache<EtsyFetch>(config.offersCacheTtlMs);

export async function fetchEtsyOffers(
  query: string
): Promise<{ data: EtsyFetch; fromCache: boolean }> {
  const key = `etsy:${query.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return { data: cached, fromCache: true };

  if (!config.apifyToken) throw new Error("APIFY_TOKEN not configured");

  const url =
    `https://api.apify.com/v2/acts/${config.apifyEtsyActor}` +
    `/run-sync-get-dataset-items?token=${config.apifyToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchQuery: query, maxItems: config.etsyMaxItems }),
  });

  if (!res.ok) throw new Error(`Apify Etsy actor failed: HTTP ${res.status}`);

  const raw = (await res.json()) as RawEtsyItem[];
  const rows = Array.isArray(raw) ? raw : [];
  const totalOffers = rows.length;

  const inStock = (a: string | undefined) => !a || /in stock|available/i.test(a);

  const offers: NormalizedOffer[] = rows
    .filter((o) => !o.isDigitalDownload && inStock(o.availability))
    .map((o) => ({ ...o, num: Number(o.price) }))
    .filter((o) => Number.isFinite(o.num) && o.num > 0)
    .map((o) => {
      const price = Math.round(o.num * 100) / 100;
      const shipping = o.freeShipping ? 0 : 0; // Etsy search omits a shipping figure
      return {
        sellerName: o.shop ? cleanSeller(o.shop) : "Etsy shop",
        price,
        shipping,
        landed: price,
        condition: "New",
        prime: false,
        sellerRating: typeof o.rating === "number" ? String(o.rating) : undefined,
      };
    });

  const currency = currencySymbol(rows.find((o) => o.currency)?.currency);
  const data: EtsyFetch = { offers, currency, totalOffers };
  cache.set(key, data);
  return { data, fromCache: false };
}
