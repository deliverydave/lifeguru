export const OWNER_CONTEXT_ALLOWLIST = [
  "ownerPersonId",
  "stage",
  "ownerTurns",
  "ownerMemories",
  "sharedArtifacts",
  "jointGoals",
];

export const PARTNER_PRIVATE_FORBIDDEN = [
  "partnerTranscript",
  "partnerMemories",
  "partnerPrivateSummary",
  "partnerTurns",
  "partnerGoals",
  "partnerSafetyCase",
  "contributing_person_id",
];

function isPartnerPrivateKey(key) {
  if (PARTNER_PRIVATE_FORBIDDEN.includes(key)) return true;
  return /^partner/i.test(key);
}

/** Walk objects/arrays and collect partner-private keys (any `partner*` + denylist). */
export function findPartnerPrivateKeys(input, path = "") {
  const hits = [];
  if (input == null || typeof input !== "object") return hits;
  if (Array.isArray(input)) {
    input.forEach((item, i) => {
      hits.push(...findPartnerPrivateKeys(item, path ? `${path}[${i}]` : `[${i}]`));
    });
    return hits;
  }
  for (const [key, value] of Object.entries(input)) {
    const here = path ? `${path}.${key}` : key;
    if (isPartnerPrivateKey(key) && value !== undefined) hits.push(here);
    hits.push(...findPartnerPrivateKeys(value, here));
  }
  return hits;
}

export function assertNoPartnerPrivateFields(input) {
  return findPartnerPrivateKeys(input);
}

export function pickAllowlistedContext(input) {
  const forbidden = assertNoPartnerPrivateFields(input);
  if (forbidden.length > 0) {
    throw new Error("Partner-private fields rejected: " + forbidden.join(", "));
  }
  const out = {};
  for (const key of OWNER_CONTEXT_ALLOWLIST) {
    if (key in input) out[key] = input[key];
  }
  return out;
}
