import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Checkbox } from "./checkbox";

const meta = {
  title: "components/Checkbox",
  component: Checkbox,
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  args: {
    label: "Send me email updates",
    name: "emailUpdates",
  },
};

export const Checked: Story = {
  args: {
    label: "Send me email updates",
    name: "emailUpdates",
    defaultChecked: true,
  },
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole("checkbox", {
      name: /send me email updates/i,
    });
    await expect(checkbox).toBeChecked();
  },
};

export const Disabled: Story = {
  args: {
    label: "Send me email updates",
    name: "emailUpdates",
    disabled: true,
  },
};
