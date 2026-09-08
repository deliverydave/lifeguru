"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { BypassAuthBridge, ClerkAuthBridge, NoneAuthBridge } from "../lib/auth-context";
import { clerkEnabled, clerkPublishableKey, devAuthBypass } from "../lib/config";

export default function Providers({ children }) {
  if (clerkEnabled()) {
    return (
      <ClerkProvider
        publishableKey={clerkPublishableKey()}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/onboarding"
        afterSignUpUrl="/onboarding"
      >
        <ClerkAuthBridge>{children}</ClerkAuthBridge>
      </ClerkProvider>
    );
  }
  if (devAuthBypass()) {
    return <BypassAuthBridge>{children}</BypassAuthBridge>;
  }
  return <NoneAuthBridge>{children}</NoneAuthBridge>;
}
