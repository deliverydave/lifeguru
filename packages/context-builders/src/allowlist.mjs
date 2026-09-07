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

export function assertNoPartnerPrivateFields(input) {
  const hits = [];
  for (const key of PARTNER_PRIVATE_FORBIDDEN) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined) {
      hits.push(key);
    }
  }
  return hits;
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
