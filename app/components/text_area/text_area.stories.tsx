import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { TextArea } from "./text_area";

const meta = {
  title: "components/TextArea",
  component: TextArea,
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Description (optional)",
    name: "description",
    rows: 4,
  },
};

export const WithError: Story = {
  args: {
    label: "Description (optional)",
    name: "description",
    rows: 4,
    errorMessage: "Description is too long.",
  },
  play: async ({ canvas }) => {
    const textarea = canvas.getByLabelText("Description (optional)");
    await expect(textarea).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      /description is too long/i,
    );
  },
};
