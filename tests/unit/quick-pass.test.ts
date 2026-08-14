import { describe, expect, it } from "vitest";
import { quickPassPayload } from "@/lib/quick-pass";

describe("quick pass payload", () => {
  it("fills every human QC field only for technical PASS", () => {
    expect(quickPassPayload({ status: "PASS" })).toEqual({
      identity: "PASS",
      body_pose: "PASS",
      background: "PASS",
      garment_structure: "PASS",
      color_material: "PASS",
      logo_print: "N/A",
      occlusion: "PASS",
      group_consistency: "PASS",
      final_status: "PASS",
    });
  });

  it("refuses to produce a forged PASS for a technical failure", () => {
    expect(() => quickPassPayload({ status: "FAIL" })).toThrow(/技术检查/);
  });
});
