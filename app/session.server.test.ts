import { describe, expect, it } from "vitest";

import { loginRedirect } from "./session.server";

describe("loginRedirect", () => {
  it("preserves both the path and query string in redirectTo", () => {
    const url = new URL("https://example.com/join?token=abc123");

    const response = loginRedirect(url);

    expect(response.headers.get("Location")).toBe(
      "/login?redirectTo=%2Fjoin%3Ftoken%3Dabc123",
    );
  });

  it("omits a trailing query string when the original URL has none", () => {
    const url = new URL("https://example.com/communities");

    const response = loginRedirect(url);

    expect(response.headers.get("Location")).toBe(
      "/login?redirectTo=%2Fcommunities",
    );
  });
});
