# OKX.AI Genesis Hackathon — Submission Draft

Updated 2026-07-19 — reflects shipped state: 6 paid A2MCP services across 5 marketplaces plus a
cross-marketplace Best Price Scan, x402 v2 live, decision-grade output, 26 tests green, landing page.

> Category: **Software Utility** (secondary flavor: Finance Copilot for sellers/commerce agents).

## Google Form Fields

### ASP Name
```
Competitor Price Checker — turn competitor prices into a pricing move.
```

### Agent ID
```
[to be assigned after OKX registration]
```

### ASP Description
```
Competitor Price Checker is an A2MCP Agentic Service Provider that turns any product into a pricing
DECISION — not a data dump. An agent running a store constantly hits the same question it can't answer
alone: "given what my competitors charge right now, what should I price this at?"

Over pay-per-call HTTP endpoints on X Layer, agents get six services. Five are per-marketplace price
advisors — Amazon (matched by ASIN/URL, Buy Box logic), plus eBay, Walmart, AliExpress and Etsy
(matched by keyword) — each returning a market snapshot (the price to beat, lowest / median / highest,
where your own price sits) and FOUR ready pricing strategies: Win (undercut to take the lead), Match,
Premium Hold (compete on rating/shipping instead of racing down), and Margin Floor (never sell below
cost). The agent picks; the service recommends a default and refuses to recommend a Win that would sell
below cost.

The sixth service is the differentiator: Best Price Scan checks EVERY marketplace in a single call,
ranks them in USD, and reports where the product is cheapest and how far your price sits above it. It
fans out in parallel and is resilient — a marketplace that errors or times out is reported as such and
never sinks the rest.

Every result is decision-grade: a one-sentence summary the agent can relay verbatim, and an evidence
block (how many offers were analyzed, the marketplace, an explicit caveat — e.g. Amazon's Buy Box is
approximated by the lowest landed New offer; keyword marketplaces may surface related listings). Prices
compare on landed cost (item + shipping), New condition only, and `my_price` anchors relevance to drop
off-band accessory listings.

Calls are metered with x402 v2 through OKX's official SDK: a free rate-limited preview per service for
discovery, then HTTP 402 settled on-chain in USDT0 by the OKX facilitator — 0.4 USDT per marketplace
call, 1.5 USDT for a full Best Price Scan. The server holds no private key and pays no gas.
```

### ASP Type
```
A2MCP
```

### Example Agent Tasks
```
- "Am I winning the Buy Box on this Amazon listing?"        -> /amazon (Buy Box price, your position, Win/Match/Hold/Floor)
- "What should I price this at vs the market?"              -> any marketplace (4 strategies + recommendation)
- "Where is this product cheapest right now?"               -> /best-price (all marketplaces ranked in USD + savings)
- "Scan every marketplace before I set my price."          -> /best-price (one call, parallel fan-out)
- "Find eBay competitors for 'mechanical keyboard'."        -> /ebay (keyword listings + pricing move)
- "Don't let me price below cost."                          -> pass my_cost -> Margin Floor guard
- "How much does a call cost and where do I pay?"           -> GET /quote (free)
```

### Use Cases
```
- Repricing / commerce agents  — set a competitive price with a defensible reason, per marketplace
- Sourcing / arbitrage agents  — find the cheapest marketplace for a product in one call (Best Price Scan)
- Dropshipping agents          — check the market before listing, keep a margin floor
- Marketplace-ops agents       — monitor where you're losing the Buy Box / the price lead
- Research agents              — a composable "what does this cost across the web" step
```

### X Account Handle
```
@[isi x handle lo]
```

### X Participation Post (Link)
```
[link ke X post — to be posted after demo video siap]
```

### Telegram Handle
```
@[isi telegram handle lo]
```

---

## X Post Template

```
Your agent is about to set a price — but what's everyone else charging?

Competitor Price Checker answers. An A2MCP service on X Layer.

🏷️ Amazon Buy Box + eBay, Walmart, AliExpress, Etsy — one price advisor each
🎯 not a data dump: 4 ready strategies (Win / Match / Hold / Margin Floor) + a recommendation
🌐 Best Price Scan: cheapest across EVERY marketplace in one call
💸 x402 v2: free preview, then 0.4 USDT / call · 1.5 for a full scan — settled on-chain, no key held

Built for @OKXAI Genesis Hackathon #OKXAI
```

---

## Demo Video Script (≤90 detik)

Struktur: value dulu (satu marketplace → keputusan), lalu the wow (Best Price Scan), lalu x402.
Rekam terminal + browser landing; voice-over atau text overlay. Full script: `docs/DEMO_VOICEOVER.md`.

| Time | Scene | Visual |
|------|-------|--------|
| 0:00 | Hook: "Your agent is about to set a price. What is everyone else charging?" | Landing page hero |
| 0:08 | `POST /amazon` with an ASIN + your price → zoom to `summary`, `market` (Buy Box, your position) | Terminal, JSON |
| 0:22 | The 4 `strategies` — Win / Match / Premium Hold / Margin Floor + `recommendation` highlighted | Terminal, JSON |
| 0:36 | "Same shape, any marketplace." `POST /ebay` with a keyword → identical decision | Terminal |
| 0:48 | The wow: `POST /best-price` — one call, all marketplaces rank in USD, cheapest + savings | Terminal, JSON |
| 1:02 | `evidence` block — analyzed counts, marketplace, honest caveat. "A decision it can justify." | Terminal |
| 1:10 | x402: call past preview → HTTP 402 challenge → paid → settled USDT0. "No key, no gas." | Terminal |
| 1:18 | Outro: landing page. "Competitor Price Checker · on X Layer · built for OKX.AI Genesis." | Browser + logo |

Note: target ~85s. If tight, cut the eBay beat (0:36) — the single-marketplace decision (0:08–0:36)
and Best Price Scan (0:48) are the two beats that sell it; keep those.

Checklist rekaman:
- [ ] Pre-warm cache (panggil tiap endpoint sekali sebelum rekaman) biar loading cepat
- [ ] Pilih ASIN + keyword yang hasilnya bersih (produk nyata, bukan aksesoris) — pakai `my_price` biar posisi jelas
- [ ] `X402_MODE=on` di prod (verified) + wallet payer + saldo USDT0 buat scene 402
- [ ] Font terminal besar, JSON pretty-print (`| python3 -m json.tool`)
- [ ] JANGAN tampilkan `.env`, `api.*` calls, atau nama data provider di layar (rahasia)

---

## Submission checklist (deadline Jul 27, 23:59 UTC)

Status kode & produk — DONE:
- [x] Produk feature-complete: 6 A2MCP services (5 marketplaces + Best Price Scan), decision-grade output
- [x] x402 v2 wired (OKX SDK), per-route pricing (0.4 / 1.5 USDT), reject-before-pay, 26 tests green
- [x] Landing page + brand
- [x] Endpoint self-check: `GET /health`, `GET /quote`, 402 challenge verified

Butuh AKSI kamu (blocker submission):
- [ ] **Deploy** ke public HTTPS + domain (pola `*.my.id` / `*.web.id`); set `X402_MODE=on`
- [ ] **Register** ASP di OKX.AI → dapat Agent ID (isi field di atas)
- [ ] Ganti CTA landing `href="#"` → `https://www.okx.ai/agents/{id}`
- [ ] Isi placeholder: X handle, Telegram handle
- [ ] Rekam demo video ≤90s (script + voice-over di `DEMO_VOICEOVER.md`)
- [ ] Post di X dengan #OKXAI + link video, tempel ke field "X Participation Post"
- [ ] Isi Google Form sebelum deadline
- [ ] (Rahasia) Repo di-Private-in sebelum share, atau pastikan tidak mengekspos data provider

Catatan honesty: jangan klaim "listed/live" selama status masih "under review" — sebut "registered,
Agent ID #…" saja. Endpoint memang live; listing marketplace terpisah.
```
