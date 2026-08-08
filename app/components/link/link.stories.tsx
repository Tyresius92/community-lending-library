import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Link } from "./link";

const meta = {
  title: "components/Link",
  component: Link,
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Internal: Story = {
  args: {
    to: "/communities",
    children: "Browse communities",
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: /browse communities/i });
    await expect(link).toHaveAttribute("href", "/communities");
  },
};

export const External: Story = {
  args: {
    href: new URL("https://example.com"),
    newTab: true,
    children: "Example site",
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: /example site/i });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  },
};
