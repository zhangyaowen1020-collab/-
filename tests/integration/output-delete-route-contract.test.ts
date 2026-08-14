import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("delete output API route", () => {
  it("requires write access and delegates deletion to the output repository", async () => {
    const route = await readFile("app/api/jobs/[jobDate]/outputs/[outputFile]/route.ts", "utf8");

    expect(route).toContain("export async function DELETE");
    expect(route).toContain("requireWriteAccess");
    expect(route).toContain("deleteOutput");
    expect(route).toContain("assertMutationVersion");
  });
});
