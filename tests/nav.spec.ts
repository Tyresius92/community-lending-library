import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe";
import { loginAsNewUser } from "./helpers/session";

test("nav shows the site title linking home and a login link when logged out", async ({
  page,
}) => {
  await page.goto("/");

  const nav = page.getByRole("banner");
  await expect(
    nav.getByRole("link", { name: "Community Lending Library" }),
  ).toHaveAttribute("href", "/");
  await expect(nav.getByRole("link", { name: "Log in" })).toBeVisible();

  await expectNoAxeViolations(page);
});

test("nav shows the user's email and a logout button when logged in", async ({
  browser,
}) => {
  const email = `nav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAsNewUser(context, email);

  await page.goto("/");
  const nav = page.getByRole("banner");
  await expect(
    nav.getByRole("link", { name: "Community Lending Library" }),
  ).toHaveAttribute("href", "/");
  await expect(nav.getByText(email)).toBeVisible();
  await expect(nav.getByRole("button", { name: "Logout" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Log in" })).toHaveCount(0);

  await expectNoAxeViolations(page);

  await context.close();
});

test("logging out returns the nav to its logged-out state", async ({
  browser,
}) => {
  const email = `nav-logout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAsNewUser(context, email);

  await page.goto("/");
  const nav = page.getByRole("banner");
  await nav.getByRole("button", { name: "Logout" }).click();

  await expect(page).toHaveURL("/");
  await expect(nav.getByRole("link", { name: "Log in" })).toBeVisible();
  await expect(nav.getByText(email)).not.toBeVisible();

  await expectNoAxeViolations(page);

  await context.close();
});
