import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3002", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Apify
  apifyToken: process.env.APIFY_TOKEN || "",
  apifyAmazonActor:
    process.env.APIFY_AMAZON_ACTOR || "axesso_data~amazon-product-offers-scraper",
  apifyEbayActor: process.env.APIFY_EBAY_ACTOR || "automation-lab~ebay-scraper",
  ebayMaxItems: parseInt(process.env.EBAY_MAX_ITEMS || "20", 10),
  apifyWalmartActor: process.env.APIFY_WALMART_ACTOR || "pear_fight~walmart-scraper",
  walmartMaxItems: parseInt(process.env.WALMART_MAX_ITEMS || "20", 10),
  apifyAliexpressActor:
    process.env.APIFY_ALIEXPRESS_ACTOR || "kawsar~aliexpress-search-scraper",
  aliexpressMaxItems: parseInt(process.env.ALIEXPRESS_MAX_ITEMS || "20", 10),
  apifyEtsyActor: process.env.APIFY_ETSY_ACTOR || "automation-lab~etsy-scraper",
  etsyMaxItems: parseInt(process.env.ETSY_MAX_ITEMS || "20", 10),

  // x402 / X Layer
  x402Mode: process.env.X402_MODE || "off", // off | demo | on
  x402PayTo: process.env.X402_PAY_TO || "",
  x402PriceUsd: process.env.X402_PRICE_USD || "0.4",
  xlayerApiKey: process.env.XLAYER_API_KEY || "",
  xlayerSecretKey: process.env.XLAYER_SECRET_KEY || "",
  xlayerPassphrase: process.env.XLAYER_PASSPHRASE || "",

  // tuning
  offersCacheTtlMs: parseInt(process.env.OFFERS_CACHE_TTL_MS || "600000", 10),
  undercutStep: Number(process.env.UNDERCUT_STEP || "0.01"),
  // Max time to wait on an Apify run-sync call before giving up (ms).
  apifyTimeoutMs: parseInt(process.env.APIFY_TIMEOUT_MS || "75000", 10),
};

// Fixed X Layer constants (same across all OKX A2MCP services).
export const NETWORK = "eip155:196";
export const USDT0_XLAYER = "0x779ded0c9e1022225f8e0630b35a9b54be713736";
export const USDT0_DECIMALS = 6;
