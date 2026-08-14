import { describe, expect, it } from "vitest";

import { validateResultFile } from "@/lib/result-file";

describe("result file validation", () => {
  it("requires the exact handoff filename and a PNG result", () => {
    expect(() => validateResultFile({
      declaredOutputFile: "G01-T01-F01-01-front-v1.png",
      uploadedName: "wrong.png",
      contentType: "image/png",
    })).toThrow(/文件名/);

    expect(() => validateResultFile({
      declaredOutputFile: "G01-T01-F01-01-front-v1.png",
      uploadedName: "G01-T01-F01-01-front-v1.png",
      contentType: "image/jpeg",
    })).toThrow(/PNG/);

    expect(validateResultFile({
      declaredOutputFile: "G01-T01-F01-01-front-v1.png",
      uploadedName: "G01-T01-F01-01-front-v1.png",
      contentType: "image/png",
    })).toBeUndefined();
  });
});
