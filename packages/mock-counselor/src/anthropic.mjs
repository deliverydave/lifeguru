/**
 * Anthropic Messages API client. Never logs message / transcript / summary_text bodies.
 */
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";
export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";

export function resolveAnthropicModel(override) {
  return override || process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
}

export function extractAnthropicText(payload) {
  if (!payload || !Array.isArray(payload.content)) return "";
  return payload.content
    .filter((part) => part && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

/**
 * @param {object} args
 * @param {{ system: string, messages: Array<{role: string, content: string}> }} args.prompt
 * @param {string} args.apiKey
 * @param {string} [args.model]
 * @param {typeof fetch} [args.fetchImpl]
 */
export async function completeAnthropic({ prompt, apiKey, model, fetchImpl = fetch } = {}) {
  if (!apiKey) {
    const err = new Error("ANTHROPIC_API_KEY missing");
    err.status = 500;
    throw err;
  }
  if (!prompt || !prompt.system || !Array.isArray(prompt.messages)) {
    const err = new Error("Counselor prompt required");
    err.status = 500;
    throw err;
  }
  const usedModel = resolveAnthropicModel(model);
  const res = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: usedModel,
      max_tokens: 1024,
      system: prompt.system,
      messages: prompt.messages,
    }),
  });
  if (!res.ok) {
    console.error({ counselor: "anthropic", status: res.status, model: usedModel });
    const err = new Error("Counselor provider unavailable");
    err.status = 502;
    throw err;
  }
  const payload = await res.json();
  const text = extractAnthropicText(payload);
  if (!text) {
    console.error({ counselor: "anthropic", status: 502, reason: "empty_completion" });
    const err = new Error("Counselor provider unavailable");
    err.status = 502;
    throw err;
  }
  return text;
}
