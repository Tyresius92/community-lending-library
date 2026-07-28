import { render, screen } from "@testing-library/react";
import { createRef } from "react";

import { TextInput } from "./text_input";

test("associates the label with the input", () => {
  render(<TextInput label="Name" name="name" type="text" />);
  expect(screen.getByLabelText("Name")).toBeInTheDocument();
});

test("shows hint text", () => {
  render(<TextInput label="Slug" name="slug" type="text" hintText="Lowercase only" />);
  expect(screen.getByText("Lowercase only")).toBeInTheDocument();
});

test("shows an error message and marks the input invalid", () => {
  render(<TextInput label="Name" name="name" type="text" errorMessage="Name is required" />);
  const input = screen.getByLabelText("Name");
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
});

test("is not marked invalid without an error message", () => {
  render(<TextInput label="Name" name="name" type="text" />);
  expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
});

test("forwards a ref to the input element", () => {
  const ref = createRef<HTMLInputElement>();
  render(<TextInput label="Name" name="name" type="text" ref={ref} />);
  expect(ref.current).toBeInstanceOf(HTMLInputElement);
});

test("is disabled when the disabled prop is set", () => {
  render(<TextInput label="Name" name="name" type="text" disabled />);
  expect(screen.getByLabelText("Name")).toBeDisabled();
});
