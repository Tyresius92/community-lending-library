import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function expectNoAxeViolations(page: Page) {
  await expect(async () => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }).toPass({ timeout: 15_000 });
}
