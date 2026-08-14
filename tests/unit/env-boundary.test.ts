import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env";

describe("server environment boundary", () => {
  it("requires every private server setting", () => {
    expect(() => parseServerEnv({})).toThrow(/SUPABASE_URL/);
  });

  it("rejects a service key exposed through a public variable", () => {
    expect(() => parseServerEnv({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret",
      APP_PASSWORD_HASH: "hash",
      SESSION_SECRET: "x".repeat(32),
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "leak",
    })).toThrow(/must not be public/);
  });
});
