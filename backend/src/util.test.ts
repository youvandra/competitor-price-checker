import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSeller } from "./util.js";

test("cleanSeller strips bracketed suffixes", () => {
  assert.equal(cleanSeller("RichMondHS [S/N Recorded]"), "RichMondHS");
  assert.equal(cleanSeller("RichMondHS [S/N Recorded"), "RichMondHS");
  assert.equal(cleanSeller("Acme (Official Store)"), "Acme");
});

test("cleanSeller trims separators + whitespace", () => {
  assert.equal(cleanSeller("  Best  Deals  -"), "Best Deals");
  assert.equal(cleanSeller("Shop |"), "Shop");
});

test("cleanSeller falls back gracefully", () => {
  assert.equal(cleanSeller(undefined), "Unknown seller");
  assert.equal(cleanSeller("[only brackets]"), "[only brackets]");
  assert.equal(cleanSeller("PlainName"), "PlainName");
});
