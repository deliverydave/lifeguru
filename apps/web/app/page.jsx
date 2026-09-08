"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppAuth } from "../lib/auth-context";

export default function HomePage() {
  const auth = useAppAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoaded) return;
    if (auth.mode === "none") {
      router.replace("/setup");
      return;
    }
    if (!auth.isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    router.replace("/onboarding");
  }, [auth, router]);

  return <p>Loading…</p>;
}
