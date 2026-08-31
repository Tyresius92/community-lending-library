import crypto from "crypto";

const TOKEN_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_LENGTH = 12;

export function generateInviteToken(): string {
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_ALPHABET[crypto.randomInt(TOKEN_ALPHABET.length)];
  }
  return token;
}
