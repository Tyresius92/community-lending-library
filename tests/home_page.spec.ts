import { test, expect } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe";

test("home page loads for an unauthenticated user", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("main").getByRole("heading", {
      name: "Community Lending Library",
    }),
  ).toBeVisible();

  await expectNoAxeViolations(page);
});
