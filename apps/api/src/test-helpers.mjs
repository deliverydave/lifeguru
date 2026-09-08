import { REQUIRED_DISCLAIMERS } from "./constants.mjs";

export function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
        async close() {
          await new Promise((r) => server.close(r));
        },
      });
    });
  });
}

export async function json(url, { method = "GET", personId, token, body } = {}) {
  const headers = {};
  if (personId) headers["X-Person-Id"] = personId;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export async function acceptDisclaimersHttp(url, identity) {
  return json(`${url}/v1/disclaimers/accept`, {
    method: "POST",
    ...identity,
    body: { acceptances: REQUIRED_DISCLAIMERS },
  });
}
