import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Button } from "./button";

const meta = {
  title: "components/Button",
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "Create community",
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: /create community/i });
    await expect(button).toHaveAttribute("data-variant", "primary");
  },
};

export const Secondary: Story = {
  args: { children: "Cancel", variant: "secondary" },
};

export const Disabled: Story = {
  args: { children: "Submitting…", disabled: true },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: /submitting/i });
    await expect(button).toBeDisabled();
  },
};
