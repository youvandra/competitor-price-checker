import { config } from "./config.js";
import { cleanSeller, currencySymbol } from "./util.js";
import { makeKeywordAdapter, type KeywordFetchData } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// Mercado Libre adapter: keyword -> Apify Mercado Libre search -> NormalizedOffer[].
// Keyword-based (Definition B), LATAM. Prices are in the site's local currency
// (BRL/MXN/...) — the Best Price scan converts to USD for ranking. Many listings
// ship free; when they don't the search omits a figure, so landed == price.

export interface RawMeliItem {
  price?: number;
  currency_id?: string; // "BRL" | "MXN" | "ARS" | ...
  condition?: string; // "new" | "used"
  seller_nickname?: string;
  seller_reputation?: string;
  available_quantity?: number;
  free_shipping?: boolean;
}

export function mapMercadoLibreRows(rows: RawMeliItem[]): KeywordFetchData {
  const offers: NormalizedOffer[] = rows
    .filter(
      (o) =>
        typeof o.price === "number" &&
        o.price > 0 &&
        /new/i.test(o.condition ?? "new") &&
        (o.available_quantity == null || o.available_quantity > 0)
    )
    .map((o) => {
      const price = o.price as number;
      return {
        sellerName: o.seller_nickname ? cleanSeller(o.seller_nickname) : "Mercado Libre seller",
        price,
        shipping: 0,
        landed: price,
        condition: "New",
        prime: false,
        sellerRating: o.seller_reputation,
      };
    });
  const currency = currencySymbol(rows.find((o) => o.currency_id)?.currency_id);
  return { offers, currency, totalOffers: rows.length };
}

export const fetchMercadoLibreOffers = makeKeywordAdapter<RawMeliItem>({
  prefix: "mercadolibre",
  label: "Mercado Libre",
  getActor: () => config.apifyMercadoLibreActor,
  buildBody: (query) => ({
    search: query,
    maxItems: config.mercadoLibreMaxItems,
  }),
  mapRows: mapMercadoLibreRows,
});
