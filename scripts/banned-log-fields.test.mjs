import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { test } from "node:test";

const FORBIDDEN = ["message", "transcript", "summary_text"];
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "dist", ".git"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(mjs|js|ts|tsx)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function looksLikeForbiddenLog(text, field) {
  const markers = ["console.", "logger."];
  const key = field + ":";
  for (const m of markers) {
    let idx = 0;
    while ((idx = text.indexOf(m, idx)) !== -1) {
      const window = text.slice(idx, idx + 200);
      if (window.includes("{") && window.includes(key)) return true;
      idx += m.length;
    }
  }
  return false;
}

function violations(file) {
  const text = fs.readFileSync(file, "utf8");
  return FORBIDDEN.filter((field) => looksLikeForbiddenLog(text, field));
}

test("source tree does not log forbidden counseling fields", () => {
  const files = walk(ROOT);
  const bad = [];
  for (const file of files) {
    if (file.includes("log-field-guard.test.mjs")) continue;
    if (file.includes("banned-log-fields.test.mjs")) continue;
    const hits = violations(file);
    if (hits.length) bad.push({ file, hits });
  }
  assert.deepEqual(bad, [], JSON.stringify(bad, null, 2));
});

test("fixture detects a forbidden log field shape", () => {
  const sample = "logger.info({ transcript: secret });";
  assert.equal(looksLikeForbiddenLog(sample, "transcript"), true);
});
