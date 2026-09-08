"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "../../lib/use-api";

export default function RelationshipPage() {
  const { call, auth } = useApi();
  const [me, setMe] = useState(null);
  const [invite, setInvite] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const data = await call("/v1/me");
    setMe(data);
    return data;
  }, [call]);

  useEffect(() => {
    if (!auth.isLoaded || !auth.isSignedIn) return;
    refresh().catch((err) => setError(err.message || "Could not load relationship"));
  }, [auth.isLoaded, auth.isSignedIn, auth.personId, refresh]);

  async function createRelationship() {
    setBusy(true);
    setError("");
    try {
      await call("/v1/relationships", { method: "POST", body: {} });
      await refresh();
    } catch (err) {
      setError(err.message || "Could not create relationship");
    } finally {
      setBusy(false);
    }
  }

  async function createInvite() {
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const data = await call("/v1/relationships/current/invites", { method: "POST", body: {} });
      setInvite(data.invite);
    } catch (err) {
      setError(err.message || "Could not create invite");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!invite || !invite.url) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
    } catch {
      setError("Copy failed — select the link and copy it manually.");
    }
  }

  if (me && !me.disclaimers.complete) {
    return (
      <section>
        <h1>Our Relationship</h1>
        <p>
          Accept the privacy and coaching disclaimers first. <a href="/onboarding">Go to onboarding</a>
        </p>
      </section>
    );
  }

  const rel = me && me.relationship;

  return (
    <section>
      <h1>Our Relationship</h1>
      <p>
        Joint goals, shared artifacts, and packs land in later milestones. No joint sessions in V1. Stripe
        billing is not enabled.
      </p>
      {!rel && (
        <p>
          <button type="button" onClick={createRelationship} disabled={busy}>
            Create relationship
          </button>
        </p>
      )}
      {rel && (
        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <p>
            You are in relationship <code>{rel.relationshipId}</code> ({rel.status}) with {rel.memberCount}{" "}
            member{rel.memberCount === 1 ? "" : "s"}. Partner private counselor data is not shown here.
          </p>
          <p>
            Your membership: <strong>{rel.yourMembership.status}</strong>
          </p>
          {rel.memberCount < 2 && (
            <p>
              <button type="button" onClick={createInvite} disabled={busy}>
                Generate invite link
              </button>
            </p>
          )}
        </div>
      )}
      {invite && (
        <p>
          Invite (one-time, expires {new Date(invite.expiresAt).toLocaleString()}):{" "}
          <code>{invite.url}</code>{" "}
          <button type="button" onClick={copyLink}>
            {copied ? "Copied" : "Copy invite link"}
          </button>
        </p>
      )}
      {error && <p style={{ color: "#8a1f1f" }}>{error}</p>}
    </section>
  );
}
