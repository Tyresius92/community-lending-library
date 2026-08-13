import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Button } from "../button/button";

import { Modal } from "./modal";

const meta = {
  title: "components/Modal",
  component: Modal,
  args: {
    setIsOpen: () => undefined,
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    isOpen: true,
    title: "Delete this item?",
    closeLabel: "Close",
    content: (
      <>
        <p>This can&apos;t be undone.</p>
        <Button variant="secondary">Cancel</Button>
        <Button variant="danger">Delete</Button>
      </>
    ),
  },
  play: async ({ canvas }) => {
    const dialog = canvas.getByRole("dialog", { name: "Delete this item?" });
    await expect(dialog).toBeVisible();
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    title: "Delete this item?",
    closeLabel: "Close",
    content: <p>This can&apos;t be undone.</p>,
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
  },
};
