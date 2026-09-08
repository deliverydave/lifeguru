"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import { useAppAuth } from "@/lib/auth-context";

export function useApi() {
  const auth = useAppAuth();

  const call = useCallback(
    async (path, options = {}) => {
      const token = await auth.getToken();
      const personId = auth.mode === "bypass" ? auth.personId : undefined;
      return api(path, { ...options, token, personId });
    },
    [auth.getToken, auth.mode, auth.personId],
  );

  return { call, auth };
}
