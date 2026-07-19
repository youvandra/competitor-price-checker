import { fetchAmazonOffers } from "./amazon.js";
import { fetchEbayOffers } from "./ebay.js";
import { fetchWalmartOffers } from "./walmart.js";
import { fetchAliexpressOffers } from "./aliexpress.js";
import { fetchEtsyOffers } from "./etsy.js";
import { relevanceFilter, toUsd, isNonUsd } from "./util.js";
import type { NormalizedOffer } from "./types.js";

// Best Price Scan: fan out across every marketplace for one product and report
// where it is cheapest, in one call. Resilient — a marketplace that errors or
// times out is reported as such and does not sink the others.

export interface MarketEntry {
  marketplace: string;
  status: "ok" | "empty" | "error";
  leaderPrice?: number; // native currency
  currency?: string; // symbol
  leaderPriceUsd?: number; // converted for ranking
  converted?: boolean; // true if not originally USD
  leaderSeller?: string;
  offerCount?: number;
  error?: string;
}

export interface BestPrice {
  summary: string;
  query: string;
  cheapest: { marketplace: string; priceUsd: number; native: string } | null;
  results: MarketEntry[]; // sorted cheapest-first (ok ones), then empty/error
  yourPrice?: number;
  savingsVsCheapestUsd?: number;
  evidence: {
    marketplacesScanned: number;
    marketplacesWithOffers: number;
    fxNote: string;
    caveat: string;
  };
  /** Composable follow-up hints so a calling agent can continue the flow. */
  nextActions: string[];
}

function leaderOf(offers: NormalizedOffer[]): NormalizedOffer | null {
  if (offers.length === 0) return null;
  return offers.reduce((best, o) => (o.landed < best.landed ? o : best), offers[0]);
}

const fmt = (n: number) => Math.round(n * 100) / 100;

/**
 * Pure aggregation: given per-marketplace entries, rank by USD leader price,
 * pick the cheapest, compute savings vs the caller's price, write a summary.
 */
export function aggregateBestPrice(
  query: string,
  entries: MarketEntry[],
  myPrice?: number
): BestPrice {
  const withOffers = entries.filter(
    (e) => e.status === "ok" && typeof e.leaderPriceUsd === "number"
  );
  withOffers.sort((a, b) => (a.leaderPriceUsd as number) - (b.leaderPriceUsd as number));
  const rest = entries.filter((e) => !withOffers.includes(e));
  const results = [...withOffers, ...rest];

  const top = withOffers[0];
  const cheapest = top
    ? {
        marketplace: top.marketplace,
        priceUsd: top.leaderPriceUsd as number,
        native: `${top.currency}${top.leaderPrice}`,
      }
    : null;

  let savingsVsCheapestUsd: number | undefined;
  if (cheapest && typeof myPrice === "number") {
    savingsVsCheapestUsd = fmt(myPrice - cheapest.priceUsd);
  }

  const anyConverted = withOffers.some((e) => e.converted);
  const anyFailed = entries.some((e) => e.status === "error");

  const nextActions: string[] = [];
  if (top) {
    const short = top.marketplace.replace(/\.(com|co\.uk|de)$/, "");
    nextActions.push(
      `Call POST /${short} for the full 4-strategy pricing breakdown on ${short} (the cheapest).`
    );
  }
  if (typeof myPrice !== "number")
    nextActions.push("Pass `my_price` to see how far above the best price you are.");
  if (anyFailed)
    nextActions.push("Some marketplaces didn't respond — retry to include them.");

  return {
    summary: buildSummary(cheapest, withOffers.length, myPrice, savingsVsCheapestUsd),
    query,
    cheapest,
    results,
    yourPrice: myPrice,
    savingsVsCheapestUsd,
    evidence: {
      marketplacesScanned: entries.length,
      marketplacesWithOffers: withOffers.length,
      fxNote: anyConverted
        ? "Non-USD prices converted to USD at approximate static rates for ranking only."
        : "All prices in USD.",
      caveat:
        "Keyword marketplaces match by search, so listings may not be the identical item; Amazon is matched by ASIN. Compare the linked listings before acting.",
    },
    nextActions,
  };
}

function buildSummary(
  cheapest: BestPrice["cheapest"],
  n: number,
  myPrice?: number,
  savings?: number
): string {
  if (!cheapest) return "No competing offers found on any marketplace.";
  const name = cheapest.marketplace.replace(/\.(com|co\.uk|de)$/, "");
  let s = `Cheapest on ${name}: $${cheapest.priceUsd} (of ${n} marketplaces with offers).`;
  if (typeof myPrice === "number") {
    s +=
      typeof savings === "number" && savings > 0
        ? ` You're $${savings} above the best price.`
        : ` You're already at or below the best price.`;
  }
  return s;
}

export interface BestPriceInput {
  query: string;
  amazonAsin?: string;
  amazonDomain?: string;
  myPrice?: number;
}

/** Fan out to every marketplace, then aggregate. */
export async function runBestPrice(input: BestPriceInput): Promise<BestPrice> {
  const { query, amazonAsin, amazonDomain, myPrice } = input;

  const keyword: Array<[string, (q: string) => ReturnType<typeof fetchEbayOffers>]> = [
    ["ebay.com", fetchEbayOffers],
    ["walmart.com", fetchWalmartOffers],
    ["aliexpress.com", fetchAliexpressOffers],
    ["etsy.com", fetchEtsyOffers],
  ];

  const jobs: Promise<MarketEntry>[] = keyword.map(([marketplace, fetchFn]) =>
    fetchFn(query)
      .then(({ data }): MarketEntry => {
        const offers = relevanceFilter(data.offers, myPrice);
        const leader = leaderOf(offers);
        if (!leader) return { marketplace, status: "empty", offerCount: 0 };
        return {
          marketplace,
          status: "ok",
          leaderPrice: leader.landed,
          currency: data.currency,
          leaderPriceUsd: toUsd(leader.landed, data.currency),
          converted: isNonUsd(data.currency),
          leaderSeller: leader.sellerName,
          offerCount: offers.length,
        };
      })
      .catch((err): MarketEntry => ({
        marketplace,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      }))
  );

  if (amazonAsin) {
    jobs.push(
      fetchAmazonOffers(amazonAsin, amazonDomain || "com")
        .then(({ data }): MarketEntry => {
          const leader = leaderOf(data.offers);
          if (!leader) return { marketplace: "amazon.com", status: "empty", offerCount: 0 };
          return {
            marketplace: "amazon.com",
            status: "ok",
            leaderPrice: leader.landed,
            currency: data.currency,
            leaderPriceUsd: toUsd(leader.landed, data.currency),
            converted: isNonUsd(data.currency),
            leaderSeller: leader.sellerName,
            offerCount: data.offers.length,
          };
        })
        .catch((err): MarketEntry => ({
          marketplace: "amazon.com",
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        }))
    );
  }

  const entries = await Promise.all(jobs);
  return aggregateBestPrice(query, entries, myPrice);
}
