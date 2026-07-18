import { config } from "./config.js";
import type {
  Advice,
  MarketStats,
  NormalizedOffer,
  Strategy,
} from "./types.js";

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface BuildAdviceArgs {
  marketplace: string;
  productId: string;
  productUrl?: string;
  currency: string;
  offers: NormalizedOffer[];
  totalOffers: number;
  fromCache: boolean;
  myPrice?: number;
  myCost?: number;
}

/**
 * Turn normalized competing offers into the uniform Advice result: market
 * stats + a menu of pricing strategies (not one forced number) + an honest
 * evidence block. Marketplace-agnostic — every adapter feeds into this.
 */
export function buildAdvice(args: BuildAdviceArgs): Advice {
  const {
    marketplace,
    productId,
    productUrl,
    currency,
    offers,
    totalOffers,
    fromCache,
    myPrice,
    myCost,
  } = args;

  const landeds = offers.map((o) => o.landed);
  const cheapest = offers.reduce(
    (best, o) => (o.landed < best.landed ? o : best),
    offers[0]
  );

  const buyBoxPrice = cheapest ? cheapest.landed : 0;
  const lowest = landeds.length ? Math.min(...landeds) : 0;
  const highest = landeds.length ? Math.max(...landeds) : 0;
  const med = r2(median(landeds));

  let yourPosition: string | null = null;
  if (typeof myPrice === "number" && offers.length > 0) {
    const cheaperThanMe = offers.filter((o) => o.landed < myPrice).length;
    const rank = cheaperThanMe + 1; // 1 = you are cheapest
    if (myPrice <= buyBoxPrice) {
      yourPosition = `you are the cheapest New offer (rank ${rank}/${offers.length + 1})`;
    } else {
      const gap = r2(myPrice - buyBoxPrice);
      yourPosition = `${currency}${gap} above the Buy Box — rank ${rank}/${
        offers.length + 1
      }, losing the Buy Box`;
    }
  }

  const market: MarketStats = {
    currency,
    offerCount: offers.length,
    totalOffers,
    lowest: r2(lowest),
    highest: r2(highest),
    median: med,
    buyBoxPrice: r2(buyBoxPrice),
    buyBoxSeller: cheapest ? cheapest.sellerName : "n/a",
    yourPosition,
  };

  const strategies: Strategy[] = [];
  const withMargin = (price: number): number | undefined =>
    typeof myCost === "number" ? r2(price - myCost) : undefined;

  if (offers.length > 0) {
    const winPrice = r2(buyBoxPrice - config.undercutStep);
    strategies.push({
      name: "Win",
      price: winPrice,
      note: `undercut the cheapest New offer (${currency}${market.buyBoxPrice} by ${cheapest.sellerName}) by ${config.undercutStep} to take the Buy Box`,
      margin: withMargin(winPrice),
    });
    strategies.push({
      name: "Match",
      price: market.buyBoxPrice,
      note: `match the Buy Box price — stay competitive without starting a price war`,
      margin: withMargin(market.buyBoxPrice),
    });
    const premium = typeof myPrice === "number" ? Math.max(myPrice, highest) : highest;
    strategies.push({
      name: "Premium Hold",
      price: r2(premium),
      note: `hold a higher price and lean on your seller rating / Prime / faster shipping instead of racing to the bottom`,
      margin: withMargin(premium),
    });
  }

  if (typeof myCost === "number") {
    // Never advise below cost. Floor = cost (0 margin). Everything under = loss.
    strategies.push({
      name: "Margin Floor",
      price: r2(myCost),
      note: `your cost is ${currency}${r2(
        myCost
      )} — do NOT price below this; any Win/Match option under it sells at a loss`,
      margin: 0,
    });
  }

  const recommendation = pickRecommendation(strategies, market, myPrice, myCost);

  return {
    summary: buildSummary(currency, market, myPrice, recommendation, strategies),
    product: { id: productId, url: productUrl, marketplace, currency },
    market,
    strategies,
    recommendation,
    evidence: {
      source: "Apify axesso amazon-product-offers-scraper",
      marketplace,
      analyzedCount: offers.length,
      fromCache,
      caveat:
        "Buy Box is approximated by the lowest landed New offer. Amazon's real Buy Box also weighs Prime, seller rating, fulfillment and stock — price alone is not decisive.",
    },
  };
}

function pickRecommendation(
  strategies: Strategy[],
  market: MarketStats,
  myPrice?: number,
  myCost?: number
): Strategy["name"] {
  if (strategies.length === 0) return "Premium Hold";
  const win = strategies.find((s) => s.name === "Win");
  // If undercutting would sell below cost, don't recommend Win.
  if (win && typeof myCost === "number" && win.price < myCost) return "Premium Hold";
  // Already at/under the Buy Box -> no need to cut further.
  if (typeof myPrice === "number" && myPrice <= market.buyBoxPrice) return "Premium Hold";
  return "Win";
}

function buildSummary(
  currency: string,
  market: MarketStats,
  myPrice: number | undefined,
  rec: Strategy["name"],
  strategies: Strategy[]
): string {
  if (market.offerCount === 0) {
    return "No competing New offers found — you are effectively uncontested on this listing.";
  }
  const recPrice = strategies.find((s) => s.name === rec)?.price;
  const you =
    typeof myPrice === "number"
      ? ` You are at ${currency}${myPrice} (${market.yourPosition}).`
      : "";
  return (
    `Buy Box ${currency}${market.buyBoxPrice} by ${market.buyBoxSeller} across ` +
    `${market.offerCount} New offers (range ${currency}${market.lowest}–${currency}${market.highest}).` +
    you +
    (recPrice !== undefined
      ? ` Recommendation: ${rec} at ${currency}${recPrice}.`
      : ` Recommendation: ${rec}.`)
  );
}
