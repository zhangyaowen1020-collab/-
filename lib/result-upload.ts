import { expectedOutput } from "@/lib/output-contract";
import type { Phase } from "@/lib/domain";

type Model = { originalName: string; width: number; height: number };

export function resolveResultUpload(
  group: { groupId: string; phase: Phase; attempt: number; models: Model[] },
  fileName: string,
  width: number,
  height: number,
) {
  for (let index = 0; index < group.models.length; index += 1) {
    const targetOrdinal = index + 1;
    const model = group.models[index];
    const contract = expectedOutput({
      groupId: group.groupId,
      phase: group.phase,
      attempt: group.attempt,
      targetOrdinal,
      modelName: model.originalName,
      width: model.width,
      height: model.height,
    });
    if (contract.outputFile === fileName) {
      return {
        outputFile: fileName,
        targetOrdinal,
        technicalStatus: contract.isCorrectUpload(fileName, width, height) ? "PASS" as const : "FAIL" as const,
      };
    }
  }
  throw new Error("成图文件名不在本轮输出合同中。");
}
