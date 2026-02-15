import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt";

type ParsedScryptHash = {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
};

function parseScryptHash(value: string): ParsedScryptHash | null {
  const parts = value.split("$");
  if (parts.length !== 6) return null;
  if (parts[0] !== HASH_PREFIX) return null;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return null;
  }

  try {
    const salt = Buffer.from(parts[4], "base64");
    const hash = Buffer.from(parts[5], "base64");
    if (salt.length === 0 || hash.length === 0) return null;

    return { n, r, p, salt, hash };
  } catch {
    return null;
  }
}

export function verifyPasswordHash(password: string, hashValue: string): boolean {
  const parsed = parseScryptHash(hashValue);
  if (!parsed) return false;

  const derived = scryptSync(password, parsed.salt, parsed.hash.length, {
    N: parsed.n,
    r: parsed.r,
    p: parsed.p,
  });

  return timingSafeEqual(derived, parsed.hash);
}

export function createPasswordHash(
  password: string,
  options: { n?: number; r?: number; p?: number; saltBytes?: number } = {},
): string {
  const n = options.n ?? 16384;
  const r = options.r ?? 8;
  const p = options.p ?? 1;
  const salt = randomBytes(options.saltBytes ?? 16);
  const hash = scryptSync(password, salt, 64, { N: n, r, p });

  return `${HASH_PREFIX}$${n}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

