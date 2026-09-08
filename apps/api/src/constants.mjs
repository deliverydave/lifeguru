/** M1 identity, membership, disclaimer, and billing constants. */

export const MEMBERSHIP_STATUS = {
  INVITED: "invited",
  ACTIVE: "active",
  LEFT: "left",
};

export const RELATIONSHIP_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  FROZEN: "frozen",
  ARCHIVED: "archived",
};

export const INVITE_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  EXPIRED: "expired",
  REVOKED: "revoked",
};

export const DISCLAIMER_KEY = {
  PRIVACY: "privacy-explainer",
  COACHING: "coaching-not-therapy",
};

export const DISCLAIMER_VERSIONS = {
  [DISCLAIMER_KEY.PRIVACY]: "privacy-explainer-v1",
  [DISCLAIMER_KEY.COACHING]: "coaching-not-therapy-v1",
};

export const REQUIRED_DISCLAIMERS = [
  { key: DISCLAIMER_KEY.PRIVACY, version: DISCLAIMER_VERSIONS[DISCLAIMER_KEY.PRIVACY] },
  { key: DISCLAIMER_KEY.COACHING, version: DISCLAIMER_VERSIONS[DISCLAIMER_KEY.COACHING] },
];

export const DISCLAIMER_COPY = {
  [DISCLAIMER_KEY.PRIVACY]: {
    title: "Privacy explainer",
    body:
      "This product is two private AI coaches linked by a narrow, consent-gated relationship plane. " +
      "Your counselor never receives your partner's private session data, memories, or summaries. " +
      "The default share decision is Keep private. Nothing is shared until you explicitly choose otherwise. " +
      "Opaque person IDs are used in the counseling domain; your login identity is mapped separately.",
  },
  [DISCLAIMER_KEY.COACHING]: {
    title: "Coaching, not therapy",
    body:
      "This product provides AI relationship coaching and education. It is not psychotherapy, not licensed " +
      "clinical treatment, and not a substitute for professional mental health care or emergency services. " +
      "If you are in immediate danger, contact local emergency services.",
  },
};

export const SESSION_START_REMINDER =
  "Reminder: this is AI coaching, not therapy. If you are in immediate danger, contact local emergency services.";

export const DEFAULT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_ACTIVE_MEMBERS = 2;

export const BILLING_STUB = {
  enabled: process.env.BILLING_ENABLED === "1",
  provider: "stripe",
  note: "Stripe billing is out of scope for M1. Feature flag remains off unless BILLING_ENABLED=1.",
};
