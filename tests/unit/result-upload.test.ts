import { describe, expect, it } from "vitest";

import { resolveResultUpload } from "@/lib/result-upload";

describe("result upload resolution", () => {
  const group = {
    groupId: "G01",
    phase: "final" as const,
    attempt: 1,
    models: [
      { originalName: "front.jpg", width: 1000, height: 1500 },
      { originalName: "front.jpg", width: 900, height: 1400 },
    ],
  };

  it("maps each same-named model to one unique final output", () => {
    expect(resolveResultUpload(group, "G01-T02-F01-02-front-v1.png", 900, 1400)).toMatchObject({
      targetOrdinal: 2,
      technicalStatus: "PASS",
    });
  });

  it("keeps a correctly named PNG as technical PASS when its dimensions differ", () => {
    expect(resolveResultUpload(group, "G01-T01-F01-01-front-v1.png", 1000, 1499)).toMatchObject({
      technicalStatus: "PASS",
    });
  });

  it("rejects a result whose filename is outside the handoff contract", () => {
    expect(() => resolveResultUpload(group, "random.png", 1000, 1500)).toThrow(/输出合同/);
  });
});
