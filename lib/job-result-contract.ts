import type { Phase } from "@/lib/domain";
import { expectedOutput } from "@/lib/output-contract";

type ModelAsset = {
  role: "model";
  original_name: string;
  width: number;
  height: number;
  asset_ordinal: number;
};

type Group = {
  id: string;
  group_id: string;
  baseline_attempt: number;
  expansion_attempt: number;
  assets: Array<ModelAsset | { role: string; asset_ordinal?: number }>;
};

export function findResultContractInJob(
  job: { groups: Group[] },
  phase: Phase,
  attempt: number,
  outputFile: string,
) {
  for (const group of job.groups) {
    const expectedAttempt = (phase === "baseline" ? group.baseline_attempt : group.expansion_attempt) + 1;
    if (expectedAttempt !== attempt) continue;
    const models = group.assets
      .filter((asset): asset is ModelAsset => asset.role === "model")
      .sort((left, right) => left.asset_ordinal - right.asset_ordinal);
    for (let index = 0; index < models.length; index += 1) {
      const model = models[index];
      const targetOrdinal = index + 1;
      const contract = expectedOutput({
        groupId: group.group_id,
        phase,
        attempt,
        targetOrdinal,
        modelName: model.original_name,
        width: model.width,
        height: model.height,
      });
      if (contract.outputFile === outputFile) {
        return { groupId: group.group_id, groupUuid: group.id, targetOrdinal, width: model.width, height: model.height };
      }
    }
  }
  throw new Error("成图文件名不在本轮输出合同中。");
}
