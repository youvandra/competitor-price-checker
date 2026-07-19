import { config } from "./config.js";
import { TtlCache } from "./cache.js";
import { fetchJson } from "./util.js";
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

    const raw = (await fetchJson(
      url,
      cfg.buildBody(query),
      config.apifyTimeoutMs,
      `${cfg.label} data source`
    )) as unknown;
    const rows = (Array.isArray(raw) ? raw : []) as Row[];

    // Some actors return a single error-wrapper row (e.g. an anti-bot "blocked
    // wall") instead of listings. Surface it as a failure rather than silently
    // reporting "no competitors found".
    if (
      rows.length > 0 &&
      rows.every((r) => r && typeof r === "object" && "error" in (r as object))
    ) {
      const first = rows[0] as { error?: unknown };
      throw new Error(`${cfg.label} upstream returned an error: ${String(first.error)}`);
    }

    const data = cfg.mapRows(rows);
    cache.set(key, data);
    return { data, fromCache: false };
  };
}
