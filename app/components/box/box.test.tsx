import { render, screen } from "@testing-library/react";

import { Box } from "./box";

test("renders a div by default", () => {
  render(<Box>content</Box>);
  const el = screen.getByText("content");
  expect(el.tagName).toBe("DIV");
});

test("renders the tag given by the is prop", () => {
  render(<Box is="section">content</Box>);
  const el = screen.getByText("content");
  expect(el.tagName).toBe("SECTION");
});

test("forwards id and role", () => {
  render(
    <Box id="my-box" role="group">
      content
    </Box>,
  );
  const el = screen.getByRole("group");
  expect(el).toHaveAttribute("id", "my-box");
});
