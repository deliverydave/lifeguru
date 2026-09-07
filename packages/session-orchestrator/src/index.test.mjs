import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SESSION_STAGES,
  SOFT_TIMER_LIMIT_MS,
  nextStage,
  normalizeStage,
  sessionTimer,
} from "./index.mjs";

test("M0 linear path is complete and deterministic", () => {
  assert.deepEqual(SESSION_STAGES, [
    "START",
    "CHECK_IN",
    "IDENTIFY_CURRENT_ISSUE",
    "EXPLORE_EVENT",
    "IDENTIFY_EMOTION",
    "IDENTIFY_UNDERLYING_NEED",
    "SEPARATE_OBSERVATION",
    "PERSPECTIVE_TAKING",
    "IDENTIFY_DESIRED_OUTCOME",
    "IDENTIFY_CONTROLLABLE",
    "CHOOSE_SMALL_ACTION",
    "PRIVATE_SUMMARY",
    "OPTIONAL_SHARING",
    "END",
  ]);
  let stage = "START";
  stage = nextStage(stage, "session_created");
  assert.equal(stage, "CHECK_IN");
  const walked = ["START", stage];
  while (stage !== "END") {
    const next = nextStage(stage, "advance");
    assert.notEqual(next, stage, "advance must move until END");
    stage = next;
    walked.push(stage);
  }
  assert.deepEqual(walked, SESSION_STAGES);
  assert.equal(nextStage("END", "advance"), "END");
});

test("unknown events do not jump stages", () => {
  assert.equal(nextStage("CHECK_IN", "nope"), "CHECK_IN");
});

test("safety_trigger leaves the linear path; resume returns to CHECK_IN", () => {
  assert.equal(nextStage("EXPLORE_EVENT", "safety_trigger"), "SAFETY_HOLD");
  assert.equal(nextStage("SAFETY_HOLD", "advance"), "CHECK_IN");
});

test("0001 enum aliases normalize to M0 names", () => {
  assert.equal(normalizeStage("IDENTIFY_ISSUE"), "IDENTIFY_CURRENT_ISSUE");
  assert.equal(normalizeStage("SHARING_DECISION"), "OPTIONAL_SHARING");
});

test("soft timer tracks elapsed + stage and never hard-kills", () => {
  const started = 1_000_000;
  const mid = sessionTimer(started, "CHECK_IN", started + 5 * 60 * 1000);
  assert.equal(mid.elapsedMs, 5 * 60 * 1000);
  assert.equal(mid.stage, "CHECK_IN");
  assert.equal(mid.hardKill, false);
  assert.equal(mid.overtime, false);
  assert.equal(mid.limitMs, SOFT_TIMER_LIMIT_MS);

  const over = sessionTimer(started, "IDENTIFY_EMOTION", started + SOFT_TIMER_LIMIT_MS + 1);
  assert.equal(over.overtime, true);
  assert.equal(over.hardKill, false);
  assert.equal(over.remainingMs, 0);
});
