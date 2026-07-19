import { test } from "node:test";
import assert from "node:assert/strict";
import { parseShipping, relevanceFilter } from "./util.js";
import type { NormalizedOffer } from "./types.js";

test("parseShipping handles free + priced + empty", () => {
  assert.equal(parseShipping("Free delivery"), 0);
  assert.equal(parseShipping(""), 0);
  assert.equal(parseShipping(undefined), 0);
  assert.equal(parseShipping("+US $5.99 delivery"), 5.99);
  assert.equal(parseShipping("$12 shipping"), 12);
});

function offer(landed: number): NormalizedOffer {
  return {
    sellerName: "s",
    price: landed,
    shipping: 0,
    landed,
    condition: "New",
    prime: false,
  };
}

test("relevanceFilter drops off-band listings around anchor", () => {
  const offers = [offer(8), offer(9), offer(95), offer(99), offer(110)];
  const kept = relevanceFilter(offers, 95).map((o) => o.landed);
  assert.deepEqual(kept, [95, 99, 110]); // accessories $8/$9 removed
});

test("relevanceFilter keeps all when no anchor", () => {
  const offers = [offer(8), offer(95)];
  assert.equal(relevanceFilter(offers, undefined).length, 2);
});

test("relevanceFilter falls back to full set if filter leaves <2", () => {
  const offers = [offer(8), offer(9), offer(95)];
  // anchor 95 would keep only [95] -> too few -> return all
  assert.equal(relevanceFilter(offers, 95).length, 3);
});
