import { describe, expect, it } from "vitest";

import { NonErrorThrown, toError } from "./error.server";

describe("toError", () => {
  it("returns the same Error when given an Error", () => {
    const original = new Error("something broke");

    expect(toError(original)).toBe(original);
  });

  it("returns the same instance for Error subclasses", () => {
    const original = new TypeError("bad type");

    expect(toError(original)).toBe(original);
  });

  it.each([
    { name: "a string", value: "yikes", message: "Non-error thrown: yikes" },
    { name: "a number", value: 42, message: "Non-error thrown: 42" },
    { name: "null", value: null, message: "Non-error thrown: null" },
    {
      name: "undefined",
      value: undefined,
      message: "Non-error thrown: undefined",
    },
    {
      name: "an object",
      value: { code: 500 },
      message: "Non-error thrown: [object Object]",
    },
  ])("wraps $name in NonErrorThrown", ({ value, message }) => {
    const result = toError(value);

    expect(result).toBeInstanceOf(NonErrorThrown);
    expect(result.message).toBe(message);
    expect(result).toHaveProperty("cause", value);
  });
});

describe("NonErrorThrown", () => {
  it("has the correct name", () => {
    const err = new NonErrorThrown("test");

    expect(err.name).toBe("NonErrorThrown");
  });

  it("is an instance of Error", () => {
    const err = new NonErrorThrown("test");

    expect(err).toBeInstanceOf(Error);
  });
});
