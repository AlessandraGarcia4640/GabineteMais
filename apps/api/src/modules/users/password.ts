import { hash, verify } from '@node-rs/argon2';

export function hashPassword(password: string): Promise<string> {
  // The library defaults to Argon2id; the test verifies the encoded algorithm.
  return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}
