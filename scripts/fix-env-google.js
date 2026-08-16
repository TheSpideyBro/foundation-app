// Normalizes GOOGLE_* vars in .env.local into properly double-quoted values.
// Source of truth (in order):
//   1. A fresh service-account JSON key passed as CLI arg:
//        node scripts/fix-env-google.js path/to/service-account.json
//   2. The verified-good copy at .next/standalone/.env.local (already parsed OK)
//   3. The current .env.local (with automatic repair of mangled values)
// Usage: node scripts/fix-env-google.js [path/to/service-account.json]
const fs = require("fs");
const dotenv = require("dotenv");

const projDir = "/home/ubuntu/foundation-fund-app";
const envPath = `${projDir}/.env.local`;
const keyFilePath = process.argv[2];

function unwrapAny(raw) {
  let kv0 = raw;
  for (let i = 0; i < 8; i++) {
    try {
      const u = JSON.parse(kv0);
      if (typeof u === "string") { kv0 = u; continue; }
      if (u && typeof u === "object") return u; // found the object
      return null;
    } catch {}
    // Fix literal-backslash-escaped quotes: {\"type\":...}
    if (typeof kv0 === "string" && kv0.includes('\\"')) {
      kv0 = kv0.replace(/\\"/g, '"');
      continue;
    }
    break;
  }
  // Final attempt
  try { return JSON.parse(kv0); } catch { return null; }
}

let keyObj, sheetId;

if (keyFilePath) {
  keyObj = JSON.parse(fs.readFileSync(keyFilePath, "utf8").trim());
  const m = fs.readFileSync(keyFilePath, "utf8").match(/GOOGLE_SHEET_ID[=: ]*["']?([\w-]{30,})["']?/);
  sheetId = m ? m[1] : null;
} else if (fs.existsSync(`${projDir}/.next/standalone/.env.local`)) {
  const parsed = dotenv.parse(fs.readFileSync(`${projDir}/.next/standalone/.env.local`, "utf8"));
  keyObj = JSON.parse(parsed.GOOGLE_SERVICE_ACCOUNT_JSON);
  sheetId = parsed.GOOGLE_SHEET_ID;
  console.log("using verified-good value from .next/standalone/.env.local");
} else {
  const parsed = dotenv.parse(fs.readFileSync(envPath, "utf8"));
  keyObj = unwrapAny(parsed.GOOGLE_SERVICE_ACCOUNT_JSON);
  sheetId = parsed.GOOGLE_SHEET_ID;
  if (!keyObj) {
    console.error("Cannot recover a valid service account key. Pass a fresh JSON key file as the first argument.");
    process.exit(1);
  }
  console.log("repaired key from current .env.local:", keyObj.client_email);
}

if (!sheetId) {
  console.error("GOOGLE_SHEET_ID not found — set it manually in .env.local after fixing.");
  process.exit(1);
}

const base = fs
  .readFileSync(envPath, "utf8")
  .split("\n")
  .filter((l) => l.trim() && !l.startsWith("GOOGLE_"))
  .join("\n");

const envContent =
  base.trimEnd() +
  "\n" +
  // Unquoted raw JSON is the format dotenv (and most loaders) parse reliably;
  // template interpolation embeds the JS string verbatim (no extra escaping).
  `GOOGLE_SERVICE_ACCOUNT_JSON=${JSON.stringify(keyObj)}\n` +
  `GOOGLE_SHEET_ID=${JSON.stringify(sheetId)}\n`;

fs.writeFileSync(envPath, envContent);
console.log("fixed .env.local");

const reparsed = dotenv.parse(fs.readFileSync(envPath, "utf8"));
const sa = JSON.parse(reparsed.GOOGLE_SERVICE_ACCOUNT_JSON);
if (!sa.client_email || !sa.private_key) throw new Error("final verify failed");
console.log("verify parse OK:", sa.client_email, "|", reparsed.GOOGLE_SHEET_ID);
