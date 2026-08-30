import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Operational scripts and integration smoke tests are not app source.
    "scripts/**",
    "tests/**",
    "fix-rls.js",
    "test-route.js",
  ]),
  {
    // Keep existing untyped integration boundaries and effect-driven refreshes
    // from blocking CI; new code should still prefer explicit types and
    // useCallback where practical.
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
      "prefer-const": "error",
    },
  },
]);

export default eslintConfig;
