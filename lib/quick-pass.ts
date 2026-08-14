import { canQuickPass, type TechnicalStatus } from "@/lib/domain";

export type ReviewPayload = {
  identity: "PASS";
  body_pose: "PASS";
  background: "PASS";
  garment_structure: "PASS";
  color_material: "PASS";
  logo_print: "N/A";
  occlusion: "PASS";
  group_consistency: "PASS";
  final_status: "PASS";
};

export function quickPassPayload(check: { status: TechnicalStatus }): ReviewPayload {
  if (!canQuickPass(check)) throw new Error("技术检查未通过，不能一键通过。");
  return {
    identity: "PASS",
    body_pose: "PASS",
    background: "PASS",
    garment_structure: "PASS",
    color_material: "PASS",
    logo_print: "N/A",
    occlusion: "PASS",
    group_consistency: "PASS",
    final_status: "PASS",
  };
}
