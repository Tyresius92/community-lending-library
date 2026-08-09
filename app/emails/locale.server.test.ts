import { getEmailLocale } from "./locale.server";

test("getEmailLocale returns en", () => {
  expect(getEmailLocale()).toBe("en");
});
