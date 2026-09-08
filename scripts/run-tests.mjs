import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status || 1);
}

run("node", [
  "--test",
  "packages/context-builders/src/allowlist.test.mjs",
  "packages/context-builders/src/builder.test.mjs",
  "packages/session-orchestrator/src/index.test.mjs",
  "packages/mock-counselor/src/index.test.mjs",
  "packages/mock-counselor/src/prompt.test.mjs",
  "packages/mock-counselor/src/anthropic.test.mjs",
  "apps/api/src/sessions.test.mjs",
  "apps/api/src/auth.test.mjs",
  "apps/api/src/invites.test.mjs",
  "apps/api/src/scoping.test.mjs",
  "scripts/banned-log-fields.test.mjs",
]);
console.log("all tests passed");
