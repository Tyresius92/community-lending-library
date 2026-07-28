import type { HTMLAttributes, ReactNode } from "react";

export interface BoxProps extends Pick<HTMLAttributes<HTMLElement>, "id" | "role"> {
  children?: ReactNode;
  is?: "div" | "article" | "section";
}

export const Box = ({ id, role, children, is = "div" }: BoxProps) => {
  const Tag = is;
  return (
    <Tag id={id} role={role}>
      {children}
    </Tag>
  );
};
