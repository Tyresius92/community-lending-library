import { test, expect } from "@playwright/test";

test("home page loads for an unauthenticated user", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("main").getByRole("link", { name: /log in/i }),
  ).toBeVisible();
});
