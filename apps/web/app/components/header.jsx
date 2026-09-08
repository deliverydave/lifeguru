"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useAppAuth } from "@/lib/auth-context";
import { clerkEnabled } from "@/lib/config";

const nav = [
  { href: "/counselor", label: "My Counselor" },
  { href: "/relationship", label: "Our Relationship" },
  { href: "/data", label: "My Data" },
];

export default function Header() {
  const auth = useAppAuth();

  return (
    <header style={{ borderBottom: "1px solid #ddd", padding: "12px 16px", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <strong>Couples Coach</strong>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {clerkEnabled() ? (
            <>
              <SignedOut>
                <a href="/sign-in" style={{ color: "#1a4d6d" }}>
                  Sign in
                </a>
                <a href="/sign-up" style={{ color: "#1a4d6d" }}>
                  Sign up
                </a>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </>
          ) : auth.mode === "bypass" ? (
            <label style={{ fontSize: 13 }}>
              Dev person{" "}
              <select value={auth.personId || "person_a"} onChange={(e) => auth.setPersonId(e.target.value)}>
                <option value="person_a">person_a</option>
                <option value="person_b">person_b</option>
              </select>
            </label>
          ) : null}
        </div>
      </div>
      <nav style={{ display: "flex", gap: 16, marginTop: 8 }}>
        {nav.map((item) => (
          <a key={item.href} href={item.href} style={{ color: "#1a4d6d" }}>
            {item.label}
          </a>
        ))}
      </nav>
      {auth.mode === "bypass" && (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#8a5a00" }}>
          NEXT_PUBLIC_DEV_AUTH_BYPASS is on (tests/local only). Switch identities to demo two humans. Do not
          enable in production.
        </p>
      )}
    </header>
  );
}
