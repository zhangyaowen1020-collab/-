import { describe, expect, it } from "vitest";

import { renderHandoff } from "@/lib/handoff";

describe("manual Codex handoff", () => {
  it("keeps original model files as the only edit targets and gives each a stable output contract", () => {
    const markdown = renderHandoff({
      jobDate: "2026-08-13",
      phase: "baseline",
      groups: [{
        groupId: "G01",
        applyMode: "set",
        attempt: 1,
        assets: [
          { role: "top", originalName: "shirt.png" },
          { role: "bottom", originalName: "pants.jpg" },
          { role: "model", originalName: "01-front.jpg", width: 1000, height: 1500 },
          { role: "model", originalName: "02-side.jpg", width: 1000, height: 1500 },
        ],
      }],
    });

    expect(markdown).toContain("每张仍以原模特图为唯一编辑目标");
    expect(markdown).toContain("G01-T01-B01-01-front-v1.png");
    expect(markdown).toContain("G01-T02-B01-02-side-v1.png");
    expect(markdown).toContain("1000×1500");
  });

  it("renders a whole-look reference while keeping the models as the only edit targets", () => {
    const markdown = renderHandoff({
      jobDate: "2026-08-14",
      phase: "baseline",
      groups: [{
        groupId: "G01", applyMode: "full_look", attempt: 1,
        assets: [
          { role: "full_look", originalName: "look.jpg" },
          { role: "model", originalName: "front.jpg", width: 1080, height: 1440 },
        ],
      }],
    });

    expect(markdown).toContain("整套换装");
    expect(markdown).toContain("整套参考图：look.jpg");
    expect(markdown).toContain("front.jpg -> G01-T01-B01-01-front-v1.png");
  });
});
