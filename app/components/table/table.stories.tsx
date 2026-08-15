import type { Meta, StoryObj } from "@storybook/react-vite";

import { Table } from "./table";

const meta = {
  title: "components/Table",
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {
  args: {
    caption: "Items",
    children: (
      <>
        <Table.Head>
          <Table.ColumnHeader>Item</Table.ColumnHeader>
          <Table.ColumnHeader>Owner</Table.ColumnHeader>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.RowHeader>Cordless Drill</Table.RowHeader>
            <Table.Cell>a neighbor</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.RowHeader>Camping Tent</Table.RowHeader>
            <Table.Cell>You</Table.Cell>
          </Table.Row>
        </Table.Body>
      </>
    ),
  },
};

export const SingleColumn: Story = {
  args: {
    caption: "Recent activity",
    children: (
      <Table.Body>
        <Table.Row>
          <Table.Cell>Item added</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Item removed</Table.Cell>
        </Table.Row>
      </Table.Body>
    ),
  },
};
