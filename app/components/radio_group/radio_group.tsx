import { useId } from "react";

import { Box } from "../box/box";

export interface RadioGroupProps {
  name: string;
  label: string;
  options: {
    value: string;
    label: string;
  }[];
  defaultValue?: string;
  disabled?: boolean;
  errorMessage?: string;
  required?: boolean;
}

export const RadioGroup = ({
  label,
  name,
  options,
  defaultValue,
  disabled,
  errorMessage,
  required,
}: RadioGroupProps) => {
  const groupId = useId();
  const errorId = useId();

  return (
    <Box>
      <fieldset aria-describedby={errorId}>
        <legend>{label}</legend>
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          return (
            <Box key={option.value}>
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                defaultChecked={option.value === defaultValue}
                disabled={disabled}
                required={required}
              />
              <label htmlFor={optionId}>{option.label}</label>
            </Box>
          );
        })}
      </fieldset>
      {errorMessage ? (
        <div id={errorId} role="alert">
          {errorMessage}
        </div>
      ) : null}
    </Box>
  );
};
