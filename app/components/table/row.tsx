import type { ReactNode } from "react";

export interface TableRowProps {
  children: ReactNode;
}

export const TableRow = ({ children }: TableRowProps) => <tr>{children}</tr>;
