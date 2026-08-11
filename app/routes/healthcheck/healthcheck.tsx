// learn more: https://fly.io/docs/reference/configuration/#services-http_checks
import type { LoaderFunctionArgs } from "react-router";

import { logger } from "~/logger";
import { toError } from "~/utils/error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const host =
    request.headers.get("X-Forwarded-Host") ?? request.headers.get("host");

  try {
    const url = new URL("/", `http://${host}`);

    const response = await fetch(url.toString(), { method: "HEAD" });
    if (!response.ok) {
      throw new Error(
        `healthcheck fetch failed with status ${response.status}`,
      );
    }
    return new Response("OK");
  } catch (error: unknown) {
    logger.error(toError(error), { context: "healthcheck" });
    return new Response("ERROR", { status: 500 });
  }
};
