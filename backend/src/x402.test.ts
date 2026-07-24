import { test } from "node:test";
import assert from "node:assert/strict";

// Enable the x402 gate before importing the module (config reads env at import).
process.env.X402_MODE = "on";
process.env.X402_PAY_TO = "0x736159a06c89ea5b12ed88be658741edca64324d";

const { paidRoute } = await import("./x402.js");

// Minimal Express req/res doubles that capture the response.
function makeReqRes(headers: Record<string, string> = {}) {
  const req = { headers, get: () => "localhost", protocol: "http", originalUrl: "/x" } as any;
  const captured: { status?: number; body?: any } = {};
  const res = {
    locals: {},
    setHeader() {},
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: any) {
      captured.body = body;
      return this;
    },
  } as any;
  return { req, res, captured };
}

const PROOF = { "payment-signature": "0xdeadbeef" };

test("charge-on-deliverable: precheck 'not found' short-circuits WITHOUT settling", async () => {
  let settled = false;
  const handler = paidRoute(
    "POST /x",
    "test",
    "0.4",
    async () => ({ ok: false, status: 404, error: "nothing to price against" })
  );
  const { req, res, captured } = makeReqRes(PROOF);
  // next() would only be reached via the settlement middleware; assert it isn't.
  await handler(req, res, () => {
    settled = true;
  });
  assert.equal(settled, false, "settlement/next must not run when there is no deliverable");
  assert.equal(captured.status, 404);
  assert.equal(captured.body.charged, false);
});

test("charge-on-deliverable: a precheck throw is answered 503 WITHOUT settling", async () => {
  let settled = false;
  const handler = paidRoute("POST /x", "test", "0.4", async () => {
    throw new Error("upstream down");
  });
  const { req, res, captured } = makeReqRes(PROOF);
  await handler(req, res, () => {
    settled = true;
  });
  assert.equal(settled, false);
  assert.equal(captured.status, 503);
  assert.equal(captured.body.charged, false);
  assert.match(captured.body.error, /not charged/);
});

test("no payment proof: precheck never runs, caller gets the 402 challenge", async () => {
  let precheckRan = false;
  const handler = paidRoute("POST /x", "test", "0.4", async () => {
    precheckRan = true;
    return { ok: true };
  });
  const { req, res, captured } = makeReqRes(); // no proof header
  await handler(req, res, () => {});
  assert.equal(precheckRan, false, "must not touch the upstream before a payment attempt");
  assert.equal(captured.status, 402);
});
