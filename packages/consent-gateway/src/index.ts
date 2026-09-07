export type ShareDecision = "KEEP" | "ABSTRACT" | "EXPLICIT";

export const DEFAULT_SHARE_DECISION: ShareDecision = "KEEP";

/** Stub: only this module may write shared artifacts from private. */
export function assertGatewayOnlyWriter(callerModule: string): void {
  if (callerModule !== "consent-gateway") {
    throw new Error("Only consent-gateway may write PRIVATE to SHARED");
  }
}
