import { config } from "./config.js";
import { cleanSeller, currencySymbol } from "./util.js";
import { makeKeywordAdapter } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// Walmart adapter: keyword -> Apify Walmart search -> NormalizedOffer[].
// Keyword-based (Definition B). Walmart items are New; the scraper reports no
// shipping cost, so landed == price.

interface RawWalmartItem {
  price?: number;
  currency?: string;
  rating?: number;
  seller?: string;
  availability?: string;
}

const inStock = (a: string | undefined) => !a || /in stock|available/i.test(a);

export const fetchWalmartOffers = makeKeywordAdapter<RawWalmartItem>({
  prefix: "walmart",
  label: "Walmart",
  getActor: () => config.apifyWalmartActor,
  buildBody: (query) => ({
    searchKeywords: [query],
    maxResults: config.walmartMaxItems,
  }),
  mapRows: (rows) => {
    const offers: NormalizedOffer[] = rows
      .filter((o) => typeof o.price === "number" && o.price > 0 && inStock(o.availability))
      .map((o) => {
        const price = o.price as number;
        return {
          sellerName: cleanSeller(o.seller),
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
  },
});
