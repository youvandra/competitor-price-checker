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

test("mapTargetRows reads current_retail, drops sold-out/zero, brand-or-Target seller", () => {
  const r = mapTargetRows([
    { title: "Mouse", current_retail: 25, rating_average: 4.2, brand: "Logitech" },
    { title: "Pad", current_retail: 30 },
    { title: "Zero", current_retail: 0 }, // dropped: zero
    { title: "OOS", current_retail: 20, sold_out: true }, // dropped: sold out
    { title: "OOSall", current_retail: 22, is_out_of_stock_all_locations: true }, // dropped
  ]);
  assert.equal(r.offers.length, 2);
  assert.equal(r.currency, "$");
  assert.equal(r.offers[0].sellerName, "Logitech"); // brand hint
  assert.equal(r.offers[0].landed, 25);
  assert.equal(r.offers[1].sellerName, "Target"); // fallback
});

test("mapBestBuyRows drops zero price, falls back seller to Best Buy", () => {
  const r = mapBestBuyRows([
    { title: "TV", price: 199, rating: 4.8 },
    { title: "Free?", price: 0 }, // dropped: zero
    { title: "Laptop", price: 210, seller: "MarketplaceX" },
  ]);
  assert.equal(r.offers.length, 2);
  assert.equal(r.currency, "$");
  assert.equal(r.offers[0].sellerName, "Best Buy"); // fallback
  assert.equal(r.offers[1].sellerName, "MarketplaceX");
});

test("mapMercadoLibreRows keeps in-stock, maps BRL currency", () => {
  const r = mapMercadoLibreRows([
    { title: "Notebook", price: 120, currency: "BRL", sellerName: "LojaBR", availableStock: 5 },
    { title: "OOS", price: 100, currency: "BRL", availableStock: 0 }, // dropped: no stock
    { title: "NoStockField", price: 80, currency: "BRL" }, // kept: stock unknown
  ]);
  assert.equal(r.offers.length, 2);
  assert.equal(r.currency, "R$");
  assert.equal(r.offers[0].sellerName, "LojaBR");
  assert.equal(r.offers[0].landed, 120);
  assert.equal(r.offers[1].sellerName, "Mercado Libre seller"); // fallback
});

test("mapShopeeRows drops zero price, maps IDR + shop fallback", () => {
  const r = mapShopeeRows([
    { name: "Case", price: 150000, currency: "IDR", rating: 4.9 },
    { name: "Cable", price: 90000, currency: "IDR", shopName: "TokoA" },
    { name: "Free?", price: 0, currency: "IDR" }, // dropped: zero
  ]);
  assert.equal(r.offers.length, 2);
  assert.equal(r.currency, "Rp");
  assert.equal(r.offers[0].sellerName, "Shopee seller"); // fallback
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
