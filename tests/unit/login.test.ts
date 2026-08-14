import { describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/auth";
import { authenticateLogin } from "@/lib/login";

describe("login request validation", () => {
  it("creates a session only for a valid same-origin password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await authenticateLogin({
      origin: "https://app.example",
      requestUrl: "https://app.example/api/auth/login",
      password: "correct-password",
      passwordHash: hash,
      sessionSecret: "a".repeat(32),
      nowSeconds: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.token).toContain(".");
  });

  it("rejects cross-origin and incorrect-password requests without a token", async () => {
    const hash = await hashPassword("correct-password");
    await expect(authenticateLogin({
      origin: "https://other.example",
      requestUrl: "https://app.example/api/auth/login",
      password: "correct-password", passwordHash: hash, sessionSecret: "a".repeat(32), nowSeconds: 100,
    })).resolves.toEqual({ ok: false, error: "请求来源无效。" });
    await expect(authenticateLogin({
      origin: "https://app.example",
      requestUrl: "https://app.example/api/auth/login",
      password: "wrong-password", passwordHash: hash, sessionSecret: "a".repeat(32), nowSeconds: 100,
    })).resolves.toEqual({ ok: false, error: "密码错误。" });
  });
});
