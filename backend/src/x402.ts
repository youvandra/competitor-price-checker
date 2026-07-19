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

export const x402Enabled = (): boolean =>
  config.x402Mode !== "off" && !!config.x402PayTo;

const paidCache = new Map<string, Handler>();

function buildPaidMiddleware(routeKey: string, description: string): Handler {
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
          price: `$${config.x402PriceUsd}`,
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

/** Express middleware factory for a paid route, e.g. paidRoute("POST /amazon", "..."). */
export function paidRoute(routeKey: string, description: string): Handler {
  return (req, res, next) => {
    if (!x402Enabled()) return next();

    const hasProof =
      req.headers["payment-signature"] ||
      req.headers["x-payment"] ||
      req.headers["x402-authorization"] ||
      req.headers["x402-payment"];

    if (hasProof) {
      let mw = paidCache.get(routeKey);
      if (!mw) {
        mw = buildPaidMiddleware(routeKey, description);
        paidCache.set(routeKey, mw);
      }
      return void mw(req, res, next);
    }
    return send402Challenge(req, res, description);
  };
}

/** Build + send the x402 v2 challenge (PAYMENT-REQUIRED header + JSON body). */
export function send402Challenge(
  req: Request,
  res: Response,
  description: string
): void {
  const amount = Math.round(
    Number(config.x402PriceUsd) * 10 ** USDT0_DECIMALS
  ).toString();
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
      perCall: `$${config.x402PriceUsd}`,
      amount: Math.round(
        Number(config.x402PriceUsd) * 10 ** USDT0_DECIMALS
      ).toString(),
      asset: USDT0_XLAYER,
      assetSymbol: "USDT0",
      network: NETWORK,
      payTo: config.x402PayTo || null,
    },
    settlement: "on-chain via OKX facilitator (@okxweb3/x402-express)",
    paid: [
      "POST /amazon",
      "POST /ebay",
      "POST /walmart",
      "POST /aliexpress",
      "POST /etsy",
    ],
    free: [
      "POST /preview/amazon",
      "POST /preview/ebay",
      "POST /preview/walmart",
      "POST /preview/aliexpress",
      "POST /preview/etsy",
      "GET /quote",
      "GET /health",
    ],
    note: "No free tier on paid services — every marketplace call requires x402 payment.",
  };
}
