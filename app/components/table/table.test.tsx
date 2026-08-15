import { render, screen } from "@testing-library/react";

import { Table } from "./table";

test("renders the caption", () => {
  render(
    <Table caption="Items">
      <Table.Body>
        <Table.Row>
          <Table.Cell>Hello</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>,
  );
  expect(screen.getByText("Items")).toBeInTheDocument();
});

test("renders column headers with scope='col'", () => {
  render(
    <Table caption="Items">
      <Table.Head>
        <Table.ColumnHeader>Item</Table.ColumnHeader>
        <Table.ColumnHeader>Owner</Table.ColumnHeader>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Hello</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>,
  );
  const headers = screen.getAllByRole("columnheader");
  expect(headers).toHaveLength(2);
  headers.forEach((header) => expect(header).toHaveAttribute("scope", "col"));
});

test("renders row headers with scope='row'", () => {
  render(
    <Table caption="Items">
      <Table.Head>
        <Table.ColumnHeader>Item</Table.ColumnHeader>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.RowHeader>Cordless Drill</Table.RowHeader>
        </Table.Row>
      </Table.Body>
    </Table>,
  );
  expect(screen.getByRole("rowheader")).toHaveAttribute("scope", "row");
});

test("renders cell content", () => {
  render(
    <Table caption="Items">
      <Table.Head>
        <Table.ColumnHeader>Owner</Table.ColumnHeader>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>a neighbor</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>,
  );
  expect(screen.getByRole("cell", { name: "a neighbor" })).toBeInTheDocument();
});

test("renders multiple rows", () => {
  render(
    <Table caption="Items">
      <Table.Head>
        <Table.ColumnHeader>Item</Table.ColumnHeader>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Cordless Drill</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Camping Tent</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>,
  );
  expect(screen.getAllByRole("row")).toHaveLength(3);
});
