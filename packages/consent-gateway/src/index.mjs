export const DEFAULT_SHARE_DECISION = "KEEP";

/** Stub: only this module may write shared artifacts from private. */
export function assertGatewayOnlyWriter(callerModule) {
  if (callerModule !== "consent-gateway") {
    throw new Error("Only consent-gateway may write PRIVATE to SHARED");
  }
}
