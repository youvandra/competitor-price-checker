import { config } from "./config.js";
import { cleanSeller, currencySymbol } from "./util.js";
import { makeKeywordAdapter, type KeywordFetchData } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// Shopee adapter: keyword -> Apify Shopee search -> NormalizedOffer[].
// Keyword-based (Definition B), SEA. Actor xtracto/shopee-search (pay-per-event)
// returns prices in the site's local currency (IDR/SGD/...) — the Best Price
// scan converts to USD for ranking. Search omits shipping, so landed == price.
// The item title field is `name`; there is no shop-name field, so the seller is
// derived from the Mall flag / location.

export interface RawShopeeItem {
  name?: string;
  price?: number;
  currency?: string; // "IDR" | "SGD" | "MYR" | ...
  rating?: number;
  location?: string;
  is_mall?: boolean;
}

export function mapShopeeRows(rows: RawShopeeItem[]): KeywordFetchData {
  const offers: NormalizedOffer[] = rows
    .filter((o) => typeof o.price === "number" && o.price > 0)
    .map((o) => {
      const price = o.price as number;
      const seller = o.is_mall
        ? "Shopee Mall"
        : o.location
          ? `Shopee seller (${cleanSeller(o.location)})`
          : "Shopee seller";
      return {
        sellerName: seller,
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

export const fetchShopeeOffers = makeKeywordAdapter<RawShopeeItem>({
  prefix: "shopee",
  label: "Shopee",
  getActor: () => config.apifyShopeeActor,
  buildBody: (query) => ({
    mode: "keyword",
    keyword: query,
    country: config.shopeeCountry.toLowerCase(),
    maxProducts: config.shopeeMaxItems,
  }),
  mapRows: mapShopeeRows,
});
