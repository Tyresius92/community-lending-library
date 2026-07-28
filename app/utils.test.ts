import { suggestDisplayNameFromEmail, validateEmail, validateSlug } from "./utils";

test("validateEmail returns false for non-emails", () => {
  expect(validateEmail(undefined)).toBe(false);
  expect(validateEmail(null)).toBe(false);
  expect(validateEmail("")).toBe(false);
  expect(validateEmail("not-an-email")).toBe(false);
  expect(validateEmail("n@")).toBe(false);
});

test("validateEmail returns true for emails", () => {
  expect(validateEmail("kody@example.com")).toBe(true);
});

test("validateSlug returns false for invalid slugs", () => {
  expect(validateSlug(undefined)).toBe(false);
  expect(validateSlug("")).toBe(false);
  expect(validateSlug("ab")).toBe(false);
  expect(validateSlug("Has-Uppercase")).toBe(false);
  expect(validateSlug("-leading-hyphen")).toBe(false);
  expect(validateSlug("trailing-hyphen-")).toBe(false);
  expect(validateSlug("double--hyphen")).toBe(false);
  expect(validateSlug("has_underscore")).toBe(false);
});

test("validateSlug returns true for valid slugs", () => {
  expect(validateSlug("tool-library")).toBe(true);
  expect(validateSlug("abc123")).toBe(true);
});

test("suggestDisplayNameFromEmail takes the email local part", () => {
  expect(suggestDisplayNameFromEmail("kody@example.com")).toBe("kody");
});
