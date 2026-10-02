import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/server/**",
        "src/db/migrations/**",
        "src/db/seeds/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@hosmos/types": resolve(__dirname, "../packages/types/src/index.ts"),
    },
  },
});
