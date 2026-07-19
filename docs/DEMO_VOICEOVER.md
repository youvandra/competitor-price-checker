# Demo Video — Voice-Over Script

Target: ~85 seconds, 1080p. Record terminal + the landing page. Calm, assured, Apple-keynote paced —
leave air. ~2.2 words/second. Start each block when the scene's headline lands.

**Do NOT say or show the underlying data provider, `.env`, or raw upstream API calls.** Say "live
market data" if you need to reference the source.

---

## Script (English)

### 0:00 – 0:08 — Hook
> Your agent is about to set a price. But what is everyone else charging right now?

### 0:08 – 0:22 — One marketplace, a decision
> One call checks a listing's competitors. Here's the Amazon Buy Box, where your price sits against it, and the range around it — the market, at a glance.

### 0:22 – 0:36 — Not a data dump
> Then the part that matters: four ready moves — Win the Buy Box, Match it, hold a premium, or stop at your margin floor. It recommends one, and it won't tell you to sell below cost.

### 0:36 – 0:48 — Any marketplace
> Same call, same shape, any marketplace — eBay, Walmart, AliExpress, Etsy. One decision, everywhere you sell.

### 0:48 – 1:02 — The Best Price Scan
> Or ask the real question in a single call: where is this cheapest? Best Price Scan sweeps every marketplace at once, ranks them in dollars, and tells you the best price — and how far above it you are.

### 1:02 – 1:12 — Decision-grade
> Every answer carries its evidence — what was analyzed, and an honest caveat. A price your agent can act on and justify, not just repeat.

### 1:12 – 1:22 — x402
> Discovery is free. Answers are x402 — settled on-chain in USDT-zero by the OKX facilitator. The server holds no key and pays no gas.

### 1:22 – 1:30 — Outro
> Competitor Price Checker. On X Layer. Built for the OKX.AI Genesis Hackathon.

---

## Word counts (pace check)

| Scene | Seconds | Words | Pace |
|-------|---------|-------|------|
| Hook | 8 | 18 | relaxed |
| One marketplace | 14 | 31 | ok |
| Not a data dump | 14 | 37 | brisk — keep moving |
| Any marketplace | 12 | 22 | relaxed |
| Best Price Scan | 14 | 39 | brisk — keep moving |
| Decision-grade | 10 | 24 | ok |
| x402 | 10 | 28 | ok |
| Outro | 8 | 12 | relaxed |

Total ≈ 211 words / ~90s. If long, cut "Any marketplace" (0:36) and land at ~78s.

## Recording notes

- Spoken forms: "USDT-zero" (USDT0), "x-four-oh-two" (x402).
- Pretty-print JSON (`| python3 -m json.tool`), big terminal font.
- Pre-warm every endpoint once before recording so the demo isn't waiting on a cold scan.
- For Best Price Scan, pick a query where a real product (not accessories) shows — pass `my_price`.
- Safe long-take cuts: "not just repeat" (decision-grade), "and pays no gas" (x402).
- Keep the provider name off-screen the entire time.
