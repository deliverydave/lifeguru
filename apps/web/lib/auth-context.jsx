"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { authMode } from "@/lib/config";

const AuthContext = createContext(null);
const BYPASS_KEY = "m1_dev_person";

export function useAppAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      mode: "none",
      isLoaded: true,
      isSignedIn: false,
      personId: null,
      setPersonId: () => {},
      getToken: async () => null,
    };
  }
  return ctx;
}

export function ClerkAuthBridge({ children }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const value = useMemo(
    () => ({
      mode: "clerk",
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      personId: null,
      setPersonId: () => {},
      getToken: async () => {
        try {
          return (await getToken()) || null;
        } catch {
          return null;
        }
      },
    }),
    [getToken, isLoaded, isSignedIn],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function BypassAuthBridge({ children }) {
  const [personId, setPersonIdState] = useState("person_a");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(BYPASS_KEY) : null;
    if (saved) setPersonIdState(saved);
    setReady(true);
  }, []);

  const setPersonId = useCallback((id) => {
    setPersonIdState(id);
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(BYPASS_KEY, id);
  }, []);

  const value = useMemo(
    () => ({
      mode: "bypass",
      isLoaded: ready,
      isSignedIn: true,
      personId,
      setPersonId,
      getToken: async () => null,
    }),
    [personId, ready, setPersonId],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function NoneAuthBridge({ children }) {
  const value = useMemo(
    () => ({
      mode: authMode(),
      isLoaded: true,
      isSignedIn: false,
      personId: null,
      setPersonId: () => {},
      getToken: async () => null,
    }),
    [],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
