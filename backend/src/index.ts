import express, { type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { extractAsin, domainFromUrl, fetchAmazonOffers } from "./amazon.js";
import { fetchEbayOffers } from "./ebay.js";
import { fetchWalmartOffers } from "./walmart.js";
import { fetchAliexpressOffers } from "./aliexpress.js";
import { fetchEtsyOffers } from "./etsy.js";
import { runBestPrice } from "./compare.js";
import { relevanceFilter } from "./util.js";
import { buildAdvice } from "./strategy.js";
import type { NormalizedOffer } from "./types.js";
import { paidRoute, x402Info } from "./x402.js";
import type { CheckInput } from "./types.js";

const app = express();
// Live behind a reverse proxy (pricecheck.web.id) — trust the first hop so
// req.ip reflects the real client for the preview rate limiter, not the proxy.
app.set("trust proxy", 1);
app.use(express.json());

// Serve the landing page + live demo (backend/public).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "..", "public")));

const AMAZON_META = {
  leaderLabel: "Buy Box",
  source: "live Amazon offers",
  caveat:
    "Buy Box is approximated by the lowest landed New offer. Amazon's real Buy Box also weighs Prime, seller rating, fulfillment and stock — price alone is not decisive.",
};
const EBAY_META = {
  marketplace: "ebay.com",
  leaderLabel: "lowest listing",
  source: "live eBay listings",
  caveat:
    "eBay has no Buy Box — the leader is the cheapest New Buy-It-Now listing for your query. Keyword search can surface related or accessory listings, so refine the query for a tighter product match.",
};
const WALMART_META = {
  marketplace: "walmart.com",
  leaderLabel: "lowest listing",
  source: "live Walmart listings",
  caveat:
    "Walmart listings are matched by keyword (no shared Buy Box). Search can surface related items, so a specific query — plus my_price to anchor relevance — sharpens the match.",
};
const ALIEXPRESS_META = {
  marketplace: "aliexpress.com",
  leaderLabel: "lowest listing",
  source: "live AliExpress listings",
  caveat:
    "AliExpress listings are matched by keyword (no shared Buy Box). Prices are in the store's currency and can include heavy discounts; a specific query plus my_price to anchor relevance sharpens the match.",
};
const ETSY_META = {
  marketplace: "etsy.com",
  leaderLabel: "lowest listing",
  source: "live Etsy listings",
  caveat:
    "Etsy listings are matched by keyword (no shared Buy Box) and are often unique/handmade, so 'competitors' are comparable listings, not the same item. Shipping is not included in the search figure. Use a specific query plus my_price to anchor relevance.",
};

// ---- helpers ---------------------------------------------------------------

interface ParsedAmazon {
  asin: string;
  domain: string;
  myPrice?: number;
  myCost?: number;
  productUrl?: string;
}

function parseAmazonBody(
  body: unknown
): { ok: true; value: ParsedAmazon } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const productUrl =
    typeof b.product_url === "string" ? b.product_url : undefined;
  const rawAsin = typeof b.asin === "string" ? b.asin : undefined;
  const idSource = productUrl || rawAsin;
  if (!idSource) {
    return { ok: false, error: "provide `product_url` (Amazon listing URL) or `asin`" };
  }
  const asin = extractAsin(idSource);
  if (!asin) {
    return { ok: false, error: `could not extract a valid ASIN from "${idSource}"` };
  }
  const myPrice = b.my_price != null ? Number(b.my_price) : undefined;
  if (myPrice != null && !Number.isFinite(myPrice)) {
    return { ok: false, error: "`my_price` must be a number" };
  }
  const myCost = b.my_cost != null ? Number(b.my_cost) : undefined;
  if (myCost != null && !Number.isFinite(myCost)) {
    return { ok: false, error: "`my_cost` must be a number" };
  }
  const domain =
    (typeof b.domain === "string" && b.domain) ||
    (productUrl && domainFromUrl(productUrl)) ||
    "com";
  return { ok: true, value: { asin, domain, myPrice, myCost, productUrl } };
}

/**
 * Preflight for the PAID route: reject clearly-malformed input BEFORE payment
 * (deterministic failure = never charge for it). An empty/no-id body is treated
 * as a probe and falls through so the x402 layer answers with a 402 challenge.
 */
function preflightAmazon(req: Request, res: Response, next: NextFunction): void {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const hasAnyId =
    typeof b.product_url === "string" || typeof b.asin === "string";
  if (!hasAnyId) return next(); // probe -> let x402 issue the challenge
  const parsed = parseAmazonBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  (res.locals as { amazon?: ParsedAmazon }).amazon = parsed.value;
  next();
}

async function runAmazon(req: Request, res: Response): Promise<void> {
  const cached = (res.locals as { amazon?: ParsedAmazon }).amazon;
  const parsed = cached
    ? { ok: true as const, value: cached }
    : parseAmazonBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const { asin, domain, myPrice, myCost, productUrl } = parsed.value;
  try {
    const { data, fromCache } = await fetchAmazonOffers(asin, domain);
    const advice = buildAdvice({
      marketplace: `amazon.${domain}`,
      productId: asin,
      productUrl,
      currency: data.currency,
      offers: data.offers,
      totalOffers: data.totalOffers,
      fromCache,
      leaderLabel: AMAZON_META.leaderLabel,
      source: AMAZON_META.source,
      caveat: AMAZON_META.caveat,
      myPrice,
      myCost,
    });
    res.json(advice);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `upstream fetch failed: ${msg}` });
  }
}

// ---- keyword marketplaces (eBay, Walmart) ----------------------------------
// Both are Definition B: a keyword search returns competing listings. Same
// input + flow; only the fetch adapter and the metadata differ.

interface ParsedKeyword {
  query: string;
  myPrice?: number;
  myCost?: number;
}

interface KeywordMeta {
  marketplace: string;
  leaderLabel: string;
  source: string;
  caveat: string;
}

type KeywordFetch = (
  query: string
) => Promise<{
  data: { offers: NormalizedOffer[]; currency: string; totalOffers: number };
  fromCache: boolean;
}>;

function parseKeywordBody(
  body: unknown
): { ok: true; value: ParsedKeyword } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const query = typeof b.query === "string" ? b.query.trim() : "";
  if (!query || query.length < 2) {
    return { ok: false, error: "provide `query` — a product search keyword (min 2 chars)" };
  }
  const myPrice = b.my_price != null ? Number(b.my_price) : undefined;
  if (myPrice != null && !Number.isFinite(myPrice)) {
    return { ok: false, error: "`my_price` must be a number" };
  }
  const myCost = b.my_cost != null ? Number(b.my_cost) : undefined;
  if (myCost != null && !Number.isFinite(myCost)) {
    return { ok: false, error: "`my_cost` must be a number" };
  }
  return { ok: true, value: { query, myPrice, myCost } };
}

function preflightKeyword(req: Request, res: Response, next: NextFunction): void {
  const b = (req.body ?? {}) as Record<string, unknown>;
  if (typeof b.query !== "string") return next(); // probe -> let x402 issue 402
  const parsed = parseKeywordBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  (res.locals as { keyword?: ParsedKeyword }).keyword = parsed.value;
  next();
}

function makeKeywordRunner(fetchFn: KeywordFetch, meta: KeywordMeta) {
  return async (req: Request, res: Response): Promise<void> => {
    const cached = (res.locals as { keyword?: ParsedKeyword }).keyword;
    const parsed = cached
      ? { ok: true as const, value: cached }
      : parseKeywordBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { query, myPrice, myCost } = parsed.value;
    try {
      const { data, fromCache } = await fetchFn(query);
      const offers = relevanceFilter(data.offers, myPrice);
      const advice = buildAdvice({
        marketplace: meta.marketplace,
        productId: query,
        currency: data.currency,
        offers,
        totalOffers: data.totalOffers,
        fromCache,
        leaderLabel: meta.leaderLabel,
        source: meta.source,
        caveat: meta.caveat,
        myPrice,
        myCost,
      });
      res.json(advice);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({ error: `upstream fetch failed: ${msg}` });
    }
  };
}

const runEbay = makeKeywordRunner(fetchEbayOffers, EBAY_META);
const runWalmart = makeKeywordRunner(fetchWalmartOffers, WALMART_META);
const runAliexpress = makeKeywordRunner(fetchAliexpressOffers, ALIEXPRESS_META);
const runEtsy = makeKeywordRunner(fetchEtsyOffers, ETSY_META);

// ---- Best Price Scan (cross-marketplace) -----------------------------------

interface ParsedBestPrice {
  query: string;
  amazonAsin?: string;
  amazonDomain?: string;
  myPrice?: number;
}

function parseBestPriceBody(
  body: unknown
): { ok: true; value: ParsedBestPrice } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const query = typeof b.query === "string" ? b.query.trim() : "";
  if (!query || query.length < 2) {
    return { ok: false, error: "provide `query` — a product search keyword (min 2 chars)" };
  }
  // Optional: include Amazon by ASIN or product URL.
  let amazonAsin: string | undefined;
  let amazonDomain: string | undefined;
  const amazonIn =
    (typeof b.amazon_url === "string" && b.amazon_url) ||
    (typeof b.amazon_asin === "string" && b.amazon_asin) ||
    "";
  if (amazonIn) {
    const asin = extractAsin(amazonIn);
    if (!asin) return { ok: false, error: `could not extract an ASIN from "${amazonIn}"` };
    amazonAsin = asin;
    amazonDomain =
      (typeof b.domain === "string" && b.domain) ||
      (typeof b.amazon_url === "string" ? domainFromUrl(b.amazon_url) || undefined : undefined) ||
      "com";
  }
  const myPrice = b.my_price != null ? Number(b.my_price) : undefined;
  if (myPrice != null && !Number.isFinite(myPrice)) {
    return { ok: false, error: "`my_price` must be a number" };
  }
  // Best Price ranks marketplaces by price only; my_cost (margin) is a
  // per-marketplace concern — use POST /<marketplace> for the margin breakdown.
  return { ok: true, value: { query, amazonAsin, amazonDomain, myPrice } };
}

function preflightBestPrice(req: Request, res: Response, next: NextFunction): void {
  const b = (req.body ?? {}) as Record<string, unknown>;
  if (typeof b.query !== "string") return next(); // probe -> let x402 issue 402
  const parsed = parseBestPriceBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  (res.locals as { best?: ParsedBestPrice }).best = parsed.value;
  next();
}

async function runBestPriceHandler(req: Request, res: Response): Promise<void> {
  const cached = (res.locals as { best?: ParsedBestPrice }).best;
  const parsed = cached
    ? { ok: true as const, value: cached }
    : parseBestPriceBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  try {
    res.json(await runBestPrice(parsed.value));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `best price scan failed: ${msg}` });
  }
}

// ---- routes ----------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Competitor Price Checker", x402: x402Info() });
});

app.get("/quote", (_req, res) => {
  res.json(x402Info());
});

// Free preview: same schema + logic, no payment. For demo / studio use.
// NOTE: this still hits the upstream data source (has a cost). Cached 10min; rate-limited.
app.post("/preview/amazon", previewLimiter, runAmazon);

// Paid service: preflight (reject bad input free) -> x402 gate -> run.
app.post(
  "/amazon",
  preflightAmazon,
  paidRoute("POST /amazon", "Amazon competitor-price advice (Buy Box strategy)"),
  runAmazon
);

// eBay (keyword-based competitor pricing).
app.post("/preview/ebay", previewLimiter, runEbay);
app.post(
  "/ebay",
  preflightKeyword,
  paidRoute("POST /ebay", "eBay competitor-price advice (keyword listings)"),
  runEbay
);

// Walmart (keyword-based competitor pricing).
app.post("/preview/walmart", previewLimiter, runWalmart);
app.post(
  "/walmart",
  preflightKeyword,
  paidRoute("POST /walmart", "Walmart competitor-price advice (keyword listings)"),
  runWalmart
);

// AliExpress (keyword-based competitor pricing).
app.post("/preview/aliexpress", previewLimiter, runAliexpress);
app.post(
  "/aliexpress",
  preflightKeyword,
  paidRoute("POST /aliexpress", "AliExpress competitor-price advice (keyword listings)"),
  runAliexpress
);

// Etsy (keyword-based competitor pricing).
app.post("/preview/etsy", previewLimiter, runEtsy);
app.post(
  "/etsy",
  preflightKeyword,
  paidRoute("POST /etsy", "Etsy competitor-price advice (keyword listings)"),
  runEtsy
);

// Best Price Scan — cross-marketplace, priced higher.
app.post("/preview/best-price", previewLimiter, runBestPriceHandler);
app.post(
  "/best-price",
  preflightBestPrice,
  paidRoute(
    "POST /best-price",
    "Best Price Scan — cheapest across all marketplaces",
    config.x402ComparePriceUsd
  ),
  runBestPriceHandler
);

// ---- naive per-IP rate limit for the free preview --------------------------

const hits = new Map<string, { n: number; resetAt: number }>();
function previewLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const win = 60_000;
  const max = 10;
  const rec = hits.get(ip);
  if (!rec || now >= rec.resetAt) {
    hits.set(ip, { n: 1, resetAt: now + win });
    return next();
  }
  if (rec.n >= max) {
    res.status(429).json({ error: "rate limit: 10 preview calls/min. Use the paid /amazon endpoint." });
    return;
  }
  rec.n += 1;
  next();
}

app.listen(config.port, () => {
  console.log(
    `Competitor Price Checker on :${config.port} (x402 mode=${config.x402Mode})`
  );
});

export { app, parseAmazonBody };
export type { CheckInput };
