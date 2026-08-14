import { describe, expect, it } from "vitest";

import { findResultContractInJob } from "@/lib/job-result-contract";

describe("saved job result contract", () => {
  const job = {
    groups: [{
      id: "group-uuid",
      group_id: "G01",
      baseline_attempt: 0,
      expansion_attempt: 0,
      assets: [
        { role: "model", original_name: "front.jpg", width: 1000, height: 1500, asset_ordinal: 2 },
        { role: "model", original_name: "front.jpg", width: 900, height: 1400, asset_ordinal: 1 },
      ],
    }],
  };

  it("uses saved model order rather than a duplicate original filename", () => {
    const result = findResultContractInJob(job, "final", 1, "G01-T01-F01-01-front-v1.png");

    expect(result).toMatchObject({ groupId: "G01", targetOrdinal: 1, width: 900, height: 1400 });
  });

  it("cannot accept a file not present in this task's current contract", () => {
    expect(() => findResultContractInJob(job, "final", 1, "G01-T01-F01-02-front-v1.png")).toThrow(/输出合同/);
  });
});
