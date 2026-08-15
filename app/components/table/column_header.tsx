import type { ReactNode } from "react";

export interface TableColumnHeaderProps {
  children: ReactNode;
}

export const TableColumnHeader = ({ children }: TableColumnHeaderProps) => {
  return <th scope="col">{children}</th>;
};
