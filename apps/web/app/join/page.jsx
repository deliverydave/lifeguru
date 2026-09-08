"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useApi } from "@/lib/use-api";

function JoinInner() {
  const { call, auth } = useApi();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token && typeof sessionStorage !== "undefined") sessionStorage.setItem("m1_invite_token", token);
  }, [token]);

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
    if (!token) {
      setError("Missing invite token");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await call("/v1/me");
        if (!me.disclaimers.complete) {
          router.replace("/onboarding");
          return;
        }
        const looked = await call(`/v1/invites/lookup`, { method: "POST", body: { token } });
        if (!cancelled) setInfo(looked);
      } catch (err) {
        if (!cancelled) setError(err.message || "Invite is not valid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.isLoaded, auth.isSignedIn, auth.mode, auth.personId, call, router, token]);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      await call("/v1/invites/accept", { method: "POST", body: { token } });
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("m1_invite_token");
      router.push("/counselor");
    } catch (err) {
      setError(err.message || "Could not accept invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1>Join relationship</h1>
      <p>Accepting a one-time invite links you as the second member. Partner private counselor data is never shown.</p>
      {info && (
        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <p>
            Relationship <code>{info.relationship.relationshipId}</code> · {info.relationship.memberCount} member
            {info.relationship.memberCount === 1 ? "" : "s"} · status {info.relationship.status}
          </p>
          {info.isCreator ? (
            <p>This is your own invite. Sign in as the other person to join.</p>
          ) : (
            <button type="button" onClick={accept} disabled={busy || info.alreadyMember}>
              {info.alreadyMember ? "Already a member" : "Accept invite"}
            </button>
          )}
        </div>
      )}
      {error && <p style={{ color: "#8a1f1f" }}>{error}</p>}
    </section>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<p>Loading invite…</p>}>
      <JoinInner />
    </Suspense>
  );
}
