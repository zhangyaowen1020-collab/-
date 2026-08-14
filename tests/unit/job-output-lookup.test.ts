import { describe, expect, it } from "vitest";

import { findOutputInJob } from "@/lib/repositories";

describe("job output lookup", () => {
  it("finds an output only within the current task snapshot", () => {
    const output = findOutputInJob({
      groups: [{ group_id: "G01", outputs: [{ id: "a", output_file: "G01-T01-F01-01-front-v1.png", technical_status: "PASS" }] }],
    }, "G01-T01-F01-01-front-v1.png");

    expect(output).toMatchObject({ id: "a", technical_status: "PASS" });
    expect(findOutputInJob({ groups: [] }, "other.png")).toBeNull();
  });
});
