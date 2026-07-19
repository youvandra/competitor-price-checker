import { config } from "./config.js";
import { cleanSeller, currencySymbol, parseShipping } from "./util.js";
import { makeKeywordAdapter } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// AliExpress adapter: keyword -> Apify AliExpress search -> NormalizedOffer[].
// Keyword-based (Definition B). A "seller" is not always given, so we fall back
// to the store / top-rated flag.

interface RawAliItem {
  price?: number;
  currency?: string;
  rating?: number;
  shipping?: string; // "Free shipping over €10" | "€2.30" | ...
  storeName?: string;
  isTopRated?: boolean;
}

export const fetchAliexpressOffers = makeKeywordAdapter<RawAliItem>({
  prefix: "aliexpress",
  label: "AliExpress",
  getActor: () => config.apifyAliexpressActor,
  buildBody: (query) => ({
    keywords: [query],
    maxItems: config.aliexpressMaxItems,
    sort: "default",
  }),
  mapRows: (rows) => {
    const offers: NormalizedOffer[] = rows
      .filter((o) => typeof o.price === "number" && o.price > 0)
      .map((o) => {
        const price = o.price as number;
        const shipping = parseShipping(o.shipping);
        return {
          sellerName: o.storeName
            ? cleanSeller(o.storeName)
            : o.isTopRated
              ? "Top-rated store"
              : "AliExpress seller",
          price,
          shipping,
          landed: Math.round((price + shipping) * 100) / 100,
          condition: "New",
          prime: false,
          sellerRating: typeof o.rating === "number" ? String(o.rating) : undefined,
        };
      });
    const currency = currencySymbol(rows.find((o) => o.currency)?.currency);
    return { offers, currency, totalOffers: rows.length };
  },
});
