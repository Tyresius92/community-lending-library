import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { TextInput } from "./text_input";

const meta = {
  title: "components/TextInput",
  component: TextInput,
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Name",
    name: "name",
    type: "text",
  },
};

export const WithHint: Story = {
  args: {
    label: "URL",
    name: "slug",
    type: "text",
    hintText: "Lowercase letters, numbers, and hyphens only.",
  },
};

export const WithError: Story = {
  args: {
    label: "URL",
    name: "slug",
    type: "text",
    errorMessage: "That URL is already taken. Try another.",
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("URL");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      /that url is already taken/i,
    );
  },
};
