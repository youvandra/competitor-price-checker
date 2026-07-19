import { config } from "./config.js";
import { TtlCache } from "./cache.js";
import { cleanSeller, currencySymbol, parseShipping } from "./util.js";
import type { NormalizedOffer } from "./types.js";

// AliExpress adapter: keyword -> Apify AliExpress search -> NormalizedOffer[].
// Keyword-based (Definition B). Items are New; a "seller" is not always given,
// so we fall back to the store/top-rated flag.

interface RawAliItem {
  productTitle?: string;
  price?: number;
  currency?: string;
  rating?: number;
  orders?: number;
  shipping?: string; // "Free shipping over €10" | "€2.30" | ...
  storeName?: string;
  isTopRated?: boolean;
}

export interface AliFetch {
  offers: NormalizedOffer[];
  currency: string;
  totalOffers: number;
}

const cache = new TtlCache<AliFetch>(config.offersCacheTtlMs);

export async function fetchAliexpressOffers(
  query: string
): Promise<{ data: AliFetch; fromCache: boolean }> {
  const key = `aliexpress:${query.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return { data: cached, fromCache: true };

  if (!config.apifyToken) throw new Error("APIFY_TOKEN not configured");

  const url =
    `https://api.apify.com/v2/acts/${config.apifyAliexpressActor}` +
    `/run-sync-get-dataset-items?token=${config.apifyToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keywords: [query],
      maxItems: config.aliexpressMaxItems,
      sort: "default",
    }),
  });

  if (!res.ok) throw new Error(`Apify AliExpress actor failed: HTTP ${res.status}`);

  const raw = (await res.json()) as RawAliItem[];
  const rows = Array.isArray(raw) ? raw : [];
  const totalOffers = rows.length;

  const offers: NormalizedOffer[] = rows
    .filter((o) => typeof o.price === "number" && o.price > 0)
    .map((o) => {
      const price = o.price as number;
      const shipping = parseShipping(o.shipping);
      return {
        sellerName: o.storeName
          ? cleanSeller(o.storeName)
          : o.isTopRated
            ? "Top-rated store"
            : "AliExpress seller",
        price,
        shipping,
        landed: Math.round((price + shipping) * 100) / 100,
        condition: "New",
        prime: false,
        sellerRating: typeof o.rating === "number" ? String(o.rating) : undefined,
      };
    });

  const currency = currencySymbol(rows.find((o) => o.currency)?.currency);
  const data: AliFetch = { offers, currency, totalOffers };
  cache.set(key, data);
  return { data, fromCache: false };
}
