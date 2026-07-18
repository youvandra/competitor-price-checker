import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAdvice, type BuildAdviceArgs } from "./strategy.js";
import type { NormalizedOffer } from "./types.js";

function offer(landed: number, sellerName = "seller"): NormalizedOffer {
  return { sellerName, price: landed, shipping: 0, landed, condition: "New", prime: false };
}

function base(over: Partial<BuildAdviceArgs>): BuildAdviceArgs {
  return {
    marketplace: "amazon.com",
    productId: "TEST",
    currency: "$",
    offers: [offer(20), offer(22), offer(25)],
    totalOffers: 3,
    fromCache: false,
    leaderLabel: "Buy Box",
    source: "test",
    caveat: "test",
    ...over,
  };
}

test("leader = lowest landed; four strategies with cost", () => {
  const a = buildAdvice(base({ myPrice: 24, myCost: 15 }));
  assert.equal(a.market.leaderPrice, 20);
  assert.equal(a.market.leaderLabel, "Buy Box");
  assert.deepEqual(
    a.strategies.map((s) => s.name),
    ["Win", "Match", "Premium Hold", "Margin Floor"]
  );
  assert.equal(a.strategies.find((s) => s.name === "Win")?.price, 19.99);
  assert.equal(a.strategies.find((s) => s.name === "Match")?.price, 20);
  assert.equal(a.strategies.find((s) => s.name === "Margin Floor")?.price, 15);
});

test("above leader -> recommend Win", () => {
  const a = buildAdvice(base({ myPrice: 24 }));
  assert.equal(a.recommendation, "Win");
});

test("at/under leader -> recommend Premium Hold", () => {
  const a = buildAdvice(base({ myPrice: 19 }));
  assert.equal(a.recommendation, "Premium Hold");
});

test("Win below cost -> do not recommend Win", () => {
  // leader 20 -> Win 19.99, cost 25 => Win sells at loss
  const a = buildAdvice(base({ myPrice: 30, myCost: 25 }));
  assert.equal(a.recommendation, "Premium Hold");
});

test("no offers -> uncontested, no Win strategy", () => {
  const a = buildAdvice(base({ offers: [], totalOffers: 0, myPrice: 20 }));
  assert.equal(a.market.offerCount, 0);
  assert.equal(a.recommendation, "Premium Hold");
  assert.ok(!a.strategies.some((s) => s.name === "Win"));
  assert.match(a.summary, /uncontested/);
});

test("margin computed from cost", () => {
  const a = buildAdvice(base({ myPrice: 24, myCost: 15 }));
  assert.equal(a.strategies.find((s) => s.name === "Win")?.margin, 4.99);
});
