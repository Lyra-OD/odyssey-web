import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Phase 6 — QA business (Freemium V1).
 * Tests d'intégration logique déterministes, sans infra (pas de Supabase/Stripe).
 * Alias `@/*` → racine projet (miroir de tsconfig.json paths).
 */
const rootDir = path.resolve(__dirname);

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${rootDir}/` }],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    reporters: "default",
  },
});
