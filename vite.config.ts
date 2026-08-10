import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { sentryReactRouter } from "@sentry/react-router";

export default defineConfig((config) => ({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    !process.env.STORYBOOK && reactRouter(),
    sentryReactRouter(
      {
        org: "tyrel",
        project: "community-lending-library",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
      config,
    ),
  ].filter(Boolean),
  optimizeDeps: {
    exclude: ["@sentry/react-router"],
  },
}));
