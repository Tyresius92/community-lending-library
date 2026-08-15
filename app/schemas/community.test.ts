import { describe, expect, it } from "vitest";

import { communityCreateSchema, communityJoinSchema } from "./community";

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }
  return formData;
}

function firstIssuePerField(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

const validEntries = {
  name: "Tool Library",
  slug: "tool-library",
  description: "",
  visibility: "public",
  joinPolicy: "open",
  displayName: "Me",
};

describe("communityCreateSchema", () => {
  it.each([
    { name: "a valid slug", slug: "tool-library", valid: true },
    { name: "a slug with digits", slug: "abc123", valid: true },
    { name: "an empty slug", slug: "", valid: false },
    { name: "a too-short slug", slug: "ab", valid: false },
    { name: "an uppercase slug", slug: "Has-Uppercase", valid: false },
    { name: "a leading-hyphen slug", slug: "-leading-hyphen", valid: false },
    { name: "a trailing-hyphen slug", slug: "trailing-hyphen-", valid: false },
    { name: "a double-hyphen slug", slug: "double--hyphen", valid: false },
    { name: "an underscore slug", slug: "has_underscore", valid: false },
  ] as const)("$valid for $name", ({ slug, valid }) => {
    const result = communityCreateSchema.safeParse(
      Object.fromEntries(buildFormData({ ...validEntries, slug })),
    );

    expect(result.success).toBe(valid);
  });

  it("rejects a missing/invalid visibility instead of defaulting", () => {
    const result = communityCreateSchema.safeParse(
      Object.fromEntries(
        buildFormData({ ...validEntries, visibility: "not-a-real-option" }),
      ),
    );

    const actualErrors = result.success
      ? {}
      : firstIssuePerField(result.error.issues);

    expect(result.success).toBe(false);
    expect(actualErrors).toEqual({ visibility: "VISIBILITY_INVALID" });
  });

  it("rejects a missing/invalid joinPolicy instead of defaulting", () => {
    const result = communityCreateSchema.safeParse(
      Object.fromEntries(
        buildFormData({ ...validEntries, joinPolicy: "not-a-real-option" }),
      ),
    );

    const actualErrors = result.success
      ? {}
      : firstIssuePerField(result.error.issues);

    expect(result.success).toBe(false);
    expect(actualErrors).toEqual({ joinPolicy: "JOIN_POLICY_INVALID" });
  });

  it("accepts fully valid input", () => {
    const result = communityCreateSchema.safeParse(
      Object.fromEntries(buildFormData(validEntries)),
    );

    expect(result.success).toBe(true);
  });
});

describe("communityJoinSchema", () => {
  it("rejects an empty displayName", () => {
    const result = communityJoinSchema.safeParse(
      Object.fromEntries(buildFormData({ displayName: "" })),
    );

    const actualErrors = result.success
      ? {}
      : firstIssuePerField(result.error.issues);

    expect(result.success).toBe(false);
    expect(actualErrors).toEqual({ displayName: "DISPLAY_NAME_REQUIRED" });
  });

  it("accepts a valid displayName", () => {
    const result = communityJoinSchema.safeParse(
      Object.fromEntries(buildFormData({ displayName: "Alex" })),
    );

    expect(result.success).toBe(true);
  });
});
