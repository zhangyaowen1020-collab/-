import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derived = await scrypt(password, salt, keyLength) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, encoded] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !encoded) return false;
  const actual = await scrypt(password, salt, keyLength) as Buffer;
  const expected = Buffer.from(encoded, "base64url");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createSession(secret: string, nowSeconds = Math.floor(Date.now() / 1000), ttlSeconds = 43_200) {
  const body = Buffer.from(JSON.stringify({ exp: nowSeconds + ttlSeconds, nonce: randomBytes(16).toString("base64url") })).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifySession(secret: string, token: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const [body, suppliedSignature] = token.split(".");
  if (!body || !suppliedSignature) return false;
  const expectedSignature = createHmac("sha256", secret).update(body).digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof data.exp === "number" && Number.isInteger(data.exp) && data.exp > nowSeconds;
  } catch {
    return false;
  }
}
