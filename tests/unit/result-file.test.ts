import { describe, expect, it } from "vitest";

import { validateResultFile } from "@/lib/result-file";

describe("result file validation", () => {
  it("accepts a PNG regardless of the local file name", () => {
    expect(() => validateResultFile({
      contentType: "image/png",
    })).not.toThrow();

    expect(() => validateResultFile({
      contentType: "image/jpeg",
    })).toThrow(/PNG/);
  });
});
