import type { Phase } from "@/lib/domain";

type SavedAsset = {
  role: "model" | "top" | "bottom";
  original_name: string;
  width: number;
  height: number;
  asset_ordinal?: number;
};

type SavedGroup = {
  group_id: string;
  apply_mode: "top" | "bottom" | "set";
  baseline_attempt: number;
  expansion_attempt: number;
  assets: SavedAsset[];
};

export function handoffInputFromJob(
  job: { job_date: string; groups: SavedGroup[] },
  phase: Phase,
) {
  return {
    jobDate: job.job_date,
    phase,
    groups: job.groups
      .filter((group) => group.assets.some((asset) => asset.role === "model"))
      .map((group) => ({
        groupId: group.group_id,
        applyMode: group.apply_mode,
        attempt: (phase === "baseline" ? group.baseline_attempt : group.expansion_attempt) + 1,
        assets: [...group.assets].sort((left, right) => (left.asset_ordinal ?? 0) - (right.asset_ordinal ?? 0)).map((asset) => ({
          role: asset.role,
          originalName: asset.original_name,
          width: asset.width,
          height: asset.height,
        })),
      })),
  };
}
