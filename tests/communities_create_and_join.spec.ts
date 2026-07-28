import { expect, test } from "@playwright/test";

import { loginAsNewUser } from "./helpers/session";

test("a user can create a community and another user can join it", async ({
  browser,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ownerEmail = `owner-${suffix}@example.com`;
  const joinerEmail = `joiner-${suffix}@example.com`;
  const slug = `test-community-${suffix}`;
  const communityName = `Test Community ${suffix}`;

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await loginAsNewUser(ownerContext, ownerEmail);

  await ownerPage.goto("/communities/new");
  await ownerPage.getByLabel("Name", { exact: true }).fill(communityName);
  await ownerPage.getByLabel("URL").fill(slug);
  await ownerPage.getByLabel(/Your display name/).fill("Owner Person");
  await ownerPage.getByRole("button", { name: "Create community" }).click();
  await expect(ownerPage).toHaveURL(`/communities/${slug}`);
  await expect(ownerPage.getByText("Owner Person (owner)")).toBeVisible();

  const joinerContext = await browser.newContext();
  const joinerPage = await joinerContext.newPage();
  await loginAsNewUser(joinerContext, joinerEmail);

  await joinerPage.goto("/communities");
  await joinerPage.getByRole("link", { name: communityName }).click();
  await expect(joinerPage).toHaveURL(`/communities/${slug}`);

  await joinerPage.getByLabel("Display name").fill("Joiner Person");
  await joinerPage.getByRole("button", { name: "Join community" }).click();
  await expect(
    joinerPage.getByText(/You.?re a member as Joiner Person/),
  ).toBeVisible();

  await ownerPage.reload();
  await expect(ownerPage.getByText("Joiner Person (member)")).toBeVisible();

  await ownerContext.close();
  await joinerContext.close();
});
