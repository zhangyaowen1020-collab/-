export function canDeleteGroup(group: { status: string; outputs: unknown[] }) {
  return group.status === "DRAFT" && group.outputs.length === 0;
}

export function groupAssetSlots(mode: "top" | "bottom" | "set" | "full_look"): Array<"model" | "top" | "bottom" | "full_look"> {
  return mode === "top" ? ["model", "top"] : mode === "bottom" ? ["model", "bottom"] : mode === "full_look" ? ["full_look", "model"] : ["model", "top", "bottom"];
}

export function needsResultUpload(progress: { expected: number; uploaded: number }) {
  return progress.uploaded < progress.expected;
}
