import { config } from "./config.js";
import { cleanSeller, currencySymbol } from "./util.js";
import { makeKeywordAdapter } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// Etsy adapter: keyword -> Apify Etsy search -> NormalizedOffer[].
// Keyword-based (Definition B). Handmade/vintage goods; a shop is the seller.

interface RawEtsyItem {
  price?: string | number;
  currency?: string;
  shop?: string;
  rating?: number;
  freeShipping?: boolean;
  availability?: string;
  isDigitalDownload?: boolean;
}

const inStock = (a: string | undefined) => !a || /in stock|available/i.test(a);

export const fetchEtsyOffers = makeKeywordAdapter<RawEtsyItem>({
  prefix: "etsy",
  label: "Etsy",
  getActor: () => config.apifyEtsyActor,
  buildBody: (query) => ({ searchQuery: query, maxItems: config.etsyMaxItems }),
  mapRows: (rows) => {
    const offers: NormalizedOffer[] = rows
      .filter((o) => !o.isDigitalDownload && inStock(o.availability))
      .map((o) => ({ o, num: Number(o.price) }))
      .filter(({ num }) => Number.isFinite(num) && num > 0)
      .map(({ o, num }) => {
        const price = Math.round(num * 100) / 100;
        return {
          sellerName: o.shop ? cleanSeller(o.shop) : "Etsy shop",
          price,
          shipping: 0, // Etsy search omits a shipping figure
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
