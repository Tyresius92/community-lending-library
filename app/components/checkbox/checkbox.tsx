import { useId } from "react";

import { Box } from "../box/box";

export interface CheckboxProps {
  name: string;
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
}

export const Checkbox = ({
  label,
  name,
  defaultChecked,
  disabled,
  required,
}: CheckboxProps) => {
  const inputId = useId();

  return (
    <Box>
      <input
        type="checkbox"
        id={inputId}
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        required={required}
      />
      <label htmlFor={inputId}>{label}</label>
    </Box>
  );
};
