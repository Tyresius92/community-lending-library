/// <reference types="vitest" />
/// <reference types="vite/client" />

import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import dotenv from "dotenv";
import invariant from "tiny-invariant";
import { defineConfig } from "vitest/config";

dotenv.config({ path: ".env.test", override: true });

invariant(
  process.env.DATABASE_POOLER_URL,
  "DATABASE_POOLER_URL must be set (check .env.test)",
);

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          globals: true,
          environment: "happy-dom",
          setupFiles: ["./test/setup-test-env.ts"],
          globalSetup: ["./test/db_global_setup.ts"],
          include: ["./app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
          env: {
            DATABASE_POOLER_URL: process.env.DATABASE_POOLER_URL,
          },
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: "chromium",
              },
            ],
          },
        },
      },
    ],
  },
});
