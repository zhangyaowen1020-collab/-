import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("private output preview route", () => {
  it("requires a session and streams a contracted result from private storage", async () => {
    const source = await readFile("app/api/jobs/[jobDate]/outputs/[outputFile]/preview/route.ts", "utf8");

    expect(source).toContain("requireReadAccess");
    expect(source).toContain("findOutputInJob");
    expect(source).toContain('storage.from("tryon-assets").download');
    expect(source).toContain("Cache-Control");
  });
});
