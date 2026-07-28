import { useId } from "react";

import { Box } from "../box/box";

export interface SelectProps {
  name: string;
  label: string;
  options: {
    value: string;
    label: string;
  }[];
  defaultValue?: string;
  disabled?: boolean;
  errorMessage?: string;
}

export const Select = ({
  label,
  name,
  options,
  defaultValue,
  disabled,
  errorMessage,
}: SelectProps) => {
  const inputId = useId();
  const errorId = useId();

  return (
    <Box>
      <label htmlFor={inputId}>{label}</label>
      <select
        name={name}
        id={inputId}
        defaultValue={defaultValue}
        disabled={disabled}
        aria-describedby={errorId}
        aria-invalid={errorMessage ? true : undefined}
      >
        <option value="">--Please choose an option--</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errorMessage ? (
        <div id={errorId} role="alert">
          {errorMessage}
        </div>
      ) : null}
    </Box>
  );
};
