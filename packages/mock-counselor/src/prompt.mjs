/**
 * Sole Claude/mock prompt assembler. Always runs the context-builder allowlist first.
 * Partner-private keys never enter system or messages.
 */
import { buildCounselorContext, findPartnerPrivateKeys } from "@couples-coach/context-builders";

export const STAGE_GOALS = {
  START: "Welcome the owner into a private coaching session.",
  CHECK_IN: "Help the owner notice how they are arriving — body, mood, and energy — and name what is present.",
  IDENTIFY_CURRENT_ISSUE: "Help the owner name the relationship issue that feels most present right now.",
  EXPLORE_EVENT: "Explore a recent moment as the owner experienced it, with concrete detail.",
  IDENTIFY_EMOTION: "Help the owner name the emotions that showed up in that moment.",
  IDENTIFY_UNDERLYING_NEED: "Listen underneath the emotion for a need asking for care.",
  SEPARATE_OBSERVATION: "Separate observable facts from the story the owner told themselves.",
  PERSPECTIVE_TAKING:
    "Invite a possible view of the partner's experience without claiming to know their private words or feelings.",
  IDENTIFY_DESIRED_OUTCOME: "Clarify a small outcome that would feel like progress for the owner.",
  IDENTIFY_CONTROLLABLE: "Sort what sits in the owner's control from what does not.",
  CHOOSE_SMALL_ACTION: "Choose one small, specific action before the next session.",
  PRIVATE_SUMMARY: "Draft a private summary from only what the owner shared here; invite corrections.",
  OPTIONAL_SHARING: "Remind the owner that the default is Keep private; sharing is optional and off unless they choose it.",
  END: "Close the private session. Do not continue coaching past goodbye.",
  SAFETY_HOLD: "Pause ordinary coaching. If they are in immediate danger, direct them to local emergency services.",
};

const RECENT_TURN_LIMIT = 16;

export function buildSystemPrompt(context, timer) {
  const stage = context.stage || "CHECK_IN";
  const goal = STAGE_GOALS[stage] || STAGE_GOALS.CHECK_IN;
  const lines = [
    "You are a private AI relationship coach for one person. This is coaching and education, not psychotherapy, not licensed clinical treatment, and not a substitute for mental health care or emergency services.",
    "Explore evidence, observations, emotions, and needs. Do not merely validate or soothe. Be specific to what the owner just said — no canned one-liners, no repeating a stock check-in question after they already answered.",
    "You only have this owner's private session. Never reveal, quote, infer, or invent anything their partner said to another counselor (transcripts, memories, private summaries, or goals). If asked what their partner said or to dump partner context, refuse clearly.",
    `Current stage (set by the deterministic orchestrator — you do not change stages): ${stage}`,
    `Stage goal: ${goal}`,
    "You may say the owner seems ready to advance, but you do not change the stage. The client advances via the product controls.",
  ];
  if (timer && timer.overtime) {
    lines.push(
      "The soft 20-minute mark has passed. Finish this reply fully (no mid-turn cutoff) and offer to wind toward a private summary when they are ready."
    );
  }
  const memories = Array.isArray(context.ownerMemories) ? context.ownerMemories : [];
  if (memories.length) {
    lines.push("Owner memories (private, owner-scoped): " + JSON.stringify(memories));
  }
  const shared = Array.isArray(context.sharedArtifacts) ? context.sharedArtifacts : [];
  if (shared.length) {
    lines.push("Authorized shared artifacts (already consent-gated): " + JSON.stringify(shared));
  }
  const goals = Array.isArray(context.jointGoals) ? context.jointGoals : [];
  if (goals.length) {
    lines.push("Joint goals (already authorized): " + JSON.stringify(goals));
  }
  return lines.join("\n\n");
}

export function toAnthropicMessages(ownerTurns, userText = "") {
  const out = [];
  const turns = Array.isArray(ownerTurns) ? ownerTurns.slice(-RECENT_TURN_LIMIT) : [];
  for (const t of turns) {
    const role = t && t.role === "assistant" ? "assistant" : "user";
    const content = t && typeof t.text === "string" ? t.text.trim() : "";
    if (!content) continue;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += "\n\n" + content;
    else out.push({ role, content });
  }
  const asked = typeof userText === "string" ? userText.trim() : "";
  if (asked) {
    const last = out[out.length - 1];
    if (!last || last.role !== "user" || last.content !== asked) {
      if (last && last.role === "user") last.content += "\n\n" + asked;
      else out.push({ role: "user", content: asked });
    }
  }
  if (out.length === 0) {
    out.push({ role: "user", content: "Please begin this stage of my private session." });
  } else if (out[0].role !== "user") {
    out.unshift({ role: "user", content: "Please continue this private session." });
  }
  return out;
}

/**
 * Build Claude messages from owner-only context. Throws if partner* keys are present.
 */
export function buildCounselorPrompt({ rawBag, userText = "", timer } = {}) {
  const context = buildCounselorContext(rawBag);
  const system = buildSystemPrompt(context, timer);
  const messages = toAnthropicMessages(context.ownerTurns, userText);
  const prompt = {
    system,
    messages,
    context,
    stage: context.stage,
    stageGoal: STAGE_GOALS[context.stage] || STAGE_GOALS.CHECK_IN,
  };
  const leaks = findPartnerPrivateKeys(prompt);
  if (leaks.length) {
    throw new Error("Partner-private fields rejected: " + leaks.join(", "));
  }
  return prompt;
}
