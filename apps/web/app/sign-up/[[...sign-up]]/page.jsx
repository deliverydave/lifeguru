"use client";

import { SignUp } from "@clerk/nextjs";
import { clerkEnabled, devAuthBypass } from "@/lib/config";

export default function SignUpPage() {
  if (!clerkEnabled()) {
    return (
      <section>
        <h1>Sign up</h1>
        {devAuthBypass() ? (
          <p>
            Clerk is not configured. Dev bypass is on — pick a person in the header and go to{" "}
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
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" afterSignUpUrl="/onboarding" />
    </section>
  );
}
