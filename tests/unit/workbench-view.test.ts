import { describe, expect, it } from "vitest";

import { canDeleteGroup, groupAssetSlots, needsResultUpload } from "@/lib/workbench-view";

describe("workbench view rules", () => {
  it("shows delete only for draft groups without results", () => {
    expect(canDeleteGroup({ status: "DRAFT", outputs: [] })).toBe(true);
    expect(canDeleteGroup({ status: "READY", outputs: [] })).toBe(false);
    expect(canDeleteGroup({ status: "DRAFT", outputs: [{ id: "output" }] })).toBe(false);
  });

  it("shows only material slots implied by the outfit mode", () => {
    expect(groupAssetSlots("top")).toEqual(["model", "top"]);
    expect(groupAssetSlots("bottom")).toEqual(["model", "bottom"]);
    expect(groupAssetSlots("set")).toEqual(["model", "top", "bottom"]);
  });

  it("keeps upload visible while a contracted output is missing", () => {
    expect(needsResultUpload({ expected: 2, uploaded: 1 })).toBe(true);
    expect(needsResultUpload({ expected: 2, uploaded: 2 })).toBe(false);
  });
});
