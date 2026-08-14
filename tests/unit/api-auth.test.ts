import { describe, expect, it } from "vitest";

import { createSession } from "@/lib/auth";
import { ApiError, requireSameOrigin, requireSession } from "@/lib/api";

describe("protected API helpers", () => {
  it("accepts only a valid shared-session cookie", () => {
    const secret = "s".repeat(32);
    const token = createSession(secret, 100);
    const request = new Request("https://app.example/api/jobs", {
      headers: { cookie: `yishou_session=${token}` },
    });

    expect(() => requireSession(request, secret, 101)).not.toThrow();
    expect(() => requireSession(new Request("https://app.example/api/jobs"), secret, 101)).toThrow(ApiError);
  });

  it("rejects a write request that did not originate from this app", () => {
    try {
      requireSameOrigin(
        new Request("https://app.example/api/jobs", {
          headers: { origin: "https://elsewhere.example" },
        }),
      );
      throw new Error("expected request to be rejected");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
    }
  });
});
