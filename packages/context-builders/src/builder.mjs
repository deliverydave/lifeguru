/**
 * Sole counselor-context assembler (ADR-001).
 * Callers must not concatenate partner stores into prompts.
 */
import { pickAllowlistedContext } from "./allowlist.mjs";

/**
 * Assemble owner-only counselor context.
 * Rejects partnerTranscript / partnerMemories / partnerPrivateSummary / any partner* keys.
 */
export function buildCounselorContext(input) {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Context builder requires an owner-scoped object");
  }
  return pickAllowlistedContext(input);
}

/**
 * Build from owner-scoped repositories only. Never pass partner person_id into loaders.
 * By construction this cannot include Partner B private fields.
 */
export function assembleOwnerContext({
  ownerPersonId,
  stage,
  ownerTurns = [],
  ownerMemories = [],
  sharedArtifacts = [],
  jointGoals = [],
} = {}) {
  if (!ownerPersonId) throw new Error("ownerPersonId is required");
  return buildCounselorContext({
    ownerPersonId,
    stage,
    ownerTurns,
    ownerMemories,
    sharedArtifacts,
    jointGoals,
  });
}
