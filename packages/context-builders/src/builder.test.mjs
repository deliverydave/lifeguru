import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCounselorContext, assembleOwnerContext } from "./builder.mjs";
import { findPartnerPrivateKeys } from "./allowlist.mjs";

test("builder is the sole assembler and keeps only allowlisted owner keys", () => {
  const ctx = buildCounselorContext({
    ownerPersonId: "person_a",
    stage: "CHECK_IN",
    ownerTurns: [{ role: "user", text: "hello" }],
    ownerMemories: [],
    sharedArtifacts: [],
    jointGoals: [],
    extraNoise: "drop",
  });
  assert.equal(ctx.ownerPersonId, "person_a");
  assert.equal(ctx.extraNoise, undefined);
  assert.deepEqual(Object.keys(ctx).sort(), [
    "jointGoals",
    "ownerMemories",
    "ownerPersonId",
    "ownerTurns",
    "sharedArtifacts",
    "stage",
  ]);
});

test("builder rejects partnerTranscript, partnerMemories, partnerPrivateSummary", () => {
  assert.throws(
    () =>
      buildCounselorContext({
        ownerPersonId: "person_a",
        stage: "CHECK_IN",
        partnerTranscript: "secret from B",
        partnerMemories: [{ value: "private" }],
        partnerPrivateSummary: "summary",
      }),
    /Partner-private fields rejected/
  );
});

test("builder rejects any partner* private key", () => {
  for (const key of ["partnerNotes", "partnerSafetyCase", "partnerFoo", "PartnerDump"]) {
    assert.throws(
      () => buildCounselorContext({ ownerPersonId: "person_a", stage: "CHECK_IN", [key]: "x" }),
      /Partner-private fields rejected/
    );
  }
});

test("nested partner keys are found and rejected", () => {
  const bag = {
    ownerPersonId: "person_a",
    stage: "CHECK_IN",
    ownerTurns: [{ role: "user", text: "hi", partnerTranscript: "nested leak" }],
  };
  const hits = findPartnerPrivateKeys(bag);
  assert.ok(hits.some((h) => h.includes("partnerTranscript")));
  assert.throws(() => buildCounselorContext(bag), /Partner-private fields rejected/);
});

test("assembleOwnerContext never queries a partner person id", () => {
  const partnerTurns = [{ role: "user", text: "I am hiding a blue elephant" }];
  const ctx = assembleOwnerContext({
    ownerPersonId: "person_a",
    stage: "CHECK_IN",
    ownerTurns: [{ role: "user", text: "I feel tense" }],
    ownerMemories: [],
  });
  const blob = JSON.stringify(ctx);
  assert.equal(blob.includes("blue elephant"), false);
  assert.equal(blob.includes("person_b"), false);
  assert.equal(ctx.ownerPersonId, "person_a");
  assert.equal(partnerTurns[0].text.includes("blue elephant"), true);
});
