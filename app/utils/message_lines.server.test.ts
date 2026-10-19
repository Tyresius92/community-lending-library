import { describe, expect, it } from "vitest";

import { splitIntoLines } from "./message_lines.server";

describe("splitIntoLines", () => {
  it.each([
    {
      name: "returns one line for a body with no newlines",
      body: "hello",
      expected: [{ offset: 0, text: "hello" }],
    },
    {
      name: "splits on newlines with each line's character offset",
      body: "ab\ncde\nf",
      expected: [
        { offset: 0, text: "ab" },
        { offset: 3, text: "cde" },
        { offset: 7, text: "f" },
      ],
    },
    {
      name: "keeps blank lines with distinct offsets",
      body: "a\n\nb",
      expected: [
        { offset: 0, text: "a" },
        { offset: 2, text: "" },
        { offset: 3, text: "b" },
      ],
    },
    {
      name: "treats CRLF as a single line break",
      body: "ab\r\ncd",
      expected: [
        { offset: 0, text: "ab" },
        { offset: 4, text: "cd" },
      ],
    },
  ])("$name", ({ body, expected }) => {
    expect(splitIntoLines(body)).toEqual(expected);
  });
});
