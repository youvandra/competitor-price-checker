import { config } from "./config.js";
import { makeKeywordAdapter, type KeywordFetchData } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// Target adapter: keyword -> Apify Target search -> NormalizedOffer[].
// Keyword-based (Definition B), US/USD, sold by Target. The actor
// (ecomscrape/target-product-search-scraper) nests price under `price`; the
// search omits a shipping figure, so landed == price.

export interface RawTargetItem {
  title?: string;
  price?: { current_retail?: number; formatted_current_price?: string };
  rating_score?: number;
  primary_brand?: { name?: string };
}

export function mapTargetRows(rows: RawTargetItem[]): KeywordFetchData {
  const offers: NormalizedOffer[] = rows
    .map((o) => ({ o, price: o.price?.current_retail }))
    .filter((x): x is { o: RawTargetItem; price: number } =>
      typeof x.price === "number" && x.price > 0
    )
    .map(({ o, price }) => ({
      // Target is the seller; surface the brand as a hint when present.
      sellerName: o.primary_brand?.name || "Target",
      price,
      shipping: 0,
      landed: price,
      condition: "New",
      prime: false,
      sellerRating: typeof o.rating_score === "number" ? String(o.rating_score) : undefined,
    }));
  return { offers, currency: "$", totalOffers: rows.length };
}

export const fetchTargetOffers = makeKeywordAdapter<RawTargetItem>({
  prefix: "target",
  label: "Target",
  getActor: () => config.apifyTargetActor,
  buildBody: (query) => ({
    keyword: query,
    max_items_per_url: config.targetMaxItems,
    sort_by: "Relevance",
  }),
  mapRows: mapTargetRows,
});
