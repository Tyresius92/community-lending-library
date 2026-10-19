import { describe, expect, it } from "vitest";

import {
  BODY_MAX_LENGTH,
  isMessageErrorCode,
  messageCreateSchema,
} from "./message";

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }
  return formData;
}

describe("messageCreateSchema", () => {
  it.each([
    {
      name: "rejects an empty body",
      entries: { body: "" },
      expectedCode: "BODY_REQUIRED",
    },
    {
      name: "rejects a whitespace-only body",
      entries: { body: "  \n  " },
      expectedCode: "BODY_REQUIRED",
    },
    {
      name: "accepts a body at exactly the max length",
      entries: { body: "a".repeat(BODY_MAX_LENGTH) },
      expectedCode: null,
    },
    {
      name: "rejects a body over the max length",
      entries: { body: "a".repeat(BODY_MAX_LENGTH + 1) },
      expectedCode: "BODY_TOO_LONG",
    },
    {
      name: "accepts a valid body",
      entries: { body: "Someone has this until Tuesday, want to wait?" },
      expectedCode: null,
    },
  ] as const)("$name", ({ entries, expectedCode }) => {
    const result = messageCreateSchema.safeParse(
      Object.fromEntries(buildFormData({ intent: "send_message", ...entries })),
    );

    const actualCode = result.success ? null : result.error.issues[0]?.message;

    expect(result.success).toBe(expectedCode === null);
    expect(actualCode).toBe(expectedCode);
  });

  it("trims surrounding whitespace from the body", () => {
    const result = messageCreateSchema.safeParse({ body: "  hello\nthere  " });

    expect(result.success && result.data.body).toBe("hello\nthere");
  });
});

describe("isMessageErrorCode", () => {
  it.each([
    { name: "accepts BODY_REQUIRED", value: "BODY_REQUIRED", expected: true },
    { name: "accepts BODY_TOO_LONG", value: "BODY_TOO_LONG", expected: true },
    {
      name: "rejects an unknown code",
      value: "NAME_REQUIRED",
      expected: false,
    },
  ] as const)("$name", ({ value, expected }) => {
    expect(isMessageErrorCode(value)).toBe(expected);
  });
});
