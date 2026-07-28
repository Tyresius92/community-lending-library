import { render, screen } from "@testing-library/react";

import { RadioGroup } from "./radio_group";

const options = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

test("renders the legend and each option as a labeled radio", () => {
  render(<RadioGroup label="Visibility" name="visibility" options={options} />);
  expect(screen.getByText("Visibility")).toBeInTheDocument();
  expect(screen.getByLabelText("Public")).toHaveAttribute("type", "radio");
  expect(screen.getByLabelText("Private")).toHaveAttribute("type", "radio");
});

test("checks the option matching defaultValue", () => {
  render(
    <RadioGroup
      label="Visibility"
      name="visibility"
      options={options}
      defaultValue="private"
    />,
  );
  expect(screen.getByLabelText("Private")).toBeChecked();
  expect(screen.getByLabelText("Public")).not.toBeChecked();
});

test("all options share the same name for form submission", () => {
  render(<RadioGroup label="Visibility" name="visibility" options={options} />);
  expect(screen.getByLabelText("Public")).toHaveAttribute("name", "visibility");
  expect(screen.getByLabelText("Private")).toHaveAttribute(
    "name",
    "visibility",
  );
});

test("shows an error message", () => {
  render(
    <RadioGroup
      label="Visibility"
      name="visibility"
      options={options}
      errorMessage="Pick one"
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Pick one");
});

test("disables all options when disabled is set", () => {
  render(
    <RadioGroup
      label="Visibility"
      name="visibility"
      options={options}
      disabled
    />,
  );
  expect(screen.getByLabelText("Public")).toBeDisabled();
  expect(screen.getByLabelText("Private")).toBeDisabled();
});
