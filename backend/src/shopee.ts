import { config } from "./config.js";
import { cleanSeller, currencySymbol } from "./util.js";
import { makeKeywordAdapter, type KeywordFetchData } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// Shopee adapter: keyword -> Apify Shopee search -> NormalizedOffer[].
// Keyword-based (Definition B), SEA. Actor gio21/shopee-scraper returns prices
// in the site's local currency (IDR/SGD/THB...) — the Best Price scan converts
// to USD for ranking. Search omits shipping, so landed == price. Note: the item
// title field is `name`, not `title`. Free Apify plans return mock data only.

export interface RawShopeeItem {
  name?: string;
  price?: number;
  currency?: string; // "IDR" | "SGD" | "THB" | ...
  shopName?: string;
  rating?: number;
}

export function mapShopeeRows(rows: RawShopeeItem[]): KeywordFetchData {
  const offers: NormalizedOffer[] = rows
    .filter((o) => typeof o.price === "number" && o.price > 0)
    .map((o) => {
      const price = o.price as number;
      return {
        sellerName: o.shopName ? cleanSeller(o.shopName) : "Shopee seller",
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
    keywords: [query],
    country: config.shopeeCountry,
    maxItems: config.shopeeMaxItems,
  }),
  mapRows: mapShopeeRows,
});
