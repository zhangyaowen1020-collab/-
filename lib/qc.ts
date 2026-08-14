import { z } from "zod";

const status = z.enum(["PASS", "FAIL", "N/A"]);

export const reviewSchema = z.object({
  identity: status,
  body_pose: status,
  background: status,
  garment_structure: status,
  color_material: status,
  logo_print: status,
  occlusion: status,
  group_consistency: status,
  final_status: z.enum(["PASS", "FAIL"]),
});

export type ReviewPayload = z.infer<typeof reviewSchema>;

export function finalReviewStatus(review: Omit<ReviewPayload, "final_status"> | ReviewPayload) {
  const fields = [
    review.identity, review.body_pose, review.background, review.garment_structure,
    review.color_material, review.logo_print, review.occlusion, review.group_consistency,
  ];
  return fields.every((value) => value === "PASS" || value === "N/A") ? "PASS" : "FAIL";
}

export function validateReview(value: unknown, technicalStatus: "PASS" | "FAIL") {
  const review = reviewSchema.parse(value);
  if (review.final_status !== finalReviewStatus(review)) {
    throw new Error("人工质检结论与八项检查不一致。");
  }
  if (technicalStatus !== "PASS" && review.final_status === "PASS") {
    throw new Error("技术检查未通过，不能一键通过。");
  }
  return review;
}
