import { describe, expect, it } from "vitest";

import { expectedOutput, managedModelStem } from "@/lib/output-contract";

describe("result output contract", () => {
  it("accepts only the exact stable filename and original model dimensions", () => {
    const contract = expectedOutput({
      groupId: "G01",
      phase: "final",
      attempt: 1,
      targetOrdinal: 2,
      modelName: "02-side.jpg",
      width: 1000,
      height: 1500,
    });

    expect(contract.outputFile).toBe("G01-T02-F01-02-side-v1.png");
    expect(contract.isCorrectUpload("G01-T02-F01-02-side-v1.png", 1000, 1500)).toBe(true);
    expect(contract.isCorrectUpload("G01-T02-F01-02-side-v1.png", 1000, 1499)).toBe(false);
  });

  it("keeps duplicate original model names traceable with their managed ordinal", () => {
    expect(managedModelStem("front.jpg", 1)).toBe("01-front");
    expect(managedModelStem("front.jpg", 2)).toBe("02-front");
    expect(managedModelStem("01-front.jpg", 1)).toBe("01-front");
  });
});
