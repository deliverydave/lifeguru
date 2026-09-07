import assert from "node:assert/strict";
import { test } from "node:test";
import { pickAllowlistedContext, assertNoPartnerPrivateFields } from "./allowlist.mjs";

test("allowlist rejects partnerTranscript", () => {
  const input = {
    ownerPersonId: "person_a",
    stage: "CHECK_IN",
    ownerTurns: [],
    partnerTranscript: "secret from B",
  };
  assert.deepEqual(assertNoPartnerPrivateFields(input), ["partnerTranscript"]);
  assert.throws(() => pickAllowlistedContext(input), /Partner-private fields rejected/);
});

test("allowlist rejects partnerMemories and partnerPrivateSummary", () => {
  const input = {
    ownerPersonId: "person_a",
    partnerMemories: [{ value: "private" }],
    partnerPrivateSummary: "summary",
  };
  const hits = assertNoPartnerPrivateFields(input);
  assert.ok(hits.includes("partnerMemories"));
  assert.ok(hits.includes("partnerPrivateSummary"));
  assert.throws(() => pickAllowlistedContext(input));
});

test("allowlist rejects any partner* key", () => {
  const input = { ownerPersonId: "person_a", partnerSecretNotes: "nope" };
  assert.ok(assertNoPartnerPrivateFields(input).some((h) => /partnerSecretNotes/i.test(h)));
  assert.throws(() => pickAllowlistedContext(input), /Partner-private fields rejected/);
});

test("allowlist keeps only owner fields", () => {
  const input = {
    ownerPersonId: "person_a",
    stage: "CHECK_IN",
    ownerTurns: [{ role: "user", text: "hi" }],
    ownerMemories: [],
    sharedArtifacts: [],
    jointGoals: [],
    extraNoise: "drop me",
  };
  const out = pickAllowlistedContext(input);
  assert.equal(out.ownerPersonId, "person_a");
  assert.equal(out.extraNoise, undefined);
  assert.deepEqual(Object.keys(out).sort(), [
    "jointGoals",
    "ownerMemories",
    "ownerPersonId",
    "ownerTurns",
    "sharedArtifacts",
    "stage",
  ]);
});
