import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("asset mutation SQL contract", () => {
  it("locks the job, requires its current version, and never accepts caller-controlled paths", async () => {
    const sql = await readFile("supabase/migrations/0003_asset_mutations.sql", "utf8");

    expect(sql).toMatch(/create or replace function add_asset/i);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/VERSION_CONFLICT/);
    expect(sql).toMatch(/p_object_key/);
    expect(sql).toMatch(/GROUP_NOT_DRAFT/);
  });
});
