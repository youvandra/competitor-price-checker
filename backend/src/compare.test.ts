import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateBestPrice, type MarketEntry } from "./compare.js";
import { toUsd, isNonUsd } from "./util.js";

test("toUsd converts by symbol, isNonUsd flags conversion", () => {
  assert.equal(toUsd(100, "$"), 100);
  assert.equal(toUsd(100, "€"), 108);
  assert.equal(toUsd(100, "£"), 127);
  assert.equal(isNonUsd("$"), false);
  assert.equal(isNonUsd("€"), true);
});

test("aggregateBestPrice ranks by USD, picks cheapest, computes savings", () => {
  const entries: MarketEntry[] = [
    { marketplace: "ebay.com", status: "ok", leaderPrice: 70, currency: "$", leaderPriceUsd: 70, offerCount: 5 },
    { marketplace: "walmart.com", status: "ok", leaderPrice: 60, currency: "$", leaderPriceUsd: 60, offerCount: 4 },
    { marketplace: "aliexpress.com", status: "ok", leaderPrice: 55, currency: "€", leaderPriceUsd: 59.4, converted: true, offerCount: 3 },
    { marketplace: "etsy.com", status: "empty", offerCount: 0 },
    { marketplace: "amazon.com", status: "error", error: "timeout" },
  ];
  const r = aggregateBestPrice("mouse", entries, 95);
  assert.equal(r.cheapest?.marketplace, "aliexpress.com"); // 59.4 USD wins
  assert.equal(r.cheapest?.priceUsd, 59.4);
  assert.equal(r.savingsVsCheapestUsd, 35.6); // 95 - 59.4
  assert.equal(r.evidence.marketplacesWithOffers, 3);
  assert.equal(r.evidence.marketplacesScanned, 5);
  assert.match(r.evidence.fxNote, /converted/i); // AliExpress was EUR
  // ok entries sorted cheapest-first, then empty/error
  assert.deepEqual(
    r.results.map((e) => e.marketplace),
    ["aliexpress.com", "walmart.com", "ebay.com", "etsy.com", "amazon.com"]
  );
  // agent-flow hints: point to the cheapest marketplace + flag the failed one
  assert.ok(r.nextActions.some((h) => /POST \/aliexpress/.test(h)));
  assert.ok(r.nextActions.some((h) => /didn't respond/.test(h))); // amazon errored
});

test("aggregateBestPrice handles no offers anywhere", () => {
  const r = aggregateBestPrice("nothing", [
    { marketplace: "ebay.com", status: "empty" },
    { marketplace: "walmart.com", status: "error", error: "x" },
  ]);
  assert.equal(r.cheapest, null);
  assert.match(r.summary, /No competing offers/i);
});
