"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/use-api";

function sessionKey(personKey) {
  return `m1_session_${personKey}`;
}

function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CounselorPage() {
  const { call, auth } = useApi();
  const [me, setMe] = useState(null);
  const [session, setSession] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [now, setNow] = useState(Date.now());
  const listRef = useRef(null);
  const identityKey = auth.mode === "bypass" ? auth.personId : "clerk";

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [session]);

  const startSession = useCallback(async () => {
    setBusy(true);
    setError("");
    setShareNote("");
    try {
      const created = await call("/v1/sessions", { method: "POST", body: {} });
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(sessionKey(identityKey), created.sessionId);
      }
      setSession(created);
    } catch (err) {
      setError(err.message || "Could not start session. Is the API running on port 3001?");
    } finally {
      setBusy(false);
    }
  }, [call, identityKey]);

  useEffect(() => {
    if (!auth.isLoaded || !auth.isSignedIn) return;
    let cancelled = false;
    async function boot() {
      setBusy(true);
      setError("");
      setShareNote("");
      setSession(null);
      try {
        const profile = await call("/v1/me");
        if (cancelled) return;
        setMe(profile);
        if (!profile.disclaimers.complete || !profile.relationship) return;
        const saved =
          typeof sessionStorage !== "undefined" ? sessionStorage.getItem(sessionKey(identityKey)) : null;
        if (saved) {
          try {
            const existing = await call(`/v1/sessions/${saved}`);
            if (!cancelled) setSession(existing);
            return;
          } catch {
            if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(sessionKey(identityKey));
          }
        }
        if (!cancelled) await startSession();
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not start session. Is the API running on port 3001?");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [auth.isLoaded, auth.isSignedIn, auth.personId, call, identityKey, startSession]);

  const elapsedMs = useMemo(() => {
    if (!session) return 0;
    const base = session.timer ? session.timer.elapsedMs : 0;
    const stamp = session.updatedAt ? Date.parse(session.updatedAt) : Date.now();
    return base + Math.max(0, now - stamp);
  }, [session, now]);

  async function sendTurn(e) {
    e.preventDefault();
    if (!session || !draft.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await call(`/v1/sessions/${session.sessionId}/turns`, {
        method: "POST",
        body: { text: draft.trim() },
      });
      setSession(next);
      setDraft("");
    } catch (err) {
      setError(err.message || "Turn failed");
    } finally {
      setBusy(false);
    }
  }

  async function advance() {
    if (!session || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await call(`/v1/sessions/${session.sessionId}/advance`, {
        method: "POST",
        body: { event: "advance" },
      });
      setSession(next);
    } catch (err) {
      setError(err.message || "Advance failed");
    } finally {
      setBusy(false);
    }
  }

  async function shareStub() {
    if (!session || busy) return;
    try {
      const result = await call(`/v1/sessions/${session.sessionId}/share`, { method: "POST", body: {} });
      setShareNote(`${result.note} Decision remains ${result.decision}.`);
    } catch (err) {
      setError(err.message || "Share stub failed");
    }
  }

  const stage = session ? session.stage : "…";
  const overtime = session && session.timer && session.timer.overtime;
  const rel = me && me.relationship;

  if (me && !me.disclaimers.complete) {
    return (
      <section>
        <h1>My Counselor</h1>
        <p>
          Accept the privacy explainer and coaching-not-therapy disclaimer first.{" "}
          <a href="/onboarding">Go to onboarding</a>
        </p>
      </section>
    );
  }

  if (me && !rel) {
    return (
      <section>
        <h1>My Counselor</h1>
        <p style={{ background: "#fff6d8", border: "1px solid #e6d48a", padding: "10px 12px", borderRadius: 8 }}>
          Reminder: this is AI coaching, not therapy. If you are in immediate danger, contact local emergency
          services.
        </p>
        <p>
          Create or join a relationship before starting a private session.{" "}
          <a href="/relationship">Our Relationship</a> · <a href="/join">Have an invite?</a>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1 style={{ marginBottom: 8 }}>My Counselor</h1>
      <p style={{ background: "#fff6d8", border: "1px solid #e6d48a", padding: "10px 12px", borderRadius: 8 }}>
        Reminder: this is AI coaching, not therapy. If you are in immediate danger, contact local emergency
        services.
      </p>

      {rel && (
        <p style={{ background: "#fff", border: "1px solid #ddd", padding: "10px 12px", borderRadius: 8 }}>
          You are in relationship <code>{rel.relationshipId}</code> ({rel.status}, {rel.memberCount} member
          {rel.memberCount === 1 ? "" : "s"}). Partner private data never appears here.
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", margin: "12px 0" }}>
        <span>
          Stage: <strong>{stage}</strong>
        </span>
        <span>
          Timer: {formatMs(elapsedMs)} / 20:00 {overtime ? "(soft overtime — no mid-turn kill)" : ""}
        </span>
      </div>

      <p style={{ color: "#555", fontSize: 14 }}>
        Private session. Partner data never enters this counselor context. Default share decision:{" "}
        <strong>Keep private</strong>.
      </p>

      <div
        ref={listRef}
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 8,
          minHeight: 280,
          maxHeight: 420,
          overflow: "auto",
          padding: 12,
        }}
      >
        {(session && session.turns ? session.turns : []).map((t) => (
          <div
            key={t.turnId}
            style={{
              margin: "8px 0",
              textAlign: t.role === "user" ? "right" : "left",
            }}
          >
            <div
              style={{
                display: "inline-block",
                maxWidth: "85%",
                padding: "8px 10px",
                borderRadius: 10,
                background: t.role === "user" ? "#d7e8f5" : "#eef3ee",
              }}
            >
              <small style={{ color: "#666" }}>
                {t.role === "user" ? "You" : "Counselor"} · {t.stage}
              </small>
              <div>{t.text}</div>
            </div>
          </div>
        ))}
        {!session && !error && rel && <p>Starting a private session…</p>}
      </div>

      <form onSubmit={sendTurn} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a private turn…"
          disabled={busy || !session || stage === "END"}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button type="submit" disabled={busy || !session || !draft.trim() || stage === "END"}>
          Send
        </button>
      </form>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <button type="button" onClick={advance} disabled={busy || !session || stage === "END"}>
          Next stage
        </button>
        <button type="button" onClick={() => startSession()} disabled={busy || !rel}>
          New session
        </button>
        <button type="button" onClick={shareStub} disabled={!session}>
          Share with partner (stub)
        </button>
      </div>
      {shareNote && <p style={{ color: "#3a5a3a" }}>{shareNote}</p>}
      {error && <p style={{ color: "#8a1f1f" }}>{error}</p>}
    </section>
  );
}
