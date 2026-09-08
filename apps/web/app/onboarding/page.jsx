"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/use-api";

export default function OnboardingPage() {
  const { call, auth } = useApi();
  const router = useRouter();
  const [catalog, setCatalog] = useState(null);
  const [me, setMe] = useState(null);
  const [privacy, setPrivacy] = useState(false);
  const [coaching, setCoaching] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    let cancelled = false;
    (async () => {
      try {
        const [c, m] = await Promise.all([call("/v1/disclaimers"), call("/v1/me")]);
        if (cancelled) return;
        setCatalog(c);
        setMe(m);
        if (m.disclaimers && m.disclaimers.complete) {
          const pending =
            typeof sessionStorage !== "undefined" ? sessionStorage.getItem("m1_invite_token") : null;
          if (pending) router.replace(`/join?token=${encodeURIComponent(pending)}`);
          else if (m.relationship) router.replace("/counselor");
          else router.replace("/relationship");
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load disclaimers. Is the API running?");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.isLoaded, auth.isSignedIn, auth.mode, auth.personId, call, router]);

  async function submit(e) {
    e.preventDefault();
    if (!catalog || busy) return;
    setBusy(true);
    setError("");
    try {
      const versions = catalog.versions;
      await call("/v1/disclaimers/accept", {
        method: "POST",
        body: {
          acceptances: [
            { key: "privacy-explainer", version: versions["privacy-explainer"] },
            { key: "coaching-not-therapy", version: versions["coaching-not-therapy"] },
          ],
        },
      });
      const pending = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("m1_invite_token") : null;
      if (pending) router.push(`/join?token=${encodeURIComponent(pending)}`);
      else router.push("/relationship");
    } catch (err) {
      setError(err.message || "Could not record acceptances");
    } finally {
      setBusy(false);
    }
  }

  const copy = catalog && catalog.copy;

  return (
    <section>
      <h1>Before you start</h1>
      <p>Two gates are required before My Counselor: a privacy explainer and a coaching-not-therapy disclaimer.</p>
      {me && me.disclaimers && me.disclaimers.complete && <p>You have already accepted the current versions.</p>}
      <form onSubmit={submit}>
        <fieldset style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, margin: "12px 0", background: "#fff" }}>
          <legend>
            <strong>{copy ? copy["privacy-explainer"].title : "Privacy explainer"}</strong>
          </legend>
          <p>{copy ? copy["privacy-explainer"].body : "Loading…"}</p>
          <label>
            <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /> I understand
            my counselor is private and the default share decision is Keep private.
          </label>
        </fieldset>
        <fieldset style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, margin: "12px 0", background: "#fff6d8" }}>
          <legend>
            <strong>{copy ? copy["coaching-not-therapy"].title : "Coaching, not therapy"}</strong>
          </legend>
          <p>{copy ? copy["coaching-not-therapy"].body : "Loading…"}</p>
          <label>
            <input type="checkbox" checked={coaching} onChange={(e) => setCoaching(e.target.checked)} /> I understand
            this is AI coaching, not therapy, and not emergency care.
          </label>
        </fieldset>
        <button type="submit" disabled={busy || !privacy || !coaching || !catalog}>
          Accept and continue
        </button>
      </form>
      {error && <p style={{ color: "#8a1f1f" }}>{error}</p>}
    </section>
  );
}
