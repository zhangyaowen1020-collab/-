import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("delete draft asset database contract", () => {
  it("deletes one draft asset under a version lock", async () => {
    const sql = await readFile("supabase/migrations/0007_delete_draft_asset.sql", "utf8");

    expect(sql).toMatch(/create or replace function delete_draft_asset/i);
    expect(sql).toMatch(/p_asset_id uuid/i);
    expect(sql).toMatch(/target_group\.status <> 'DRAFT'/);
    expect(sql).toMatch(/asset_deleted/);
  });
});
