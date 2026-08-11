import type { Config } from "@react-router/dev/config";
import { sentryOnBuildEnd } from "@sentry/react-router";

export default {
  ssr: true,

  buildEnd: async ({
    viteConfig: viteConfig,
    reactRouterConfig: reactRouterConfig,
    buildManifest: buildManifest,
  }) => {
    await sentryOnBuildEnd({
      viteConfig,
      reactRouterConfig,
      buildManifest,
    });
  },
} satisfies Config;
