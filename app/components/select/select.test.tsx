import { render, screen } from "@testing-library/react";

import { Select } from "./select";

const options = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
];

test("associates the label with the select", () => {
  render(<Select label="Choice" name="choice" options={options} />);
  expect(screen.getByLabelText("Choice")).toBeInTheDocument();
});

test("renders each option plus a placeholder", () => {
  render(<Select label="Choice" name="choice" options={options} />);
  expect(screen.getAllByRole("option")).toHaveLength(3);
  expect(screen.getByRole("option", { name: "Option A" })).toBeInTheDocument();
});

test("respects the default value", () => {
  render(
    <Select label="Choice" name="choice" options={options} defaultValue="b" />,
  );
  expect(screen.getByLabelText("Choice")).toHaveValue("b");
});

test("shows an error message and marks the select invalid", () => {
  render(
    <Select
      label="Choice"
      name="choice"
      options={options}
      errorMessage="Required"
    />,
  );
  expect(screen.getByLabelText("Choice")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Required");
});

test("is disabled when the disabled prop is set", () => {
  render(<Select label="Choice" name="choice" options={options} disabled />);
  expect(screen.getByLabelText("Choice")).toBeDisabled();
});
