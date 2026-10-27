import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests cover the plain TypeScript in src/lib (no React Native).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
