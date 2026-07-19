import { config } from "./config.js";
import { cleanSeller, parseShipping } from "./util.js";
import { makeKeywordAdapter, type KeywordFetchData } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// eBay adapter: keyword -> Apify eBay search -> NormalizedOffer[].
// eBay has NO shared Buy Box — "competitors" are similar Buy-It-Now listings
// surfaced by the search query. Keyword-based (Definition B).

export interface RawEbayItem {
  price?: number;
  shippingCost?: string; // "Free delivery" | "+US $5.99 delivery" | ""
  condition?: string; // "Brand New" | "New" | "Used" | ...
  listingType?: string; // "Buy It Now" | "Auction"
  sellerName?: string;
  sellerFeedbackPercent?: string;
}

export function mapEbayRows(rows: RawEbayItem[]): KeywordFetchData {
  const offers: NormalizedOffer[] = rows
    .filter(
      (o) =>
        typeof o.price === "number" &&
        /new/i.test(o.condition ?? "") &&
        !/auction/i.test(o.listingType ?? "")
    )
    .map((o) => {
      const price = o.price as number;
      const shipping = parseShipping(o.shippingCost);
      return {
        sellerName: cleanSeller(o.sellerName),
        price,
        shipping,
        landed: Math.round((price + shipping) * 100) / 100,
        condition: o.condition || "New",
        prime: false,
        sellerRating: o.sellerFeedbackPercent,
      };
    });
  return { offers, currency: "$", totalOffers: rows.length };
}

export const fetchEbayOffers = makeKeywordAdapter<RawEbayItem>({
  prefix: "ebay",
  label: "eBay",
  getActor: () => config.apifyEbayActor,
  buildBody: (query) => ({
    searchQueries: [query],
    maxProductsPerSearch: config.ebayMaxItems,
    maxSearchPages: 1,
    listingType: "buy_it_now",
    condition: ["new"],
    sort: "best_match",
  }),
  mapRows: mapEbayRows,
});
