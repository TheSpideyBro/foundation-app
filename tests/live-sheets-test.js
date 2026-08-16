// Live test: exercise lib/sheets-sync.ts with the user's real .env values.
// Run from project root: node tests/live-sheets-test.js
// Reads /home/ubuntu/test-env/.env.local.test manually (multiline values supported).
const fs = require("fs");
const path = require("path");

const envPath = "/home/ubuntu/test-env/.env.local.test";
const projEnv = "/home/ubuntu/foundation-fund-app/.env.local";
for (const f of [projEnv, envPath]) {
  const raw = fs.readFileSync(f, "utf8");
  const merged = raw.replace(/=([^"'])([^]*?)(?=\n[A-Z])/g, (m, q, v) => {
    return "=" + JSON.stringify(v);
  });
  for (const ln of merged.split("\n")) {
    const eq = ln.indexOf("=");
    if (eq < 0 || ln.startsWith("#")) continue;
    const k = ln.slice(0, eq);
    let v = ln.slice(eq + 1);
    if (v.startsWith('"')) {
      try { v = JSON.parse(v); } catch {}
    }
    process.env[k] = v;
  }
}

const lib = require(path.resolve(process.cwd(), ".next/standalone/.next/server/chunks/app/api/sync-sheets/route") || "");
// simpler: just import the sync lib source via ts-node? Use @swc/register if available; else require from built output
let sheets;
const built = fs.readdirSync(".next/standalone/.next/server").join ? null : null;
try {
  sheets = require(path.resolve(process.cwd(), "node_modules/@swc/register"));
} catch {}
if (!sheets) {
  // fall back to transpiling inline with esbuild? Use tsx loader
  console.log("NOTE: using tsx loader for TS source");
}
