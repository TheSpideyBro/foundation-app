// Runs lib/sheets-sync.ts fullSync() with the real .env values.
const dotenv = require("dotenv");
const envFile = "/home/ubuntu/foundation-fund-app/.env.local";
const parsed = dotenv.parse(require("fs").readFileSync(envFile, "utf8"));
Object.assign(process.env, parsed);
process.env.NODE_ENV = "production";

require("esbuild-register");
const { getSheetsConfig, fullSync } = require(
  require("path").resolve(process.cwd(), "lib/sheets-sync.ts")
);

(async () => {
  const cfg = getSheetsConfig();
  if (!cfg) {
    console.log("config missing");
    process.exit(1);
  }
  console.log("config sheetId:", cfg.sheetId);
  try {
    const res = await fullSync(cfg);
    console.log("FULLSYNC OK:", JSON.stringify(res));
  } catch (e) {
    console.log("FULLSYNC ERROR:", e.message);
    process.exit(1);
  }
})();
