import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Select } from "./select";

const meta = {
  title: "components/Select",
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const visibilityOptions = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

export const Default: Story = {
  args: {
    label: "Visibility",
    name: "visibility",
    options: visibilityOptions,
    defaultValue: "public",
  },
};

export const Disabled: Story = {
  args: {
    label: "Visibility",
    name: "visibility",
    options: visibilityOptions,
    defaultValue: "public",
    disabled: true,
  },
};

export const WithError: Story = {
  args: {
    label: "Visibility",
    name: "visibility",
    options: visibilityOptions,
    errorMessage: "Please choose a visibility.",
  },
  play: async ({ canvas }) => {
    const select = canvas.getByLabelText("Visibility");
    await expect(select).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      /please choose a visibility/i,
    );
  },
};
