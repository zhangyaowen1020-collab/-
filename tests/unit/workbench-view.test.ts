import { readFile } from "node:fs/promises";
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
    expect(groupAssetSlots("full_look")).toEqual(["full_look", "model"]);
  });

  it("keeps upload visible while a contracted output is missing", () => {
    expect(needsResultUpload({ expected: 2, uploaded: 1 })).toBe(true);
    expect(needsResultUpload({ expected: 2, uploaded: 2 })).toBe(false);
  });

  it("offers deletable source images and a preview before confirming a result upload", async () => {
    const source = await readFile("components/Workbench.tsx", "utf8");

    expect(source).toContain("deleteAsset");
    expect(source).toContain("确认上传");
    expect(source).toContain("重新选择");
    expect(source).toContain("pendingOutputs");
    expect(source).toContain('"/outputs/" + encodeURIComponent(output.output_file) + "/preview"');
  });

  it("supports a compact date card plus drag and deletion controls for result images", async () => {
    const source = await readFile("components/Workbench.tsx", "utf8");

    expect(source).toContain("dateExpanded");
    expect(source).toContain("收起任务日期");
    expect(source).toContain("展开任务");
    expect(source).toContain("handleOutputDrop");
    expect(source).toContain("onDrop={(event) => handleOutputDrop");
    expect(source).toContain('method: "DELETE"');
    expect(source).toContain("删除成图");
  });
});
