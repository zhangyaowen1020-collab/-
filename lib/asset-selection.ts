export const MAX_MODELS_PER_GROUP = 5;

export type AssetRole = "model" | "top" | "bottom" | "full_look";

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function selectModelFiles(existingCount: number, files: File[]) {
  const remaining = Math.max(0, MAX_MODELS_PER_GROUP - existingCount);
  const accepted = files.slice(0, remaining);
  return { accepted, rejected: accepted.length !== files.length };
}

export function selectDroppedImageFiles(role: AssetRole, files: File[]) {
  const valid = files.filter((file) => supportedImageTypes.has(file.type));
  const accepted = role === "model" ? valid : valid.slice(0, 1);
  return {
    accepted,
    rejectedNonImages: valid.length !== files.length,
    ignoredExtra: role !== "model" && valid.length > 1,
  };
}
