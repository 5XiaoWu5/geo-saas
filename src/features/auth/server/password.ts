"use server";

import { argon2id, argon2Verify } from "hash-wasm";

const ARGON2_OPTIONS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 19456,
  hashLength: 32,
  outputType: "encoded" as const,
};

function createSalt(): Uint8Array {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return salt;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: createSalt(),
    ...ARGON2_OPTIONS,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2Verify({
    password,
    hash,
  });
}
