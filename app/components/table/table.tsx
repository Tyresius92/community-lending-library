import type { ReactNode } from "react";

import { TableBody } from "./body";
import { TableCell } from "./cell";
import { TableColumnHeader } from "./column_header";
import { TableHead } from "./head";
import { TableRow } from "./row";
import { TableRowHeader } from "./row_header";
import styles from "./table.module.css";

export interface TableProps {
  children: ReactNode;
  caption: string;
}

const TableBase = ({ children, caption }: TableProps) => {
  return (
    <div className={styles["scroll-wrapper"]}>
      <table>
        <caption>{caption}</caption>
        {children}
      </table>
    </div>
  );
};

export const Table = Object.assign(TableBase, {
  Head: TableHead,
  ColumnHeader: TableColumnHeader,
  RowHeader: TableRowHeader,
  Body: TableBody,
  Row: TableRow,
  Cell: TableCell,
});
