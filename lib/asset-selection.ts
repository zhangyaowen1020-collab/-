export const MAX_MODELS_PER_GROUP = 5;

export function selectModelFiles(existingCount: number, files: File[]) {
  const remaining = Math.max(0, MAX_MODELS_PER_GROUP - existingCount);
  const accepted = files.slice(0, remaining);
  return { accepted, rejected: accepted.length !== files.length };
}
