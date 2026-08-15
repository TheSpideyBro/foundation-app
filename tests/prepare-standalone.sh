#!/bin/bash
# Prepares the Next.js standalone output so it can serve the full app
# (static assets + public files) for the verification test suite.
#
# Run from the project root AFTER `npm run build`:
#   ./tests/prepare-standalone.sh
# Then start the server and run the tests:
#   PORT=3001 node .next/standalone/server.js &
#   node tests/verify-fixes.js
#
# Or simply: npm run test:verify

set -e
cd "$(dirname "$0")/.."

if [ ! -d ".next/standalone" ]; then
  echo "Error: .next/standalone not found. Run 'npm run build' first."
  exit 1
fi

# Copy public assets into the standalone output
cp -r public .next/standalone/ 2>/dev/null || true
# Copy the generated static build assets
rm -rf .next/standalone/.next/static 2>/dev/null || true
cp -r .next/static .next/standalone/.next/

echo "Standalone output prepared: .next/standalone/"
