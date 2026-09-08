/**
 * Clerk JWT/session → opaque person_id via AccountPersonMap.
 * Production path never trusts client-supplied person_id.
 * DEV bypass (X-Person-Id) only when authBypass / M1_DEV_AUTH_BYPASS=1.
 */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function bearerToken(req) {
  const header = req.get("authorization") || req.get("Authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return "";
}

async function defaultVerifyClerkToken(token, { secretKey, jwtKey }) {
  const { verifyToken } = await import("@clerk/backend");
  const result = await verifyToken(token, {
    secretKey,
    jwtKey: jwtKey || process.env.CLERK_JWT_KEY || undefined,
  });
  if (result && result.sub) return result;
  if (result && result.data && result.data.sub) return result.data;
  throw new Error("invalid Clerk token");
}

export function isBypassEnabled(options = {}) {
  if (options.authBypass !== undefined) return Boolean(options.authBypass);
  return process.env.M1_DEV_AUTH_BYPASS === "1";
}

export function clerkSecretConfigured(options = {}) {
  if (options.clerkConfigured !== undefined) return Boolean(options.clerkConfigured);
  return Boolean(options.secretKey || process.env.CLERK_SECRET_KEY);
}

export function createAuthResolver(store, options = {}) {
  const bypass = isBypassEnabled(options);
  const secretKey = options.secretKey || process.env.CLERK_SECRET_KEY || "";
  const clerkOn = clerkSecretConfigured({ ...options, secretKey });
  const verifyClerkToken = options.verifyClerkToken || defaultVerifyClerkToken;

  return async function resolvePersonId(req) {
    if (bypass) {
      const id = req.get("x-person-id") || req.get("X-Person-Id");
      if (!id || !String(id).trim()) {
        throw httpError(401, "Unauthorized");
      }
      const personId = String(id).trim();
      store.ensurePerson(personId);
      return personId;
    }

    if (!clerkOn || !secretKey) {
      throw httpError(
        503,
        "CLERK_SECRET_KEY is not set. Live auth requires Clerk keys. For tests, set M1_DEV_AUTH_BYPASS=1.",
      );
    }

    const token = bearerToken(req);
    if (!token) {
      throw httpError(401, "Unauthorized");
    }

    let payload;
    try {
      payload = await verifyClerkToken(token, { secretKey });
    } catch {
      throw httpError(401, "Unauthorized");
    }

    const accountId = payload && payload.sub;
    if (!accountId || typeof accountId !== "string") {
      throw httpError(401, "Unauthorized");
    }

    // Ignore any client-supplied X-Person-Id on the production path.
    return store.provisionPersonForAccount(accountId);
  };
}

export function authMode(options = {}) {
  if (isBypassEnabled(options)) return "bypass";
  if (clerkSecretConfigured(options)) return "clerk";
  return "unconfigured";
}
