import { config } from "./config.js";
import { makeKeywordAdapter, type KeywordFetchData } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// Target adapter: keyword -> Apify Target search -> NormalizedOffer[].
// Keyword-based (Definition B), US/USD, sold by Target. Actor
// shahidirfan/target-product-scraper (pay-per-event) returns a flat item with
// a numeric `current_retail`; the search omits shipping, so landed == price.

export interface RawTargetItem {
  title?: string;
  brand?: string;
  current_retail?: number;
  rating_average?: number;
  sold_out?: boolean;
  is_out_of_stock_all_locations?: boolean;
}

export function mapTargetRows(rows: RawTargetItem[]): KeywordFetchData {
  const offers: NormalizedOffer[] = rows
    .filter(
      (o) =>
        typeof o.current_retail === "number" &&
        o.current_retail > 0 &&
        !o.sold_out &&
        !o.is_out_of_stock_all_locations
    )
    .map((o) => {
      const price = o.current_retail as number;
      return {
        // Target is the seller; surface the brand as a hint when present.
        sellerName: o.brand || "Target",
        price,
        shipping: 0,
        landed: price,
        condition: "New",
        prime: false,
        sellerRating:
          typeof o.rating_average === "number" ? String(o.rating_average) : undefined,
      };
    });
  return { offers, currency: "$", totalOffers: rows.length };
}

export const fetchTargetOffers = makeKeywordAdapter<RawTargetItem>({
  prefix: "target",
  label: "Target",
  getActor: () => config.apifyTargetActor,
  buildBody: (query) => ({
    keyword: query,
    results_wanted: config.targetMaxItems,
  }),
  mapRows: mapTargetRows,
});
