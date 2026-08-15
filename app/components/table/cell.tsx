import type { ReactNode } from "react";

export interface TableCellProps {
  children?: ReactNode;
}

export const TableCell = ({ children }: TableCellProps) => {
  return <td>{children}</td>;
};
