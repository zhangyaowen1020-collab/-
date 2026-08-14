import { describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth";
import { ApiError, jsonError, requireSameOrigin, requireSession } from "@/lib/api";

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

  it("logs unexpected server errors while returning a generic client response", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = jsonError(new Error("database request failed"));

    expect(await response.json()).toEqual({ error: "服务器暂时无法处理请求。" });
    expect(response.status).toBe(500);
    expect(log).toHaveBeenCalledWith("Unhandled API error", {
      name: "Error",
      message: "database request failed",
    });

    log.mockRestore();
  });
});
