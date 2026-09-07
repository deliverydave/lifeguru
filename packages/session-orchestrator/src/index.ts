/** Deterministic session orchestrator stub — no LLM calls in Week-0. */
export type Stage = string;

export function nextStage(current: Stage, event: string): Stage {
  if (event === "safety_trigger") return "SAFETY_HOLD";
  if (current === "START" && event === "session_created") return "CHECK_IN";
  return current;
}
