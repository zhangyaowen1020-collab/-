import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("output and review mutation SQL contract", () => {
  it("uses version locks and persists one review per output", async () => {
    const sql = await readFile("supabase/migrations/0004_outputs_and_reviews.sql", "utf8");

    expect(sql).toMatch(/create or replace function add_output/i);
    expect(sql).toMatch(/create or replace function save_review/i);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/VERSION_CONFLICT/);
    expect(sql).toMatch(/on conflict \(output_id\)/i);
  });
});
