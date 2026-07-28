import { useId } from "react";
import type { TextareaHTMLAttributes, Ref } from "react";

import { Box } from "../box/box";

export interface TextAreaProps
  extends Pick<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    | "required"
    | "autoFocus"
    | "placeholder"
    | "defaultValue"
    | "disabled"
    | "minLength"
    | "maxLength"
    | "rows"
  > {
  label: string;
  name: string;
  errorMessage?: string;
  hintText?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export const TextArea = ({
  label,
  errorMessage,
  hintText,
  ref,
  ...rest
}: TextAreaProps) => {
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();

  return (
    <Box>
      <label htmlFor={inputId}>{label}</label>
      <textarea
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
