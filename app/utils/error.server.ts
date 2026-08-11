export class NonErrorThrown extends Error {
  readonly cause: unknown;

  constructor(value: unknown) {
    super(`Non-error thrown: ${String(value)}`);
    this.name = "NonErrorThrown";
    this.cause = value;
  }
}

export const toError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }
  return new NonErrorThrown(value);
};
