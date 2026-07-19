# OKX.AI Genesis Hackathon — Submission Draft

Updated 2026-07-19 — reflects shipped state: 8 paid A2MCP services across 7 marketplaces plus a
cross-marketplace Best Price Scan, x402 v2 live, decision-grade output, landing page.

> Category: **Software Utility** (secondary flavor: Finance Copilot for sellers/commerce agents).
> **Live:** https://pricecheck.web.id (landing) · https://pricecheck.web.id/quote (pricing + status)

## Google Form Fields

### ASP Name
```
Competitor Price Advisor
```

### Agent ID
```
#6713
```

### ASP Description
```
Competitor Price Advisor turns any product into a pricing decision.
Per-marketplace advisors (Amazon Buy Box, eBay, Walmart, AliExpress,
Etsy, Target, Shopee, etc.) each return the price to beat, your
position, and four ready strategies: Win, Match, Premium Hold, and
Margin Floor — with a recommendation. Best Price Scan checks every
marketplace in one call and ranks the cheapest in USD. Every result
includes an evidence block so the calling agent can justify the move.
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
- "Check Target and Shopee for this product."               -> /target, /shopee (keyword listings + pricing move)
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

Competitor Price Advisor answers. An A2MCP service on X Layer.

🏷️ Amazon Buy Box + eBay, Walmart, AliExpress, Etsy, Target, Shopee — one price advisor each
🎯 4 ready strategies (Win / Match / Hold / Margin Floor) + a recommendation per marketplace
🌐 Best Price Scan: cheapest across EVERY marketplace in one call

Live: pricecheck.web.id
Agent ID: #6713
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
| 1:18 | Outro: landing page. "Competitor Price Advisor · Agent #6713 · built for OKX.AI Genesis." | Browser + logo |

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
- [x] Produk feature-complete: 8 A2MCP services (7 marketplaces + Best Price Scan), decision-grade output
- [x] x402 v2 wired (OKX SDK), per-route pricing (0.4 / 1.5 USDT), reject-before-pay, 26 tests green
- [x] Landing page + brand
- [x] Endpoint self-check: `GET /health`, `GET /quote`, 402 challenge verified

Status deploy — DONE:
- [x] **Deployed**: https://pricecheck.web.id (VPS, pm2 `competitor-price-checker` :3006, nginx + HTTPS/Certbot)
- [x] `X402_MODE=demo` live (402 challenge verified over HTTPS)

Butuh AKSI kamu (blocker submission):
- [ ] (Opsional) `X402_MODE=on` di prod untuk settlement penuh saat scene demo 402
- [x] **Register** ASP di OKX.AI — Agent ID **#6713** (Competitor Price Advisor, 8 services)
- [ ] Ganti CTA landing `href="#"` → `https://www.okx.ai/agents/6713`
- [ ] Isi placeholder: X handle, Telegram handle
- [ ] Rekam demo video ≤90s (script + voice-over di `DEMO_VOICEOVER.md`)
- [ ] Post di X dengan #OKXAI + link video, tempel ke field "X Participation Post"
- [ ] Isi Google Form sebelum deadline
- [ ] (Rahasia) Repo di-Private-in sebelum share, atau pastikan tidak mengekspos data provider

Catatan honesty: jangan klaim "listed/live" selama status masih "under review" — sebut "registered,
Agent ID #…" saja. Endpoint memang live; listing marketplace terpisah.
```
