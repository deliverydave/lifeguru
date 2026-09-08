export function clerkPublishableKey() {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
}

export function clerkEnabled() {
  return Boolean(clerkPublishableKey());
}

export function devAuthBypass() {
  return process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "1";
}

export function authMode() {
  if (clerkEnabled()) return "clerk";
  if (devAuthBypass()) return "bypass";
  return "none";
}
