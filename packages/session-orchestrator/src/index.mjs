/** Deterministic session orchestrator — no LLM / agent loops (ADR-001). */

/** M0 linear stages (acceptance path). SAFETY_HOLD is off-path. */
export const SESSION_STAGES = [
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
];

/**
 * 0001 session_stage enum → M0 orchestrator names.
 * Cloud SQL is out of scope for M0; this keeps comments/migrations aligned.
 */
export const STAGE_FROM_0001 = {
  START: "START",
  CHECK_IN: "CHECK_IN",
  IDENTIFY_ISSUE: "IDENTIFY_CURRENT_ISSUE",
  EXPLORE_EVENT: "EXPLORE_EVENT",
  IDENTIFY_EMOTION: "IDENTIFY_EMOTION",
  IDENTIFY_NEED: "IDENTIFY_UNDERLYING_NEED",
  OBS_VS_INTERP: "SEPARATE_OBSERVATION",
  PERSPECTIVE: "PERSPECTIVE_TAKING",
  DESIRED_OUTCOME: "IDENTIFY_DESIRED_OUTCOME",
  CONTROLLABLES: "IDENTIFY_CONTROLLABLE",
  SMALL_ACTION: "CHOOSE_SMALL_ACTION",
  WIND_DOWN: "PRIVATE_SUMMARY",
  PRIVATE_SUMMARY: "PRIVATE_SUMMARY",
  CORRECTIONS: "PRIVATE_SUMMARY",
  SHARING_DECISION: "OPTIONAL_SHARING",
  SAFETY_HOLD: "SAFETY_HOLD",
  END: "END",
};

export const SOFT_TIMER_LIMIT_MS = 20 * 60 * 1000;

export function normalizeStage(stage) {
  if (typeof stage !== "string") return "START";
  if (SESSION_STAGES.includes(stage) || stage === "SAFETY_HOLD") return stage;
  return STAGE_FROM_0001[stage] || "START";
}

export function stageIndex(stage) {
  const n = normalizeStage(stage);
  const i = SESSION_STAGES.indexOf(n);
  return i === -1 ? -1 : i;
}

export function nextStage(current, event) {
  const stage = normalizeStage(current);
  if (event === "safety_trigger") return "SAFETY_HOLD";
  if (stage === "SAFETY_HOLD") {
    if (event === "resume" || event === "advance") return "CHECK_IN";
    return "SAFETY_HOLD";
  }
  if (stage === "START" && (event === "session_created" || event === "advance")) {
    return "CHECK_IN";
  }
  if (event === "advance" || event === "user_continue") {
    const i = SESSION_STAGES.indexOf(stage);
    if (i === -1 || i >= SESSION_STAGES.length - 1) return stage;
    return SESSION_STAGES[i + 1];
  }
  return stage;
}

export function sessionTimer(startedAtMs, stage, nowMs = Date.now()) {
  const elapsedMs = Math.max(0, nowMs - startedAtMs);
  return {
    limitMs: SOFT_TIMER_LIMIT_MS,
    elapsedMs,
    remainingMs: Math.max(0, SOFT_TIMER_LIMIT_MS - elapsedMs),
    overtime: elapsedMs >= SOFT_TIMER_LIMIT_MS,
    stage: normalizeStage(stage),
    hardKill: false,
  };
}

export { nextStage as default };
