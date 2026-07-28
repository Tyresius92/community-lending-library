import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { Button } from "./button";

test("renders its children", () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
});

test("defaults to the primary variant", () => {
  render(<Button>Submit</Button>);
  expect(screen.getByRole("button")).toHaveAttribute("data-variant", "primary");
});

test("applies the secondary variant", () => {
  render(<Button variant="secondary">Cancel</Button>);
  expect(screen.getByRole("button")).toHaveAttribute("data-variant", "secondary");
});

test("is disabled when the disabled prop is set", () => {
  render(<Button disabled>Submit</Button>);
  expect(screen.getByRole("button")).toBeDisabled();
});

test("calls onClick when clicked", () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click</Button>);
  fireEvent.click(screen.getByRole("button"));
  expect(handleClick).toHaveBeenCalledOnce();
});

test("forwards the type prop", () => {
  render(<Button type="submit">Submit</Button>);
  expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
});

test("forwards the aria-describedby prop", () => {
  render(<Button aria-describedby="hint-id">Submit</Button>);
  expect(screen.getByRole("button")).toHaveAttribute("aria-describedby", "hint-id");
});
