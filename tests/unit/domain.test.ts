import { describe, expect, it } from "vitest";
import { canQuickPass, nextGroupId, outputFileName } from "@/lib/domain";

describe("cloud workbench domain", () => {
  it("retains the managed model stem in distinct output contracts", () => {
    expect(outputFileName("G01", 1, "final", 1, "01-front"))
      .toBe("G01-T01-F01-01-front-v1.png");
    expect(outputFileName("G01", 2, "final", 1, "02-front"))
      .toBe("G01-T02-F01-02-front-v1.png");
  });

  it("allocates from the persisted cursor rather than deleted group membership", () => {
    expect(nextGroupId({ next_group_number: 3 })).toEqual({
      groupId: "G03",
      nextGroupNumber: 4,
    });
  });

  it("blocks quick pass for a failed technical check", () => {
    expect(canQuickPass({ status: "PASS" })).toBe(true);
    expect(canQuickPass({ status: "FAIL" })).toBe(false);
  });
});
