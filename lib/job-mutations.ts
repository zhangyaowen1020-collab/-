import { z } from "zod";

const groupMutation = z.object({
  applyMode: z.enum(["top", "bottom", "set", "full_look"]),
});

export function assertMutationVersion(value: string | null) {
  if (!value || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error("If-Match-Version 必须是非负整数。");
  }
  return Number(value);
}

export function parseGroupMutation(value: unknown) {
  return groupMutation.parse(value);
}
