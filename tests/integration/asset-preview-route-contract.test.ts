import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("private asset preview route", () => {
  it("requires a session and reads the image only from private storage", async () => {
    const source = await readFile("app/api/jobs/[jobDate]/assets/[assetId]/preview/route.ts", "utf8");

    expect(source).toContain("requireReadAccess");
    expect(source).toContain("getJobByDate");
    expect(source).toContain("tryon-assets");
    expect(source).toContain("Content-Type");
  });
});
