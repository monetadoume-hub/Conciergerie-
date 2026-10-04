import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    env: { REVERIE_JOURNAL: "silencieux", REVERIE_LATENCE_SIMULEE_MS: "0" },
  },
});
