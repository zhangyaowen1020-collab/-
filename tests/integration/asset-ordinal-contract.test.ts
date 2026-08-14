import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("asset ordinal SQL contract", () => {
  it("persists an explicit order for same-named model photos", async () => {
    const sql = await readFile("supabase/migrations/0005_asset_ordinals.sql", "utf8");

    expect(sql).toMatch(/add column(?: if not exists)? asset_ordinal/i);
    expect(sql).toMatch(/unique \(group_id, role, asset_ordinal\)/i);
    expect(sql).toMatch(/create or replace function add_asset/i);
    expect(sql).toMatch(/p_asset_ordinal/i);
  });
});
