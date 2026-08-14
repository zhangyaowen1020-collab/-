import { describe, expect, it } from "vitest";

import { finalReviewStatus, validateReview, type ReviewPayload } from "@/lib/qc";

const pass: ReviewPayload = {
  identity: "PASS", body_pose: "PASS", background: "PASS", garment_structure: "PASS",
  color_material: "PASS", logo_print: "N/A", occlusion: "PASS", group_consistency: "PASS",
  final_status: "PASS",
};

describe("server QC rules", () => {
  it("does not accept human PASS when technical QC failed", () => {
    expect(() => validateReview({ ...pass }, "FAIL")).toThrow(/技术检查/);
  });

  it("requires every human field to be PASS or N/A for final PASS", () => {
    expect(finalReviewStatus(pass)).toBe("PASS");
    expect(finalReviewStatus({ ...pass, garment_structure: "FAIL" })).toBe("FAIL");
  });
});
