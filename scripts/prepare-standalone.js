// Cross-platform: copy .next/static and public into .next/standalone
// so the production server can serve static chunks and PWA assets.
const fs = require("fs");
const path = require("path");

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

const root = path.resolve(__dirname, "..");
const staticDir = path.join(root, ".next", "static");
const standaloneNext = path.join(root, ".next", "standalone", ".next");
const publicDir = path.join(root, "public");
const standalonePublic = path.join(root, ".next", "standalone", "public");

if (!fs.existsSync(staticDir)) {
  console.error("ERROR: .next/static not found — run `npm run build` first.");
  process.exit(1);
}
fs.mkdirSync(standaloneNext, { recursive: true });
copyDirRecursive(staticDir, path.join(standaloneNext, "static"));
if (fs.existsSync(publicDir)) copyDirRecursive(publicDir, standalonePublic);
console.log("standalone ready");
