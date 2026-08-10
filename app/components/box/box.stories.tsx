import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Box } from "./box";

const meta = {
  title: "components/Box",
  component: Box,
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    p: 16,
    children: "A box with padding",
  },
};

export const FlexRow: Story = {
  args: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    children: (
      <>
        <span>Item one</span>
        <span>Item two</span>
      </>
    ),
  },
};

// The one CssCheck story for the whole project — proves the shared preview
// actually loaded app/components/_global_styles/colors.css (bg/color props
// resolve to `var(--color-*)`, defined there), not just that Box mounted.
export const CssCheck: Story = {
  args: {
    p: 16,
    bg: "sand-12",
    color: "sand-1",
    children: "Header-style box",
  },
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector("div");
    if (!box) {
      throw new Error("expected a div to be rendered");
    }
    // colors.css sets --color-sand-12: #21201c
    await expect(getComputedStyle(box).backgroundColor).toBe("rgb(33, 32, 28)");
  },
};
