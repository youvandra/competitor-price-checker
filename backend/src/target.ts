import { config } from "./config.js";
import { cleanSeller, currencySymbol } from "./util.js";
import { makeKeywordAdapter, type KeywordFetchData } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// Target adapter: keyword -> Apify Target search -> NormalizedOffer[].
// Keyword-based (Definition B). Items are New and sold by Target or a
// marketplace partner; the search omits a shipping figure, so landed == price.

export interface RawTargetItem {
  price?: number;
  currency?: string;
  rating?: number;
  seller?: string;
  availability?: string;
}

const inStock = (a: string | undefined) => !a || /in stock|available/i.test(a);

export function mapTargetRows(rows: RawTargetItem[]): KeywordFetchData {
  const offers: NormalizedOffer[] = rows
    .filter((o) => typeof o.price === "number" && o.price > 0 && inStock(o.availability))
    .map((o) => {
      const price = o.price as number;
      return {
        sellerName: o.seller ? cleanSeller(o.seller) : "Target",
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

export const fetchTargetOffers = makeKeywordAdapter<RawTargetItem>({
  prefix: "target",
  label: "Target",
  getActor: () => config.apifyTargetActor,
  buildBody: (query) => ({
    searchKeywords: [query],
    maxResults: config.targetMaxItems,
  }),
  mapRows: mapTargetRows,
});
