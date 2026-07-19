# Price Advisor ASP — Planning

Living doc. Updated as we discuss.

## Context
- Target: OKX.AI Genesis Hackathon (ASP track).
- Judging: Product Experience, Creativity, Revenue, Category, Social Buzz.
- Category fit: **Software Utility** (primary), Finance Copilot (secondary).
- House rule: **1 endpoint = 1 service** (biar lolos review). Clarified: this means ONE coherent
  service per endpoint, NOT one tool — BoredComic is one service with 9 tools. So multiple tools
  under one coherent domain is fine and on-pattern.
- Demo constraint: ≤90 second demo, must pass OKX review.

## Hackathon Requirements (from hackquest + OKX docs)
- Submission flow: (1) build ASP, (2) submit on OKX.AI for internal review + live listing (REQUIRED — non-approval = disqualified), (3) post on X/Twitter with #OKXAI + demo <90s, (4) Google form.
- **Deadline: Google form by July 27, 2026 23:59 UTC.** Today = July 18. ~9 days left.
- Rewards announced Aug 3, 2026. Prize pool $100k.
  - Best Product $20k, Creative Genius $20k, Revenue Rocket $20k, Category winners $7.5k each, Social Buzz $10k.
- Judging = "OKXAI Internal Review" (no public tech-stack requirement; focus on real-world value + it must pass review + go live).

## OKX ASP Technical Model
- **A2MCP** = the mode for us: standardized MCP/API service, **pay-per-call**, fixed price, instant settlement via OKX Payment SDK / **x402** protocol. (A2A = negotiated/escrow — not us.)
- Transport: **MCP Streamable HTTP**, `POST /mcp`. Discovery (`initialize`, `tools/list`) free.
- Payment: **x402** on **X Layer** (chain 196), settled in **USDT0**. Paid tool returns HTTP 402 until paid.
- Fit check (from OKX howtomcp): good A2MCP = "accept parameters, deliver a clear result" — data lookups, read-only queries, deterministic ops. **Price Advisor fits exactly.**
- Deploy: public HTTPS + domain. Register on OKX.AI.

## We Already Have a Proven Scaffold (reuse!)
Two live A2MCP services in sibling folders — same author, same pattern:
- `../txwrap` (WalletLens) — live https://txwrap.my.id/mcp, Agent ID 4938, 0.05 USDT/call.
- `../bored-comic` (BoredComic) — https://boredcomic.web.id/mcp, Agent ID 6006, tiered pricing.
Reusable building blocks (copy + adapt, don't rewrite):
- `x402.ts` — payment gate + per-tool pricing + preflight (reject deterministic failures BEFORE payment).
- `index.ts` — Express + MCP + x402 + static wiring.
- `mcp.ts` — MCP server, tool registration (paid + free tools).
- `config.ts`, `types.ts` — env + shared types.
Shared design philosophy to KEEP:
- Output is **decision-grade JSON** with a `summary` + `evidence` block (what data, window, caveat) so the calling agent can reason, not a black box.
- Free discovery/helper tools; paid tool is the core action. Deterministic failures rejected before charge.

## The Concept — FINAL (2026-07-18)
**Name: `Competitor Price Checker`.**
One ASP (one `/mcp` endpoint) that checks competitor prices across e-commerce marketplaces and
returns a **pricing decision** — not a raw scraper dump. Judgment layer = the moat.

**Chosen axis = Sumbu A (breadth by marketplace):** one job (competitor price), many marketplaces
exposed as separate TOOLS under the one service. (Rejected Sumbu B = many seller functions under
one marketplace — that chased Creative/Social tracks but lost focus. We chose clean Utility focus +
scalability instead.)

- Positioning: "check your competitors' prices across all your marketplaces, one place."
- Competes in: **Software Utility** (primary). NOT chasing Creative/Social Buzz — accepted.
- Data source: **Apify** ready-made scrapers (no self-hosted Playwright). Apify handles
  anti-bot / CAPTCHA / proxy / maintenance. We build only the analysis layer.
- Pricing: **0.4 USDT per paid call. No free tier** on paid tools. Discovery/helpers free.
- Output logic: **return MULTIPLE pricing strategy OPTIONS**, each with tradeoff — agent/user
  chooses. NOT a single forced number.

## Architecture — path-based REST per service (PixelBrief-proven, OKX-doc canonical)
CHANGED 2026-07-18: NOT one `/mcp` with JSON-RPC tools. OKX howtomcp + PixelBrief (agent #5421,
PASSED review) both use **path-based REST endpoints, one per service**, each guarded by x402.
```
Agent/ASP: "Competitor Price Checker"  (one registration, one domain)
├── POST /amazon           (paid 0.4 USDT)  <- MVP, build FIRST
├── POST /shopee           (paid, later)
├── POST /ebay             (paid, later)
├── POST /preview/amazon   (free) — same schema, for demo/studio (PixelBrief pattern)
└── GET  /quote            (free) — pricing + pay address + status
```
Each marketplace = its own path endpoint = its own OKX "service" (legible + priced separately).
Design rule: **core analysis is marketplace-agnostic; each marketplace is an ADAPTER** behind a
uniform interface + uniform output shape. Keeps expansion cheap + review-clean.

Stack: **Node + Express + `@okxweb3/x402-express` middleware** (per OKX doc). No JSON-RPC MCP layer.
Reuse from siblings: `config.ts`, `cache.ts` (txwrap), Apify fetch pattern — payment = SDK
middleware (docs recommend SDK over hand-rolled x402).

### x402 technical config (from howtomcp)
- network: `eip155:196` (X Layer); asset USDT0 `0x779ded0c9e1022225f8e0630b35a9b54be713736`, decimals=6
- amount for 0.4 USDT = `400000` (10000 = $0.01)
- 402 response: `PAYMENT-REQUIRED` header, `x402Version: 2`, `payTo` = our X Layer wallet
- settlement auto-verified by SDK (nonce = replay protection); free endpoints = plain 200
- SDK exists for Node/Go/Rust/Java/Python (`@okxweb3/x402-*`)

### Deploy (from howtomcp)
- Public HTTPS + domain (Let's Encrypt). Pattern like siblings: `*.my.id` / `*.web.id`.
- Location: Global -> HK ok. BUT if service calls Claude/OpenAI/Gemini -> Singapore/Tokyo/US, NOT HK.
  MVP has NO LLM (Apify + math) -> location-free. Remember rule if LLM added later.
- Register on OKX.AI: endpoint URL + description + pricing + docs (see /registerasp).

### Uniform output shape (all marketplaces normalize to this)
```
{
  summary: "short human sentence",
  market: { lowest, highest, median, offer_count, your_position },
  strategies: [
    { name: "Win",          price, note, margin? },   // undercut cheapest
    { name: "Match",        price, note },             // match market/buy-box
    { name: "Premium Hold", price, note },             // hold high, lean on rating/Prime
    { name: "Margin Floor", price, note }              // only if my_cost given
  ],
  recommendation: "Win",
  evidence: { source, analyzed_count, marketplace, caveat }
}
```
Marketplace-specific nuance lives INSIDE the adapter but maps to this shape:
- **Amazon** = Buy Box logic (same ASIN, other sellers). "market" = competing offers on the listing.
- **Shopee/Tokopedia/etc** = keyword logic (similar listings). "market" = price range of matches.

## Input (per marketplace tool)
- Amazon: `{ product_url, my_price, my_cost?, domain? }` — regex-extract ASIN from URL.
- Keyword marketplaces (later): `{ keyword | product_url, my_price, my_cost? }`.
- `my_cost` optional — only compute Margin Floor when provided.

## Marketplace roadmap (has Apify scraper + big market)
- **Amazon** — global, Buy Box logic. **MVP FIRST.** actor: `axesso_data/amazon-product-offers-scraper` ($0.35/1k).
- eBay — global, multi-seller.
- Walmart — US.
- AliExpress — global.
- Shopee / Lazada / Tokopedia — SEA (keyword logic).
- Etsy — niche/handmade. Mercado Libre — LATAM. Rakuten — JP.
Global audience picks: after Amazon, add eBay / Walmart / AliExpress. SEA set if targeting Indonesia.

## Unit Economics (Amazon, offers scraper)
- Cost: ~$0.005 per call (1 ASIN, ~15 offers @ $0.00035/result).
- Sell: 0.4 USDT per call -> margin ~80x. Very healthy at any volume (linear cost).
- Risk: actor latency "seconds to hours" — MUST test single-ASIN latency for 90s demo (go/no-go gate).
- Risk: actor young (51 users, no ratings) — need a backup actor.
- Mitigation: add short-TTL cache (reuse `../txwrap/src/cache.ts`) — cuts Apify cost + latency, aids scale.

## Scalability notes
- Service is **stateless read-only** -> trivial horizontal scale. Cost linear, margin flat.
- Bottleneck = Apify (rate limits, latency, concurrency) — we scale as Apify scales.
- Weakest axis = **moat** (wrapper). Defense = analysis quality + brand + multi-source later.
- Each new marketplace = manual adapter build (linear effort), not automatic.
- For hackathon: scalability is NOT judged — don't over-engineer. Build Amazon, ship, demo.

## Build Order (9 days — deadline Jul 27)
1. MVP = `POST /amazon` only. Nail it end-to-end. Demo it.
2. `GET /quote` + `POST /preview/amazon` (free, same schema, for demo without payment).
3. More marketplaces (`POST /ebay`, `POST /shopee`…) ONLY if Amazon is solid + time left.
4. Do NOT build 5 marketplaces at once.

## GO/NO-GO RESULT (2026-07-18) = GO
- Ran `axesso_data~amazon-product-offers-scraper` sync on ASIN B0966NLTZS/com.
- Latency: **~20s wall** for 1 ASIN / 11 offers. Under 90s demo budget. Cache makes repeats instant.
- HTTP 201, returns a flat LIST of offer objects.
- Actor input: `{"input":[{"asin","domain","startPage"}]}`. run-sync endpoint:
  `POST https://api.apify.com/v2/acts/axesso_data~amazon-product-offers-scraper/run-sync-get-dataset-items?token=...`
- Offer object fields we use: `price` (number), `shippingPrice` (number), `condition` ("New"/"Used - ..."),
  `sellerName`, `sellerId`, `sellerRating`, `sellerRatingPercentage`, `prime` (bool), `fulfilledBy`,
  `currencyCode`, `productRating`, `countReview`.
- LOGIC RULES learned:
  - landed price = `price + shippingPrice` (compare landed, not sticker).
  - filter `condition === "New"` for Buy Box comparison (Used offers are not Buy Box rivals).
  - Buy Box NOT flagged by actor -> approximate as lowest-landed New offer. Be honest in `evidence`:
    Amazon's real Buy Box also weighs Prime/rating/fulfillment, not price alone.

## BUILD STATUS (2026-07-18) — MVP core DONE
Scaffold built in `backend/` (Node+Express+TS, x402-express SDK). Typecheck clean. Ran end-to-end:
- `POST /preview/amazon` (free) + `POST /amazon` (paid) + `GET /quote` + `GET /health`.
- Real Apify call works: ~8–20s cold, cache hit 0.002s (fromCache).
- Strategy engine returns 4 options (Win/Match/Premium Hold/Margin Floor) + honest evidence.
- Preflight rejects bad/missing input with 400 BEFORE payment. URL->ASIN + domain parsing works.
Files: config, cache, types, amazon (adapter), strategy (engine), x402 (path gate), index (routes).

## Open Questions / TODO
- [x] Test real latency of Amazon offers scraper on 1 ASIN (go/no-go gate). -> GO, ~20s.
- [x] Scaffold backend + Amazon adapter + strategy engine + x402 wiring. -> DONE, working.
- [x] OKX facilitator creds (reused from txwrap) + payTo 0x736159...4324d. X402_MODE=demo. 402 challenge verified (PAYMENT-REQUIRED header + correct amount/asset/network/payTo). Reject-before-pay intact.
- [ ] Deploy public HTTPS + domain (*.my.id / *.web.id pattern).
- [ ] Register ASP on OKX.AI (endpoint + description + pricing).
- [ ] Demo <90s + X post with #OKXAI. Google form by Jul 27.
- [x] README (banner + logo + badges + mermaid + tables) + MIT license. Pushed, renders on GitHub.
- [x] eBay service (`/ebay`, `/preview/ebay`) — keyword-based, actor `automation-lab~ebay-scraper`
      (~9s, pay-per-event). Generalized strategy engine (buyBox -> leader + leaderLabel). Amazon = "Buy Box",
      eBay = "lowest listing". Uniform output shape across both. Typecheck clean, tested end-to-end.
      NOTE: eBay keyword search surfaces accessories/related items — disclosed in evidence caveat.
- [x] Unit tests (18): extractAsin, parseShipping, relevanceFilter, cleanSeller, currencySymbol, strategy engine.
- [x] Sanitize seller names (cleanSeller). eBay sort best_match + relevanceFilter(my_price anchor).
- [x] Walmart service (`/walmart`, `/preview/walmart`) — keyword-based, actor `pear_fight~walmart-scraper`
      (~35s, $3/1k). Generalized keyword handler (eBay + Walmart share parse/preflight/runner factory).
      relevanceFilter + currencySymbol moved to util.ts. 3 marketplaces live.
- [x] Landing page + live demo (`backend/public/index.html`) — orange brand, marketplace tabs,
      calls free `/preview/*`, renders market stats + strategy cards + recommendation. Served via
      express.static at `/`. Tested end-to-end in browser.
- [x] AliExpress service (`/aliexpress`, `/preview/aliexpress`) — keyword-based, actor
      `kawsar~aliexpress-search-scraper` (~30-36s, $6/1k). Wired via the keyword factory (adapter + meta
      + routes only). parseShipping moved to util.ts. 4 marketplaces live.
- [x] Etsy service (`/etsy`, `/preview/etsy`) — keyword-based, actor `automation-lab~etsy-scraper`
      (~10-12s, PPE). Wired via keyword factory. price is a string (parsed). 5 marketplaces live.
- [x] Best Price Scan (`/best-price`, `/preview/best-price`) — cross-marketplace fan-out (parallel,
      resilient per-marketplace status), USD ranking via static FX (disclosed), priced higher at
      **1.5 USDT** (per-route x402 price override). Pure aggregator unit-tested. 26 tests total.
      Live-verified: 5 marketplaces scanned in ~25s, cheapest picked, savings computed.
- [ ] Optional: SEA marketplaces (Shopee/Tokopedia/Lazada), tighter keyword matching (UPC/EPID).
- [x] POLISH PASS: (1) Apify calls now have a hard timeout (fetchJson + APIFY_TIMEOUT_MS=75s) so a
      hung upstream fails cleanly. (2) Every adapter's normalization extracted to a pure exported
      mapper (mapEbayRows/mapWalmartRows/mapAliexpressRows/mapEtsyRows/normalizeAmazonOffers) with
      unit tests — 23 tests total, all green. Landing verified rendering 5 marketplaces.
- Repo: https://github.com/youvandra/competitor-price-checker (SSH remote, no co-author in commits).
- [ ] Get Apify account + token; validate output shape of the actor.
- [ ] Finalize `check_amazon` tool schema + strategy math (undercut by $0.01? margin floor rule?).
- [ ] Confirm service pricing 0.4 USDT wiring in x402 (reuse txwrap/bored-comic x402.ts).
- [ ] Domain + HTTPS deploy target (pattern: *.web.id / *.my.id like siblings).
- [ ] OKX registration steps for the new ASP.

## Decisions Log
- 2026-07-18: Name = `Competitor Price Checker`. Dropped "E-Commerce" suffix (kills brandability).
- 2026-07-18: Chose Sumbu A (multi-marketplace, one function) over Sumbu B (multi-function, one marketplace). Clean Utility focus + scalable. Accept: not chasing Creative/Social.
- 2026-07-18: ONE service, one endpoint, marketplaces = separate TOOLS (BoredComic pattern: many tools, one service).
- 2026-07-18: MVP = Amazon tool first (Buy Box logic). Other marketplaces later.
- 2026-07-18: Data via Apify, not self-hosted Playwright.
- 2026-07-18: 0.4 USDT/paid call, no free tier on paid tools.
- 2026-07-18: Output = multiple strategy options (Win/Match/Premium Hold/Margin Floor), not one number. my_cost optional.
- 2026-07-18: Input = product URL (regex ASIN) for Amazon; keyword for SEA marketplaces later.
- 2026-07-18: ARCHITECTURE = path-based REST per service (`POST /amazon`), NOT one `/mcp` JSON-RPC. Basis: OKX howtomcp doc + PixelBrief (#5421, PASSED). Payment via `@okxweb3/x402-express` SDK middleware.
- 2026-07-18: BoredComic rejection was an LLM-quality issue, NOT structure — so "many endpoints/tools" is not the problem. Still choosing path-based because it's the doc-canonical + proven-passing pattern.
- 2026-07-18: x402 amount for 0.4 USDT = 400000 (USDT0 6 decimals). network eip155:196, asset 0x779ded0c9e1022225f8e0630b35a9b54be713736.
