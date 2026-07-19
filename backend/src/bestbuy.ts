import { config } from "./config.js";
import { cleanSeller } from "./util.js";
import { makeKeywordAdapter, type KeywordFetchData } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// Best Buy adapter: keyword -> Apify Best Buy search -> NormalizedOffer[].
// Keyword-based (Definition B), US/USD. Actor gio21/bestbuy-scraper does not
// publish an output sample, so these field names are best-effort and may need a
// tweak after the first live run. Search omits shipping, so landed == price.

export interface RawBestBuyItem {
  title?: string;
  price?: number;
  seller?: string;
  rating?: number;
  sku?: string;
}

export function mapBestBuyRows(rows: RawBestBuyItem[]): KeywordFetchData {
  const offers: NormalizedOffer[] = rows
    .filter((o) => typeof o.price === "number" && o.price > 0)
    .map((o) => {
      const price = o.price as number;
      return {
        sellerName: o.seller ? cleanSeller(o.seller) : "Best Buy",
        price,
        shipping: 0,
        landed: price,
        condition: "New",
        prime: false,
        sellerRating: typeof o.rating === "number" ? String(o.rating) : undefined,
      };
    });
  return { offers, currency: "$", totalOffers: rows.length };
}

export const fetchBestBuyOffers = makeKeywordAdapter<RawBestBuyItem>({
  prefix: "bestbuy",
  label: "Best Buy",
  getActor: () => config.apifyBestBuyActor,
  buildBody: (query) => ({
    searchTerm: query,
    maxItems: config.bestBuyMaxItems,
  }),
  mapRows: mapBestBuyRows,
});
