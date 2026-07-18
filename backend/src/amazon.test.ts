import { test } from "node:test";
import assert from "node:assert/strict";
import { extractAsin, domainFromUrl } from "./amazon.js";

test("extractAsin from product URLs", () => {
  assert.equal(extractAsin("https://www.amazon.com/dp/B0966NLTZS"), "B0966NLTZS");
  assert.equal(extractAsin("https://www.amazon.com/dp/B0966NLTZS?ref=x"), "B0966NLTZS");
  assert.equal(
    extractAsin("https://www.amazon.co.uk/gp/product/B0966NLTZS/"),
    "B0966NLTZS"
  );
});

test("extractAsin from bare ASIN", () => {
  assert.equal(extractAsin("B0966NLTZS"), "B0966NLTZS");
  assert.equal(extractAsin("b0966nltzs"), "B0966NLTZS");
});

test("extractAsin returns null for garbage", () => {
  assert.equal(extractAsin("not-a-url"), null);
  assert.equal(extractAsin("hello world"), null);
});

test("domainFromUrl", () => {
  assert.equal(domainFromUrl("https://www.amazon.com/dp/X"), "com");
  assert.equal(domainFromUrl("https://www.amazon.co.uk/dp/X"), "co.uk");
  assert.equal(domainFromUrl("https://example.com/x"), null);
});
