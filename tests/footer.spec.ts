import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe";
import { loginAsNewUser } from "./helpers/session";

const SOURCE_CODE_URL =
  "https://github.com/Tyresius92/community-lending-library";

test("footer links to the source code when logged out", async ({ page }) => {
  await page.goto("/");

  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("link", { name: "Source code (AGPL-3.0)" }),
  ).toHaveAttribute("href", SOURCE_CODE_URL);

  await expectNoAxeViolations(page);
});

test("footer links to the source code when logged in", async ({ browser }) => {
  const email = `footer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAsNewUser(context, email);

  await page.goto("/communities");
  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("link", { name: "Source code (AGPL-3.0)" }),
  ).toHaveAttribute("href", SOURCE_CODE_URL);

  await expectNoAxeViolations(page);

  await context.close();
});
