import { render, screen } from "@testing-library/react";

import { Checkbox } from "./checkbox";

test("associates the label with the checkbox", () => {
  render(<Checkbox label="Subscribe" name="subscribe" />);
  expect(screen.getByLabelText("Subscribe")).toHaveAttribute(
    "type",
    "checkbox",
  );
});

test("respects defaultChecked", () => {
  render(<Checkbox label="Subscribe" name="subscribe" defaultChecked />);
  expect(screen.getByLabelText("Subscribe")).toBeChecked();
});

test("is disabled when the disabled prop is set", () => {
  render(<Checkbox label="Subscribe" name="subscribe" disabled />);
  expect(screen.getByLabelText("Subscribe")).toBeDisabled();
});

test("is required when the required prop is set", () => {
  render(<Checkbox label="Subscribe" name="subscribe" required />);
  expect(screen.getByLabelText("Subscribe")).toBeRequired();
});
