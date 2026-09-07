import assert from "node:assert/strict";
import { test } from "node:test";
import { findPartnerPrivateKeys } from "@couples-coach/context-builders";
import { buildCounselorPrompt, STAGE_GOALS } from "./prompt.mjs";

function ownerBag(overrides = {}) {
  return {
    ownerPersonId: "person_a",
    stage: "CHECK_IN",
    ownerTurns: [{ role: "user", text: "I felt tense at dinner" }],
    ownerMemories: [],
    sharedArtifacts: [],
    jointGoals: [],
    ...overrides,
  };
}

test("prompt builder rejects partnerTranscript / partnerMemories / partnerPrivateSummary / partner* keys", () => {
  for (const key of ["partnerTranscript", "partnerMemories", "partnerPrivateSummary", "partnerNotes"]) {
    assert.throws(
      () => buildCounselorPrompt({ rawBag: ownerBag({ [key]: "secret from B" }), userText: "hi" }),
      /Partner-private fields rejected/
    );
  }
});

test("built prompt never includes partner* keys or partner secrets", () => {
  const prompt = buildCounselorPrompt({
    rawBag: ownerBag({
      extraNoise: "drop me",
      ownerTurns: [
        { role: "assistant", text: "How are you arriving?" },
        { role: "user", text: "I felt tense at dinner after we argued about dishes." },
      ],
    }),
    userText: "I felt tense at dinner after we argued about dishes.",
  });
  assert.equal(findPartnerPrivateKeys(prompt).length, 0);
  const blob = JSON.stringify(prompt);
  assert.equal(/partnerTranscript|partnerMemories|partnerPrivateSummary|partnerNotes/.test(blob), false);
  assert.equal(blob.includes("blue elephant hideout"), false);
  assert.equal(blob.includes("drop me"), false);
  assert.deepEqual(Object.keys(prompt.context).sort(), [
    "jointGoals",
    "ownerMemories",
    "ownerPersonId",
    "ownerTurns",
    "sharedArtifacts",
    "stage",
  ]);
  assert.match(prompt.system, /CHECK_IN/);
  assert.match(prompt.system, /not psychotherapy/i);
  assert.match(prompt.system, /Stage goal/);
  assert.equal(prompt.stageGoal, STAGE_GOALS.CHECK_IN);
  assert.ok(prompt.messages.some((m) => m.role === "user" && /tense at dinner/.test(m.content)));
  assert.equal(prompt.messages[0].role, "user");
});

test("prompt includes current stage goal and does not let the model own transitions", () => {
  const prompt = buildCounselorPrompt({
    rawBag: ownerBag({ stage: "IDENTIFY_EMOTION" }),
    userText: "My chest got tight.",
  });
  assert.match(prompt.system, /IDENTIFY_EMOTION/);
  assert.match(prompt.system, new RegExp(STAGE_GOALS.IDENTIFY_EMOTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prompt.system, /do not change the stage/i);
});
