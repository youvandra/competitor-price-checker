import { config } from "./config.js";
import { TtlCache } from "./cache.js";
import { cleanSeller, fetchJson } from "./util.js";
import type { NormalizedOffer } from "./types.js";

// Amazon adapter: URL -> ASIN, Apify offers scraper -> NormalizedOffer[].

const ASIN_RE = /\b([A-Z0-9]{10})\b/;
const URL_ASIN_RE = /\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})/i;

/** Pull an ASIN from a product URL or accept a raw 10-char ASIN. */
export function extractAsin(input: string): string | null {
  const s = input.trim();
  const fromUrl = s.match(URL_ASIN_RE);
  if (fromUrl) return fromUrl[1].toUpperCase();
  // bare ASIN (not a URL)
  if (!s.includes("/") && !s.includes(" ")) {
    const bare = s.toUpperCase().match(/^[A-Z0-9]{10}$/);
    if (bare) return bare[0];
  }
  // last resort: any 10-char token in the string
  const any = s.toUpperCase().match(ASIN_RE);
  return any ? any[1] : null;
}

/** Guess the marketplace domain code (com, co.uk, de, ...) from a URL host. */
export function domainFromUrl(input: string): string | null {
  const m = input.match(/amazon\.([a-z.]+?)(?:\/|$)/i);
  return m ? m[1].toLowerCase() : null;
}

// Raw offer object shape from the axesso actor (only fields we read).
export interface RawAmazonOffer {
  condition?: string;
  price?: number;
  shippingPrice?: number;
  sellerName?: string;
  sellerId?: string;
  sellerRating?: string;
  prime?: boolean;
  currencyCode?: string;
}

export interface AmazonFetch {
  offers: NormalizedOffer[];
  currency: string;
  totalOffers: number;
}

/**
 * Normalize raw Amazon offers. New-condition only (Used offers are not Buy Box
 * rivals). Landed = price + shipping.
 */
export function normalizeAmazonOffers(rows: RawAmazonOffer[]): AmazonFetch {
  const offers: NormalizedOffer[] = rows
    .filter((o) => typeof o.price === "number" && (o.condition ?? "").toLowerCase().startsWith("new"))
    .map((o) => {
      const price = o.price as number;
      const shipping = typeof o.shippingPrice === "number" ? o.shippingPrice : 0;
      return {
        sellerName: cleanSeller(o.sellerName),
        sellerId: o.sellerId,
        price,
        shipping,
        landed: Math.round((price + shipping) * 100) / 100,
        condition: o.condition || "New",
        prime: Boolean(o.prime),
        sellerRating: o.sellerRating,
      };
    });
  const currency = rows.find((o) => o.currencyCode)?.currencyCode || "$";
  return { offers, currency, totalOffers: rows.length };
}

const cache = new TtlCache<AmazonFetch>(config.offersCacheTtlMs);

/**
 * Fetch + normalize competing offers for an ASIN. New-condition offers only
 * (Used offers are not Buy Box rivals). Landed = price + shipping.
 */
export async function fetchAmazonOffers(
  asin: string,
  domain: string
): Promise<{ data: AmazonFetch; fromCache: boolean }> {
  const key = `${domain}:${asin}`;
  const cached = cache.get(key);
  if (cached) return { data: cached, fromCache: true };

  if (!config.apifyToken) throw new Error("APIFY_TOKEN not configured");

  const url =
    `https://api.apify.com/v2/acts/${config.apifyAmazonActor}` +
    `/run-sync-get-dataset-items?token=${config.apifyToken}`;

  const raw = (await fetchJson(
    url,
    { input: [{ asin, domain, startPage: 1 }] },
    config.apifyTimeoutMs,
    "Amazon data source"
  )) as RawAmazonOffer[];

  const data = normalizeAmazonOffers(Array.isArray(raw) ? raw : []);
  cache.set(key, data);
  return { data, fromCache: false };
}
