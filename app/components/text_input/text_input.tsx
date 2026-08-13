import { useId } from "react";
import type { InputHTMLAttributes, Ref } from "react";

import { Box } from "../box/box";

export interface TextInputProps
  extends Pick<
    InputHTMLAttributes<HTMLInputElement>,
    | "required"
    | "autoFocus"
    | "autoComplete"
    | "placeholder"
    | "pattern"
    | "defaultValue"
    | "disabled"
    | "step"
    | "minLength"
    | "maxLength"
  > {
  label: string;
  name: string;
  type: "text" | "email" | "password" | "number" | "url" | "date";

  errorMessage?: string;
  hintText?: string;
  step?: number;
  ref?: Ref<HTMLInputElement>;
}

export const TextInput = ({
  label,
  errorMessage,
  hintText,
  ref,
  ...rest
}: TextInputProps) => {
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();

  return (
    <Box>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        ref={ref}
        aria-describedby={`${errorId} ${hintId}`}
        aria-invalid={errorMessage ? true : undefined}
        {...rest}
      />
      {hintText ? <div id={hintId}>{hintText}</div> : null}
      {errorMessage ? (
        <div id={errorId} role="alert">
          {errorMessage}
        </div>
      ) : null}
    </Box>
  );
};
