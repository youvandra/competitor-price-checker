import { config } from "./config.js";
import { cleanSeller, currencySymbol } from "./util.js";
import { makeKeywordAdapter, type KeywordFetchData } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// Best Buy adapter: keyword -> Apify Best Buy search -> NormalizedOffer[].
// Keyword-based (Definition B). Electronics are New; the search omits a
// shipping figure, so landed == price. Sold by Best Buy or a marketplace seller.

export interface RawBestBuyItem {
  price?: number;
  currency?: string;
  rating?: number;
  seller?: string;
  availability?: string;
}

// In stock unless the row explicitly says otherwise.
const inStock = (a: string | undefined) => !/sold out|unavailable|out of stock/i.test(a ?? "");

export function mapBestBuyRows(rows: RawBestBuyItem[]): KeywordFetchData {
  const offers: NormalizedOffer[] = rows
    .filter((o) => typeof o.price === "number" && o.price > 0 && inStock(o.availability))
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
  const currency = currencySymbol(rows.find((o) => o.currency)?.currency);
  return { offers, currency, totalOffers: rows.length };
}

export const fetchBestBuyOffers = makeKeywordAdapter<RawBestBuyItem>({
  prefix: "bestbuy",
  label: "Best Buy",
  getActor: () => config.apifyBestBuyActor,
  buildBody: (query) => ({
    searchKeywords: [query],
    maxResults: config.bestBuyMaxItems,
  }),
  mapRows: mapBestBuyRows,
});
