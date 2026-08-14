import { describe, expect, it } from "vitest";
import { createSession, hashPassword, verifyPassword, verifySession } from "@/lib/auth";

describe("shared-password authentication", () => {
  it("accepts only the password used to create an scrypt hash", async () => {
    const hash = await hashPassword("correct-password");
    await expect(verifyPassword("correct-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("rejects a modified or expired signed session", () => {
    const secret = "a".repeat(32);
    const token = createSession(secret, 1_000, 3_600);
    expect(verifySession(secret, token, 1_001)).toBe(true);
    expect(verifySession(secret, `${token}x`, 1_001)).toBe(false);
    expect(verifySession(secret, token, 5_000)).toBe(false);
  });
});
