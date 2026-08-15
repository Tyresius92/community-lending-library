import type { ReactNode } from "react";

export interface TableRowHeaderProps {
  children: ReactNode;
}

export const TableRowHeader = ({ children }: TableRowHeaderProps) => {
  return <th scope="row">{children}</th>;
};
