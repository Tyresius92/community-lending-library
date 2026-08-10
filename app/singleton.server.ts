// Borrowed & modified from https://github.com/jenseng/abuse-the-platform/blob/main/app/utils/singleton.ts
// Thanks @jenseng!

declare global {
  var __singletons: Record<string, unknown> | undefined;
}

export const singleton = <Value>(
  name: string,
  valueFactory: () => Value,
): Value => {
  global.__singletons ??= {};
  global.__singletons[name] ??= valueFactory();
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- this is a type-erased cache by design; there's no sound way to prove the retrieved value matches Value.
  return global.__singletons[name] as Value;
};
