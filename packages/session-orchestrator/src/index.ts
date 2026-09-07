/** Deterministic session orchestrator stub — JS source of truth: index.mjs */

export type Stage = string;

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
] as const;

export const SOFT_TIMER_LIMIT_MS = 20 * 60 * 1000;

export function nextStage(current: Stage, event: string): Stage {
  if (event === "safety_trigger") return "SAFETY_HOLD";
  if (current === "START" && event === "session_created") return "CHECK_IN";
  return current;
}
