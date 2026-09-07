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

function isPartnerPrivateKey(key: string): boolean {
  if ((PARTNER_PRIVATE_FORBIDDEN as readonly string[]).includes(key)) return true;
  return /^partner/i.test(key);
}

/** Walk objects/arrays and collect partner-private keys (any `partner*` + denylist). */
export function findPartnerPrivateKeys(input: unknown, path = ""): string[] {
  const hits: string[] = [];
  if (input == null || typeof input !== "object") return hits;
  if (Array.isArray(input)) {
    input.forEach((item, i) => {
      hits.push(...findPartnerPrivateKeys(item, path ? `${path}[${i}]` : `[${i}]`));
    });
    return hits;
  }
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const here = path ? `${path}.${key}` : key;
    if (isPartnerPrivateKey(key) && value !== undefined) hits.push(here);
    hits.push(...findPartnerPrivateKeys(value, here));
  }
  return hits;
}

export function assertNoPartnerPrivateFields(input: Record<string, unknown>): string[] {
  return findPartnerPrivateKeys(input);
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
