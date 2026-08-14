import { describe, expect, it } from "vitest";

import { createSupabaseAdmin } from "@/lib/supabase-admin";

describe("Supabase admin boundary", () => {
  it("creates a server-only client without a persisted browser session", () => {
    const client = createSupabaseAdmin({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_example",
    });

    expect(client).toBeDefined();
  });

  it("rejects a public or malformed server configuration", () => {
    expect(() =>
      createSupabaseAdmin({
        SUPABASE_URL: "not-a-url",
        SUPABASE_SERVICE_ROLE_KEY: "public-key",
      }),
    ).toThrow();
  });
});
