import * as Crypto from "expo-crypto";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createId() {
  return Crypto.randomUUID();
}

export function createInviteCode(length = 6) {
  let code = "";
  const bytes = Crypto.getRandomBytes(length);
  for (let index = 0; index < length; index += 1) {
    const value = bytes[index];
    code += INVITE_ALPHABET[value % INVITE_ALPHABET.length];
  }
  return code;
}
