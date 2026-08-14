import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("delete output database contract", () => {
  it("locks the task version and deletes one stored result with its review", async () => {
    const sql = await readFile("supabase/migrations/0008_delete_output_and_flexible_qc.sql", "utf8");

    expect(sql).toMatch(/create or replace function delete_output/i);
    expect(sql).toMatch(/p_output_file text/i);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/VERSION_CONFLICT/);
    expect(sql).toMatch(/delete from outputs/i);
    expect(sql).toMatch(/output_deleted/);
  });
});
