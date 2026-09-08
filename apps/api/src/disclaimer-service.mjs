import { DISCLAIMER_COPY, DISCLAIMER_VERSIONS, REQUIRED_DISCLAIMERS } from "./constants.mjs";

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function disclaimerCatalog() {
  return {
    required: REQUIRED_DISCLAIMERS,
    copy: DISCLAIMER_COPY,
    versions: DISCLAIMER_VERSIONS,
  };
}

export function publicDisclaimerState(store, personId) {
  const acceptances = store.disclaimersFor(personId).map((r) => ({
    key: r.key,
    version: r.version,
    acceptedAt: r.acceptedAt,
  }));
  return {
    complete: store.hasRequiredDisclaimers(personId, REQUIRED_DISCLAIMERS),
    required: REQUIRED_DISCLAIMERS,
    acceptances,
  };
}

export function acceptDisclaimers(store, personId, items, clock = Date.now) {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError(400, "acceptances array is required");
  }
  const acceptedAt = new Date(clock()).toISOString();
  const rows = [];
  for (const item of items) {
    const key = item && item.key;
    const version = item && item.version;
    if (!key || !version) throw httpError(400, "each acceptance needs key and version");
    const expected = DISCLAIMER_VERSIONS[key];
    if (!expected) throw httpError(400, "Unknown disclaimer key");
    if (expected !== version) {
      throw httpError(400, "Disclaimer version mismatch");
    }
    rows.push(store.recordDisclaimer({ personId, key, version, acceptedAt }));
  }
  return publicDisclaimerState(store, personId);
}
