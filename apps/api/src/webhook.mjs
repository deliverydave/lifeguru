/**
 * Clerk user.created webhook → provision Person + AccountPersonMap.
 * Signature is verified when CLERK_WEBHOOK_SECRET is set.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function header(req, name) {
  return req.get(name) || req.get(name.toLowerCase()) || "";
}

function parseRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  return "";
}

/** Svix-compatible verification for Clerk webhooks (whsec_ secrets). */
export function verifySvixSignature(rawBody, headers, secret) {
  const id = headers["svix-id"] || headers["Svix-Id"];
  const timestamp = headers["svix-timestamp"] || headers["Svix-Timestamp"];
  const signatureHeader = headers["svix-signature"] || headers["Svix-Signature"];
  if (!id || !timestamp || !signatureHeader || !secret) {
    throw new Error("missing webhook signature headers");
  }
  const secretBytes = Buffer.from(String(secret).replace(/^whsec_/, ""), "base64");
  const signed = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signed).digest("base64");
  const candidates = String(signatureHeader)
    .split(" ")
    .map((part) => part.replace(/^v1,/, "").replace(/^v1=/, ""))
    .filter(Boolean);
  const expectedBuf = Buffer.from(expected);
  for (const candidate of candidates) {
    const got = Buffer.from(candidate);
    if (got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf)) {
      return JSON.parse(rawBody);
    }
  }
  throw new Error("invalid webhook signature");
}

export function createClerkWebhookHandler(store, options = {}) {
  const secret = options.webhookSecret !== undefined ? options.webhookSecret : process.env.CLERK_WEBHOOK_SECRET;
  const verify = options.verifyWebhook;

  return function handleClerkWebhook(req, res, next) {
    try {
      if (!secret && !verify) {
        throw httpError(503, "CLERK_WEBHOOK_SECRET is not set");
      }
      const raw = parseRawBody(req);
      let event;
      if (verify) {
        event = verify(raw, req.headers);
      } else {
        event = verifySvixSignature(raw, {
          "svix-id": header(req, "svix-id"),
          "svix-timestamp": header(req, "svix-timestamp"),
          "svix-signature": header(req, "svix-signature"),
        }, secret);
      }
      const type = event && event.type;
      const accountId = event && event.data && event.data.id;
      if ((type === "user.created" || type === "user.updated") && accountId) {
        store.provisionPersonForAccount(accountId);
      }
      res.json({ ok: true });
    } catch (err) {
      if (!err.status) {
        err.status = 401;
        err.message = "Invalid webhook signature";
      }
      next(err);
    }
  };
}
