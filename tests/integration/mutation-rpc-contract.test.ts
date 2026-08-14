import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("versioned job mutation SQL contract", () => {
  it("locks the job and makes group allocation and deletion versioned", async () => {
    const sql = await readFile("supabase/migrations/0002_versioned_mutations.sql", "utf8");

    expect(sql).toMatch(/create or replace function add_group/i);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/VERSION_CONFLICT/);
    expect(sql).toMatch(/next_group_number/);
    expect(sql).toMatch(/create or replace function delete_draft_group/i);
    expect(sql).toMatch(/has_outputs/);
  });
});
