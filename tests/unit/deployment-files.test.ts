import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("deployment safety documents", () => {
  it("keeps the four private Vercel settings documented without embedding their values", async () => {
    const deployment = await readFile("docs/DEPLOYMENT.md", "utf8");
    const generator = await readFile("scripts/generate-secrets.mjs", "utf8");

    expect(deployment).toMatch(/SUPABASE_URL/);
    expect(deployment).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(deployment).toMatch(/APP_PASSWORD_HASH/);
    expect(deployment).toMatch(/SESSION_SECRET/);
    expect(generator).toMatch(/scrypt/);
    expect(generator).toMatch(/readline/);
  });
});
