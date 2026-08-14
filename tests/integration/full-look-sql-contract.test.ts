import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("full-look SQL contract", () => {
  it("permits full-look assets and rejects a sixth model image", async () => {
    const sql = await readFile("supabase/migrations/0006_full_look_and_model_limit.sql", "utf8");

    expect(sql).toMatch(/'full_look'/);
    expect(sql).toMatch(/MODEL_LIMIT_REACHED/);
    expect(sql).toMatch(/count\(\*\).*role = 'model'/is);
  });
});
