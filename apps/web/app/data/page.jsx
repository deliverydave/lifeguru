"use client";

import { useEffect, useState } from "react";
import { useApi } from "../../lib/use-api";

export default function DataPage() {
  const { call, auth } = useApi();
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.isLoaded || !auth.isSignedIn) return;
    call("/v1/me")
      .then(setMe)
      .catch((err) => setError(err.message || "Could not load your data"));
  }, [auth.isLoaded, auth.isSignedIn, auth.personId, call]);

  return (
    <section>
      <h1>My Data</h1>
      <p>View, correct, delete memories; revoke abstracts; leave relationship; export — later milestones.</p>
      <p style={{ color: "#555" }}>
        M1 stub — privacy controls stay owner-scoped. Your opaque <code>person_id</code> is derived from Clerk
        (or the test bypass), never from a client-supplied id on the live path.
      </p>
      {me && (
        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <p>
            person_id: <code>{me.personId}</code>
          </p>
          <p>
            Disclaimers: {me.disclaimers.complete ? "accepted" : "incomplete"}
            {me.disclaimers.acceptances.map((a) => (
              <span key={a.key}>
                {" "}
                · {a.key} {a.version} at {a.acceptedAt}
              </span>
            ))}
          </p>
          <p>
            Relationship:{" "}
            {me.relationship ? (
              <code>{me.relationship.relationshipId}</code>
            ) : (
              "none — create or join from Our Relationship"
            )}
          </p>
          <p>Billing: {me.billing && me.billing.enabled ? "on" : "Stripe stub (off)"}</p>
        </div>
      )}
      {error && <p style={{ color: "#8a1f1f" }}>{error}</p>}
      <p>
        <a href="/counselor">Back to My Counselor</a>
      </p>
    </section>
  );
}
