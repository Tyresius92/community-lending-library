import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*", "**/*.test.{ts,tsx}"],
      serverModuleFormat: "cjs",
      future: {
        unstable_optimizeDeps: true,
      },
    }),
    tsconfigPaths(),
  ],
});
