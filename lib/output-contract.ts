import { outputFileName, type Phase } from "@/lib/domain";

export function managedModelStem(modelName: string, targetOrdinal: number) {
  const stem = modelName.replace(/\.[^.]+$/, "");
  const prefix = String(targetOrdinal).padStart(2, "0");
  return stem.startsWith(prefix + "-") ? stem : prefix + "-" + stem;
}

export function expectedOutput(input: {
  groupId: string;
  phase: Phase;
  attempt: number;
  targetOrdinal: number;
  modelName: string;
  width: number;
  height: number;
}) {
  const managedStem = managedModelStem(input.modelName, input.targetOrdinal);
  const outputFile = outputFileName(
    input.groupId,
    input.targetOrdinal,
    input.phase,
    input.attempt,
    managedStem,
  );
  return {
    outputFile,
    isCorrectUpload(fileName: string, width: number, height: number) {
      return fileName === outputFile && width === input.width && height === input.height;
    },
  };
}
