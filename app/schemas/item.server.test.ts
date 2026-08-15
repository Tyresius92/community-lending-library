import { describe, expect, it } from "vitest";

import { itemCreateSchema, itemEditSchema } from "./item.server";

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

describe("itemCreateSchema", () => {
  it.each([
    {
      name: "rejects an empty name",
      entries: { name: "", description: "" },
      expectedErrors: { name: "NAME_REQUIRED" },
    },
    {
      name: "rejects a whitespace-only name",
      entries: { name: "   ", description: "" },
      expectedErrors: { name: "NAME_REQUIRED" },
    },
    {
      name: "accepts a name at exactly the max length",
      entries: { name: "a".repeat(100), description: "" },
      expectedErrors: {},
    },
    {
      name: "rejects a name over the max length",
      entries: { name: "a".repeat(101), description: "" },
      expectedErrors: { name: "NAME_TOO_LONG" },
    },
    {
      name: "accepts a description at exactly the max length",
      entries: { name: "Valid Name", description: "a".repeat(1000) },
      expectedErrors: {},
    },
    {
      name: "rejects a description over the max length",
      entries: { name: "Valid Name", description: "a".repeat(1001) },
      expectedErrors: { description: "DESCRIPTION_TOO_LONG" },
    },
    {
      name: "accepts valid input",
      entries: { name: "Cordless Drill", description: "18V, barely used" },
      expectedErrors: {},
    },
  ] as const)("$name", ({ entries, expectedErrors }) => {
    const result = itemCreateSchema.safeParse(
      Object.fromEntries(buildFormData(entries)),
    );

    const actualErrors = result.success
      ? {}
      : firstIssuePerField(result.error.issues);

    expect(result.success).toBe(Object.keys(expectedErrors).length === 0);
    expect(actualErrors).toEqual(expectedErrors);
  });
});

describe("itemEditSchema", () => {
  it("is the same schema as itemCreateSchema", () => {
    expect(itemEditSchema).toBe(itemCreateSchema);
  });
});
