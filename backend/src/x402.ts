import type { Request, Response, NextFunction } from "express";
import { paymentMiddleware } from "@okxweb3/x402-express";
import { x402ResourceServer } from "@okxweb3/x402-express";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import {
  config,
  NETWORK,
  USDT0_XLAYER,
  USDT0_DECIMALS,
} from "./config.js";

// Path-based x402 gate (OKX howtomcp + PixelBrief pattern): each paid service
// is its own route, guarded independently. Free routes never touch this.

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

/**
 * Deliverable check run BEFORE x402 settlement (only when a payment proof is
 * present). Return `{ ok: true }` to proceed to settlement, or a failure to
 * short-circuit with an un-settled error response. A thrown error is treated as
 * a transient upstream failure and also short-circuits without settling.
 */
export type PaidPrecheck = (
  req: Request,
  res: Response
) => Promise<{ ok: true } | { ok: false; status: number; error: string }>;

export const x402Enabled = (): boolean =>
  config.x402Mode !== "off" && !!config.x402PayTo;

const paidCache = new Map<string, Handler>();

function buildPaidMiddleware(
  routeKey: string,
  description: string,
  priceUsd: string
): Handler {
  const facilitator = new OKXFacilitatorClient({
    apiKey: config.xlayerApiKey,
    secretKey: config.xlayerSecretKey,
    passphrase: config.xlayerPassphrase,
    syncSettle: true,
  });
  const resourceServer = new x402ResourceServer(facilitator).register(
    NETWORK,
    new ExactEvmScheme()
  );
  return paymentMiddleware(
    {
      [routeKey]: {
        accepts: {
          scheme: "exact",
          price: `$${priceUsd}`,
          network: NETWORK,
          payTo: config.x402PayTo,
        },
        description,
        mimeType: "application/json",
      },
    },
    resourceServer
  ) as unknown as Handler;
}

/**
 * Express middleware factory for a paid route, e.g. paidRoute("POST /amazon", "…").
 * priceUsd defaults to the standard per-call price; pass it to override (e.g. Best Price Scan).
 */
export function paidRoute(
  routeKey: string,
  description: string,
  priceUsd: string = config.x402PriceUsd,
  precheck?: PaidPrecheck
): Handler {
  return async (req, res, next) => {
    if (!x402Enabled()) return next();

    const hasProof =
      req.headers["payment-signature"] ||
      req.headers["x-payment"] ||
      req.headers["x402-authorization"] ||
      req.headers["x402-payment"];

    if (hasProof) {
      // Charge-on-deliverable. `syncSettle: true` moves funds the instant the
      // payment middleware runs, and this server holds no key, so it can never
      // refund. So before settling we prove a real result exists: the precheck
      // fetches upstream and stashes the result on res.locals for the handler to
      // reuse (no double fetch). If the upstream has nothing (not found) or
      // fails, we answer WITHOUT settling — the caller keeps their money.
      if (precheck) {
        let verdict: Awaited<ReturnType<PaidPrecheck>>;
        try {
          verdict = await precheck(req, res);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          res
            .status(503)
            .json({ error: `upstream check failed — not charged: ${msg}`, charged: false });
          return;
        }
        if (!verdict.ok) {
          res.status(verdict.status).json({ error: verdict.error, charged: false });
          return;
        }
      }

      let mw = paidCache.get(routeKey);
      if (!mw) {
        mw = buildPaidMiddleware(routeKey, description, priceUsd);
        paidCache.set(routeKey, mw);
      }
      return void mw(req, res, next);
    }
    return send402Challenge(req, res, description, priceUsd);
  };
}

/** Build + send the x402 v2 challenge (PAYMENT-REQUIRED header + JSON body). */
export function send402Challenge(
  req: Request,
  res: Response,
  description: string,
  priceUsd: string = config.x402PriceUsd
): void {
  const amount = Math.round(Number(priceUsd) * 10 ** USDT0_DECIMALS).toString();
  const challenge = {
    x402Version: 2,
    resource: {
      url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      description,
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        amount,
        asset: USDT0_XLAYER,
        payTo: config.x402PayTo,
        maxTimeoutSeconds: 300,
        extra: { name: "USD₮0", version: "1" },
      },
    ],
  };
  res.setHeader(
    "PAYMENT-REQUIRED",
    Buffer.from(JSON.stringify(challenge)).toString("base64")
  );
  res.status(402).json(challenge);
}

export function x402Info(): Record<string, unknown> {
  return {
    enabled: x402Enabled(),
    mode: config.x402Mode,
    x402Version: 2,
    pricing: {
      perMarketplaceCall: `$${config.x402PriceUsd}`,
      bestPriceScan: `$${config.x402ComparePriceUsd}`,
      asset: USDT0_XLAYER,
      assetSymbol: "USDT0",
      network: NETWORK,
      payTo: config.x402PayTo || null,
    },
    settlement: "on-chain via OKX facilitator (@okxweb3/x402-express)",
    chargePolicy:
      "charge-on-deliverable — the upstream is probed before settlement; a not-found result or an upstream failure returns an un-settled error (charged:false), so you are never charged for an empty result.",
    paid: [
      "POST /amazon",
      "POST /ebay",
      "POST /walmart",
      "POST /aliexpress",
      "POST /etsy",
      "POST /target",
      "POST /shopee",
      "POST /best-price",
    ],
    free: [
      "POST /preview/amazon",
      "POST /preview/ebay",
      "POST /preview/walmart",
      "POST /preview/aliexpress",
      "POST /preview/etsy",
      "POST /preview/target",
      "POST /preview/shopee",
      "POST /preview/best-price",
      "GET /quote",
      "GET /health",
    ],
    note: "No free tier on paid services — every call requires x402 payment.",
  };
}
