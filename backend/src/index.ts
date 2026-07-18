import express, { type Request, type Response, type NextFunction } from "express";
import { config } from "./config.js";
import { extractAsin, domainFromUrl, fetchAmazonOffers } from "./amazon.js";
import { buildAdvice } from "./strategy.js";
import { paidRoute, x402Info } from "./x402.js";
import type { CheckInput } from "./types.js";

const app = express();
app.use(express.json());

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
      myPrice,
      myCost,
    });
    res.json(advice);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `upstream fetch failed: ${msg}` });
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
// NOTE: this still calls Apify (costs us ~$0.005). Cached 10min; rate-limited.
app.post("/preview/amazon", previewLimiter, runAmazon);

// Paid service: preflight (reject bad input free) -> x402 gate -> run.
app.post(
  "/amazon",
  preflightAmazon,
  paidRoute("POST /amazon", "Amazon competitor-price advice (Buy Box strategy)"),
  runAmazon
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
