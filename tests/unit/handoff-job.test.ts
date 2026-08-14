import { describe, expect, it } from "vitest";

import { handoffInputFromJob } from "@/lib/handoff-job";

describe("cloud job handoff data", () => {
  it("keeps only groups with models and preserves asset roles", () => {
    const input = handoffInputFromJob({
      job_date: "2026-08-13",
      groups: [
        { group_id: "G01", apply_mode: "set", baseline_attempt: 0, expansion_attempt: 0, assets: [
          { role: "model", original_name: "front.jpg", width: 1000, height: 1500 },
          { role: "top", original_name: "top.jpg", width: 800, height: 1200 },
        ] },
        { group_id: "G02", apply_mode: "top", baseline_attempt: 0, expansion_attempt: 0, assets: [] },
      ],
    }, "baseline");

    expect(input.groups).toHaveLength(1);
    expect(input.groups[0]).toMatchObject({ groupId: "G01", attempt: 1 });
  });
});
