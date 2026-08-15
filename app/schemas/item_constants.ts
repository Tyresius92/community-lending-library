// Not `.server.ts` — these two numbers are needed on the client too (the
// native `maxLength` attr on the item form's TextInput/TextArea), unlike the
// rest of item.server.ts (the Zod schema itself, its codes, its type guard),
// which is only ever used inside an action and would otherwise ship the
// `zod` library to the client for no reason.
export const NAME_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 1000;
