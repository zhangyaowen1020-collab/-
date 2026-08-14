import { describe, expect, it } from "vitest";

import { assertMutationVersion, parseGroupMutation } from "@/lib/job-mutations";

describe("job mutation requests", () => {
  it("requires a non-negative optimistic-concurrency version", () => {
    expect(() => assertMutationVersion(null)).toThrow(/If-Match-Version/);
    expect(() => assertMutationVersion("-1")).toThrow(/If-Match-Version/);
    expect(assertMutationVersion("7")).toBe(7);
  });

  it("accepts only the three supported outfit modes", () => {
    expect(parseGroupMutation({ applyMode: "set" })).toEqual({ applyMode: "set" });
    expect(() => parseGroupMutation({ applyMode: ["set"] })).toThrow();
  });
});
