import { test } from "node:test";
import assert from "node:assert/strict";
import { mapEbayRows } from "./ebay.js";
import { mapWalmartRows } from "./walmart.js";
import { mapAliexpressRows } from "./aliexpress.js";
import { mapEtsyRows } from "./etsy.js";
import { mapTargetRows } from "./target.js";
import { mapBestBuyRows } from "./bestbuy.js";
import { mapMercadoLibreRows } from "./mercadolibre.js";
import { mapShopeeRows } from "./shopee.js";
import { normalizeAmazonOffers } from "./amazon.js";

test("mapEbayRows keeps New Buy-It-Now, drops Used/auction, parses shipping", () => {
  const r = mapEbayRows([
    { price: 50, condition: "Brand New", listingType: "Buy It Now", shippingCost: "Free delivery", sellerName: "shopA [S/N]" },
    { price: 40, condition: "Used", listingType: "Buy It Now" }, // dropped: used
    { price: 45, condition: "New", listingType: "Auction" }, // dropped: auction
    { price: 60, condition: "New", listingType: "Buy It Now", shippingCost: "+US $5.50 delivery" },
  ]);
  assert.equal(r.offers.length, 2);
  assert.equal(r.totalOffers, 4);
  assert.equal(r.offers[0].sellerName, "shopA"); // cleaned
  assert.equal(r.offers[0].landed, 50); // free shipping
  assert.equal(r.offers[1].landed, 65.5); // 60 + 5.50
});

test("mapWalmartRows filters out-of-stock and non-positive price", () => {
  const r = mapWalmartRows([
    { price: 30, seller: "Walmart.com", availability: "In stock", currency: "USD", rating: 4.5 },
    { price: 0, seller: "x", availability: "In stock" }, // dropped
    { price: 20, seller: "y", availability: "Out of stock" }, // dropped
  ]);
  assert.equal(r.offers.length, 1);
  assert.equal(r.currency, "$");
  assert.equal(r.offers[0].sellerRating, "4.5");
});

test("mapAliexpressRows falls back seller + free shipping, maps currency", () => {
  const r = mapAliexpressRows([
    { price: 101.02, currency: "EUR", rating: 4.9, shipping: "Free shipping over €10", isTopRated: true },
    { price: 90, currency: "EUR", shipping: "€2.30", storeName: "Cool Store" },
  ]);
  assert.equal(r.currency, "€");
  assert.equal(r.offers[0].sellerName, "Top-rated store");
  assert.equal(r.offers[0].landed, 101.02);
  assert.equal(r.offers[1].sellerName, "Cool Store");
  assert.equal(r.offers[1].landed, 92.3);
});

test("mapEtsyRows parses string price, skips digital + zero", () => {
  const r = mapEtsyRows([
    { price: "32.2032", currency: "USD", shop: "Crafty", rating: 5, availability: "In Stock" },
    { price: "10.00", isDigitalDownload: true }, // dropped
    { price: "0", availability: "In Stock" }, // dropped
  ]);
  assert.equal(r.offers.length, 1);
  assert.equal(r.offers[0].price, 32.2); // rounded
  assert.equal(r.offers[0].sellerName, "Crafty");
});

test("mapTargetRows filters out-of-stock/zero, falls back seller to Target", () => {
  const r = mapTargetRows([
    { price: 25, currency: "USD", rating: 4.2, availability: "In stock" },
    { price: 30, seller: "Partner Co", availability: "In stock" },
    { price: 0, availability: "In stock" }, // dropped: zero
    { price: 20, availability: "Out of stock" }, // dropped: oos
  ]);
  assert.equal(r.offers.length, 2);
  assert.equal(r.currency, "$");
  assert.equal(r.offers[0].sellerName, "Target"); // fallback
  assert.equal(r.offers[0].landed, 25);
  assert.equal(r.offers[1].sellerName, "Partner Co");
});

test("mapBestBuyRows drops sold-out, falls back seller to Best Buy", () => {
  const r = mapBestBuyRows([
    { price: 199, currency: "USD", rating: 4.8 },
    { price: 150, availability: "Sold out" }, // dropped
    { price: 210, seller: "MarketplaceX", availability: "Available" },
  ]);
  assert.equal(r.offers.length, 2);
  assert.equal(r.offers[0].sellerName, "Best Buy"); // fallback
  assert.equal(r.offers[1].sellerName, "MarketplaceX");
});

test("mapMercadoLibreRows keeps New in-stock, maps BRL currency", () => {
  const r = mapMercadoLibreRows([
    { price: 120, currency_id: "BRL", condition: "new", seller_nickname: "LojaBR", available_quantity: 5 },
    { price: 90, currency_id: "BRL", condition: "used", available_quantity: 2 }, // dropped: used
    { price: 100, currency_id: "BRL", condition: "new", available_quantity: 0 }, // dropped: no stock
  ]);
  assert.equal(r.offers.length, 1);
  assert.equal(r.currency, "R$");
  assert.equal(r.offers[0].sellerName, "LojaBR");
  assert.equal(r.offers[0].landed, 120);
});

test("mapShopeeRows filters zero-stock, maps IDR + official-shop fallback", () => {
  const r = mapShopeeRows([
    { price: 150000, currency: "IDR", rating: 4.9, isOfficialShop: true, stock: 12 },
    { price: 90000, currency: "IDR", shopName: "TokoA", stock: 3 },
    { price: 80000, currency: "IDR", stock: 0 }, // dropped: no stock
  ]);
  assert.equal(r.offers.length, 2);
  assert.equal(r.currency, "Rp");
  assert.equal(r.offers[0].sellerName, "Shopee official store");
  assert.equal(r.offers[1].sellerName, "TokoA");
});

test("normalizeAmazonOffers keeps New only, computes landed + currency", () => {
  const r = normalizeAmazonOffers([
    { price: 600, condition: "New", shippingPrice: 0, sellerName: "RichMondHS [S/N Recorded]", currencyCode: "$" },
    { price: 500, condition: "Used - Very Good", shippingPrice: 0 }, // dropped
    { price: 610, condition: "New", shippingPrice: 9.49 },
  ]);
  assert.equal(r.offers.length, 2);
  assert.equal(r.totalOffers, 3);
  assert.equal(r.offers[0].sellerName, "RichMondHS");
  assert.equal(r.offers[1].landed, 619.49);
});
