import {
  argon2Sync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const MEMORY_KIB = 19_456;
const PASSES = 2;
const PARALLELISM = 1;
const TAG_LENGTH = 32;

const derive = (password: string, salt: Buffer): Buffer =>
  argon2Sync('argon2id', {
    message: Buffer.from(password, 'utf8'),
    nonce: salt,
    parallelism: PARALLELISM,
    tagLength: TAG_LENGTH,
    memory: MEMORY_KIB,
    passes: PASSES,
  });

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const hash = derive(password, salt);
  return [
    'argon2id',
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
};

export const verifyPassword = async (
  encoded: string,
  password: string,
): Promise<boolean> => {
  const [algorithm, saltEncoded, hashEncoded] = encoded.split('$');

  if (algorithm !== 'argon2id' || !saltEncoded || !hashEncoded) {
    return false;
  }

  const salt = Buffer.from(saltEncoded, 'base64url');
  const expected = Buffer.from(hashEncoded, 'base64url');
  const actual = derive(password, salt);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
