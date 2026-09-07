/** Allowed top-level keys for private counselor context (owner-scoped). */
export const OWNER_CONTEXT_ALLOWLIST = [
  "ownerPersonId",
  "stage",
  "ownerTurns",
  "ownerMemories",
  "sharedArtifacts",
  "jointGoals",
] as const;

export type OwnerContextKey = (typeof OWNER_CONTEXT_ALLOWLIST)[number];

/** Partner-private fields that must never enter counselor prompts. */
export const PARTNER_PRIVATE_FORBIDDEN = [
  "partnerTranscript",
  "partnerMemories",
  "partnerPrivateSummary",
  "partnerTurns",
  "partnerGoals",
  "partnerSafetyCase",
  "contributing_person_id",
] as const;

export function assertNoPartnerPrivateFields(input: Record<string, unknown>): string[] {
  const hits: string[] = [];
  for (const key of PARTNER_PRIVATE_FORBIDDEN) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined) {
      hits.push(key);
    }
  }
  return hits;
}

export function pickAllowlistedContext(input: Record<string, unknown>): Record<string, unknown> {
  const forbidden = assertNoPartnerPrivateFields(input);
  if (forbidden.length > 0) {
    throw new Error("Partner-private fields rejected: " + forbidden.join(", "));
  }
  const out: Record<string, unknown> = {};
  for (const key of OWNER_CONTEXT_ALLOWLIST) {
    if (key in input) out[key] = input[key];
  }
  return out;
}
