export function canDeleteGroup(group: { status: string; outputs: unknown[] }) {
  return group.status === "DRAFT" && group.outputs.length === 0;
}

export function groupAssetSlots(mode: "top" | "bottom" | "set"): Array<"model" | "top" | "bottom"> {
  return mode === "top" ? ["model", "top"] : mode === "bottom" ? ["model", "bottom"] : ["model", "top", "bottom"];
}

export function needsResultUpload(progress: { expected: number; uploaded: number }) {
  return progress.uploaded < progress.expected;
}
