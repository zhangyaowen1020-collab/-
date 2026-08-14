import { type Phase } from "@/lib/domain";
import { expectedOutput } from "@/lib/output-contract";

type Asset = {
  role: "model" | "top" | "bottom" | "full_look";
  originalName: string;
  width?: number;
  height?: number;
};

type Group = {
  groupId: string;
  applyMode: "top" | "bottom" | "set" | "full_look";
  attempt: number;
  assets: Asset[];
};

export function renderHandoff(input: { jobDate: string; phase: Phase; groups: Group[] }) {
  const title = input.jobDate + " " + (input.phase === "baseline" ? "baseline" : "final") + " 换装任务";
  const rules = [
    "# " + title,
    "每张仍以原模特图为唯一编辑目标；服装参考图只作为确认外观参考。",
    "保持身份、身体、姿势、手、背景、鞋包和配饰不变。",
  ];
  const renderedGroups = input.groups.map((group) => {
    const models = group.assets.filter((asset) => asset.role === "model");
    const top = group.assets.find((asset) => asset.role === "top");
    const bottom = group.assets.find((asset) => asset.role === "bottom");
    const fullLook = group.assets.find((asset) => asset.role === "full_look");
    const mode = group.applyMode === "set" ? "套装（上装和下装）" : group.applyMode === "top" ? "仅上装" : group.applyMode === "bottom" ? "仅下装" : "整套换装";
    const assets = [
      "模式：" + mode,
      top ? "上装参考：" + top.originalName : "",
      bottom ? "下装参考：" + bottom.originalName : "",
      fullLook ? "整套参考图：" + fullLook.originalName : "",
    ].filter(Boolean);
    const targets = models.map((model, index) => {
      const output = expectedOutput({
        groupId: group.groupId,
        phase: input.phase,
        attempt: group.attempt,
        targetOrdinal: index + 1,
        modelName: model.originalName,
        width: model.width ?? 1,
        height: model.height ?? 1,
      }).outputFile;
      const size = model.width && model.height ? model.width + "×" + model.height : "原图尺寸";
      return [
        "目标模特：" + model.originalName,
        "输出合同：" + model.originalName + " -> " + output,
        "每张成图必须恢复到对应原模特图的像素尺寸：" + size + "。",
      ].join("\n");
    });
    return ["## " + group.groupId, ...assets, ...targets, "重点细节：逐项还原可见结构、面料、版型和图案，不要错版。"].join("\n");
  });
  return [...rules, ...renderedGroups].join("\n\n");
}
