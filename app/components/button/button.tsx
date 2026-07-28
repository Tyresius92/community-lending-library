import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps
  extends Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    | "children"
    | "onClick"
    | "type"
    | "name"
    | "value"
    | "disabled"
    | "aria-describedby"
  > {
  variant?: "primary" | "secondary" | "danger";
}

export const Button = ({ variant = "primary", ...props }: ButtonProps) => {
  return <button data-variant={variant} {...props} />;
};
