import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { RadioGroup } from "./radio_group";

const meta = {
  title: "components/RadioGroup",
  component: RadioGroup,
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const joinPolicyOptions = [
  { value: "open", label: "Anyone can join" },
  { value: "invite_only", label: "Invite only" },
];

export const Default: Story = {
  args: {
    label: "Who can join",
    name: "joinPolicy",
    options: joinPolicyOptions,
    defaultValue: "open",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("radio", { name: /anyone can join/i }),
    ).toBeChecked();
  },
};

export const SelectOption: Story = {
  args: {
    label: "Who can join",
    name: "joinPolicy",
    options: joinPolicyOptions,
    defaultValue: "open",
  },
  play: async ({ canvas, userEvent }) => {
    const inviteOnly = canvas.getByRole("radio", { name: /invite only/i });
    await userEvent.click(inviteOnly);
    await expect(inviteOnly).toBeChecked();
    await expect(
      canvas.getByRole("radio", { name: /anyone can join/i }),
    ).not.toBeChecked();
  },
};

export const WithError: Story = {
  args: {
    label: "Who can join",
    name: "joinPolicy",
    options: joinPolicyOptions,
    errorMessage: "Please choose who can join.",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      /please choose who can join/i,
    );
  },
};
