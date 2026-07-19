import { config } from "./config.js";
import { cleanSeller, currencySymbol } from "./util.js";
import { makeKeywordAdapter, type KeywordFetchData } from "./keyword-adapter.js";
import type { NormalizedOffer } from "./types.js";

// Mercado Libre adapter: keyword -> Apify Mercado Libre search -> NormalizedOffer[].
// Keyword-based (Definition B), LATAM. Actor scrapers_lat/mercadolibre-scraper
// returns prices in the site's local currency (BRL/MXN/ARS...) — the Best Price
// scan converts to USD for ranking. Search omits shipping, so landed == price.

export interface RawMeliItem {
  title?: string;
  price?: number;
  currency?: string; // "BRL" | "MXN" | "ARS" | ...
  sellerName?: string;
  freeShipping?: boolean;
  availableStock?: number;
}

export function mapMercadoLibreRows(rows: RawMeliItem[]): KeywordFetchData {
  const offers: NormalizedOffer[] = rows
    .filter(
      (o) =>
        typeof o.price === "number" &&
        o.price > 0 &&
        (o.availableStock == null || o.availableStock > 0)
    )
    .map((o) => {
      const price = o.price as number;
      return {
        sellerName: o.sellerName ? cleanSeller(o.sellerName) : "Mercado Libre seller",
        price,
        shipping: 0,
        landed: price,
        condition: "New",
        prime: false,
      };
    });
  const currency = currencySymbol(rows.find((o) => o.currency)?.currency);
  return { offers, currency, totalOffers: rows.length };
}

export const fetchMercadoLibreOffers = makeKeywordAdapter<RawMeliItem>({
  prefix: "mercadolibre",
  label: "Mercado Libre",
  getActor: () => config.apifyMercadoLibreActor,
  buildBody: (query) => ({
    searchTerm: query,
    maxListings: config.mercadoLibreMaxItems,
    country: config.mercadoLibreCountry,
  }),
  mapRows: mapMercadoLibreRows,
});
