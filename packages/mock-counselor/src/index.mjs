/**
 * Counselor replies — Claude when ANTHROPIC_API_KEY is set, otherwise mock.
 * Context is always assembled via the allowlisted builder.
 */
import { buildCounselorContext } from "@couples-coach/context-builders";
import { completeAnthropic } from "./anthropic.mjs";
import { buildCounselorPrompt } from "./prompt.mjs";

export { buildCounselorPrompt, STAGE_GOALS } from "./prompt.mjs";
export { completeAnthropic, DEFAULT_ANTHROPIC_MODEL } from "./anthropic.mjs";

const STAGE_PROMPTS = {
  START: "Welcome. This is a private coaching session. How would you like to begin?",
  CHECK_IN: "How are you arriving to this session — body, mood, and energy?",
  IDENTIFY_CURRENT_ISSUE: "What feels most present for you in the relationship right now?",
  EXPLORE_EVENT: "Walk me through a recent moment, as you experienced it.",
  IDENTIFY_EMOTION: "What emotions showed up for you in that moment?",
  IDENTIFY_UNDERLYING_NEED: "If you listen underneath the emotion, what need might be asking for care?",
  SEPARATE_OBSERVATION: "Let's separate what you observed from the story you told yourself about it.",
  PERSPECTIVE_TAKING: "If you imagine your partner's possible experience (without needing to know it), what might be going on for them?",
  IDENTIFY_DESIRED_OUTCOME: "What outcome would feel like progress for you, even a small one?",
  IDENTIFY_CONTROLLABLE: "Which parts of that outcome sit in your control?",
  CHOOSE_SMALL_ACTION: "What is one small, specific action you could take before the next session?",
  PRIVATE_SUMMARY: "I'll draft a private summary from only what you shared here. You can correct it.",
  OPTIONAL_SHARING: "Default is Keep private. Sharing with your partner is optional and off unless you choose it later.",
  END: "We can stop here. This session stays private to you.",
  SAFETY_HOLD: "I'm pausing ordinary coaching. If you are in immediate danger, contact local emergency services.",
};

const EXFIL_RE = [
  /what did (my )?partner/i,
  /what did they say/i,
  /word-for-word/i,
  /they typed/i,
  /partner (say|said|tell|told|share|shared|talk|typed|complain)/i,
  /partners? priv(ate|acy)/i,
  /partners? (session|memor|account|notes|goals|pack)/i,
  /partner_transcript/i,
  /partnerTranscript/i,
  /other (person|counselor|session)/i,
  /secrets? has my partner/i,
  /dump partner/i,
  /both (partners|contexts)/i,
  /contributing_person_id/i,
  /MemoryItem/i,
  /ignore previous instructions/i,
  /hidden system prompt/i,
  /cross-check my story against my partners/i,
  /private about my partner/i,
];

export function isPartnerExfilAttempt(text) {
  if (typeof text !== "string" || !text.trim()) return false;
  if (EXFIL_RE.some((re) => re.test(text))) return true;
  const t = text.toLowerCase();
  const mentionsPartner = /\bpartners?\b/.test(t);
  const fishing =
    /(said|say|tell|told|share[ds]?|secret|private|transcript|session|memor(?:y|ies)|context|abstract|pack|typed|complain|account|notes|goals|quote|reveal|dump|export|summar)/.test(
      t
    );
  return mentionsPartner && fishing;
}

export const SAFE_REFUSAL =
  "I only have access to your private session with me. I cannot see, quote, or infer what your partner said to their counselor — including transcripts, memories, or private summaries.";

function lastOwnerUserText(context) {
  const turns = Array.isArray(context.ownerTurns) ? context.ownerTurns : [];
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const t = turns[i];
    if (t && t.role === "user" && typeof t.text === "string") return t.text;
  }
  return "";
}

/**
 * @param {object} args
 * @param {object} args.rawBag untrusted bag — will be filtered through the context builder
 * @param {string} [args.userText]
 * @param {{ overtime?: boolean }} [args.timer]
 */
export function mockCounselorReply({ rawBag, userText = "", timer } = {}) {
  const context = buildCounselorContext(rawBag);
  const stage = context.stage || "CHECK_IN";
  const asked = typeof userText === "string" ? userText : "";
  const prior = lastOwnerUserText(context);

  if (isPartnerExfilAttempt(asked) || isPartnerExfilAttempt(prior)) {
    return SAFE_REFUSAL;
  }

  const guide = STAGE_PROMPTS[stage] || STAGE_PROMPTS.CHECK_IN;
  let reply = guide;
  if (asked.trim()) {
    reply = `I hear you. Staying with what you brought into this private session: ${guide}`;
  }
  if (timer && timer.overtime) {
    reply +=
      " We've passed the soft 20-minute mark. I'll finish this turn — sessions are not cut off mid-reply — and we can move toward a private summary when you are ready.";
  }
  return reply;
}

function hasAnthropicKey(apiKey) {
  const key = apiKey !== undefined ? apiKey : process.env.ANTHROPIC_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

let warnedMissingKey = false;

/**
 * Prefer Claude when a key is present; otherwise mock. Never logs turn bodies.
 */
export async function counselorReply({ rawBag, userText = "", timer, apiKey, model, fetchImpl } = {}) {
  const asked = typeof userText === "string" ? userText : "";
  buildCounselorContext(rawBag);
  if (isPartnerExfilAttempt(asked)) {
    return SAFE_REFUSAL;
  }
  const prompt = buildCounselorPrompt({ rawBag, userText, timer });
  if (!hasAnthropicKey(apiKey)) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn({ counselor: "mock", reason: "ANTHROPIC_API_KEY_missing" });
    }
    return mockCounselorReply({ rawBag, userText, timer });
  }
  return completeAnthropic({
    prompt,
    apiKey: (apiKey !== undefined ? apiKey : process.env.ANTHROPIC_API_KEY).trim(),
    model,
    fetchImpl,
  });
}
