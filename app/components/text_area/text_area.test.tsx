import { render, screen } from "@testing-library/react";
import { createRef } from "react";

import { TextArea } from "./text_area";

test("associates the label with the textarea", () => {
  render(<TextArea label="Description" name="description" />);
  expect(screen.getByLabelText("Description")).toBeInTheDocument();
});

test("shows hint text", () => {
  render(<TextArea label="Description" name="description" hintText="Optional" />);
  expect(screen.getByText("Optional")).toBeInTheDocument();
});

test("shows an error message and marks the textarea invalid", () => {
  render(<TextArea label="Description" name="description" errorMessage="Too long" />);
  expect(screen.getByLabelText("Description")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("alert")).toHaveTextContent("Too long");
});

test("forwards a ref to the textarea element", () => {
  const ref = createRef<HTMLTextAreaElement>();
  render(<TextArea label="Description" name="description" ref={ref} />);
  expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
});

test("forwards the rows prop", () => {
  render(<TextArea label="Description" name="description" rows={4} />);
  expect(screen.getByLabelText("Description")).toHaveAttribute("rows", "4");
});
