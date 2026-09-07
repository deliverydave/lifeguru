import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status || 1);
}

run("node", ["--test", "packages/context-builders/src/allowlist.test.mjs"]);
run("node", ["--test", "scripts/banned-log-fields.test.mjs"]);
console.log("all week-0 tests passed");
