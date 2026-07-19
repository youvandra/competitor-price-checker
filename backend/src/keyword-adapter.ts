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

    // Some actors return a single error-wrapper row instead of listings — e.g.
    // an anti-bot "blocked wall" ({error}) or a bot-challenge ({type, reason,
    // message}). Surface it as a failure rather than silently reporting "no
    // competitors found".
    const isErrorRow = (r: unknown): boolean => {
      if (!r || typeof r !== "object") return false;
      const o = r as Record<string, unknown>;
      return "error" in o || ("reason" in o && ("message" in o || "type" in o));
    };
    if (rows.length > 0 && rows.every(isErrorRow)) {
      const o = rows[0] as Record<string, unknown>;
      const msg = o.error ?? o.message ?? o.reason;
      throw new Error(`${cfg.label} upstream returned an error: ${String(msg)}`);
    }

    const data = cfg.mapRows(rows);
    cache.set(key, data);
    return { data, fromCache: false };
  };
}
