"use client";

import { SignIn } from "@clerk/nextjs";
import { clerkEnabled, devAuthBypass } from "@/lib/config";

export default function SignInPage() {
  if (!clerkEnabled()) {
    return (
      <section>
        <h1>Sign in</h1>
        {devAuthBypass() ? (
          <p>
            Clerk is not configured. Dev bypass is on — use the header identity switch, then continue to{" "}
            <a href="/onboarding">onboarding</a>.
          </p>
        ) : (
          <p>
            Clerk is not configured. See <a href="/setup">setup</a>.
          </p>
        )}
      </section>
    );
  }
  return (
    <section style={{ display: "flex", justifyContent: "center", padding: 16 }}>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/onboarding" />
    </section>
  );
}
