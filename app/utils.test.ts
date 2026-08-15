import { suggestDisplayNameFromEmail } from "./utils";

test("suggestDisplayNameFromEmail takes the email local part", () => {
  expect(suggestDisplayNameFromEmail("kody@example.com")).toBe("kody");
});
