import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("delete draft asset API route", () => {
  it("uses write access and the draft asset repository operation", async () => {
    const route = await readFile("app/api/jobs/[jobDate]/groups/[groupId]/assets/[role]/[assetId]/route.ts", "utf8");

    expect(route).toContain("export async function DELETE");
    expect(route).toContain("requireWriteAccess");
    expect(route).toContain("deleteDraftAsset");
    expect(route).toContain("assertMutationVersion");
  });
});
