import { config } from "./config.js";
import { TtlCache } from "./cache.js";
import type { NormalizedOffer } from "./types.js";

// Shared plumbing for keyword-based marketplace adapters (eBay, Walmart,
// AliExpress, Etsy). They only differ in: which Apify actor, the request body,
// and how a raw row maps to NormalizedOffer[]. Everything else — cache, the
// run-sync call, error handling — lives here.

export interface KeywordFetchData {
  offers: NormalizedOffer[];
  currency: string;
  totalOffers: number;
}

export type KeywordFetch = (
  query: string
) => Promise<{ data: KeywordFetchData; fromCache: boolean }>;

export interface KeywordAdapterConfig<Row> {
  /** Cache key prefix, e.g. "ebay". */
  prefix: string;
  /** Human label for error messages, e.g. "eBay". */
  label: string;
  /** Returns the Apify actor id (read lazily so env/config changes apply). */
  getActor: () => string;
  /** Build the actor input body from the search query. */
  buildBody: (query: string) => unknown;
  /** Normalize raw rows into offers + currency + total count. */
  mapRows: (rows: Row[]) => KeywordFetchData;
}

export function makeKeywordAdapter<Row>(
  cfg: KeywordAdapterConfig<Row>
): KeywordFetch {
  const cache = new TtlCache<KeywordFetchData>(config.offersCacheTtlMs);

  return async (query: string) => {
    const key = `${cfg.prefix}:${query.toLowerCase()}`;
    const cached = cache.get(key);
    if (cached) return { data: cached, fromCache: true };

    if (!config.apifyToken) throw new Error("APIFY_TOKEN not configured");

    const url =
      `https://api.apify.com/v2/acts/${cfg.getActor()}` +
      `/run-sync-get-dataset-items?token=${config.apifyToken}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg.buildBody(query)),
    });
    if (!res.ok) throw new Error(`Apify ${cfg.label} actor failed: HTTP ${res.status}`);

    const raw = (await res.json()) as Row[];
    const data = cfg.mapRows(Array.isArray(raw) ? raw : []);
    cache.set(key, data);
    return { data, fromCache: false };
  };
}
