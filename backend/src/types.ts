// Marketplace-agnostic shapes. Every marketplace adapter normalizes its raw
// scraper output into NormalizedOffer[], and the strategy engine turns those
// into the uniform Advice result — so every service returns the same shape.

export interface NormalizedOffer {
  sellerName: string;
  sellerId?: string;
  /** Item price only, in the listing currency. */
  price: number;
  /** Shipping cost (0 = free). */
  shipping: number;
  /** What a buyer actually pays: price + shipping. Comparison basis. */
  landed: number;
  /** "New" | "Used - Very Good" | ... — we compare New offers for Buy Box. */
  condition: string;
  prime: boolean;
  sellerRating?: string;
}

export interface MarketStats {
  currency: string;
  offerCount: number; // New offers/listings considered
  totalOffers: number; // all offers/listings returned (incl. non-New)
  lowest: number; // lowest landed (New)
  highest: number; // highest landed (New)
  median: number; // median landed (New)
  /** The price to beat = lowest landed New offer/listing. */
  leaderPrice: number;
  leaderSeller: string;
  /** What the leader represents on this marketplace: "Buy Box" | "lowest listing". */
  leaderLabel: string;
  /** Where the caller's own price sits. Null if my_price not given. */
  yourPosition: string | null;
}

export interface Strategy {
  name: "Win" | "Match" | "Premium Hold" | "Margin Floor";
  price: number;
  note: string;
  /** Absolute margin at this price if my_cost was supplied. */
  margin?: number;
}

export interface Evidence {
  source: string;
  marketplace: string;
  analyzedCount: number;
  fromCache: boolean;
  caveat: string;
}

export interface Advice {
  summary: string;
  product: { id: string; url?: string; marketplace: string; currency: string };
  market: MarketStats;
  strategies: Strategy[];
  recommendation: Strategy["name"];
  evidence: Evidence;
}

export interface CheckInput {
  productUrl?: string;
  asin?: string;
  myPrice?: number;
  myCost?: number;
  domain?: string;
}
