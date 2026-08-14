import { describe, expect, it } from "vitest";

import { MAX_MODELS_PER_GROUP, selectDroppedImageFiles, selectModelFiles } from "@/lib/asset-selection";

describe("model image selection", () => {
  const files = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg"] as unknown as File[];

  it("keeps up to five model images", () => {
    expect(MAX_MODELS_PER_GROUP).toBe(5);
    expect(selectModelFiles(0, files.slice(0, 5))).toEqual({ accepted: files.slice(0, 5), rejected: false });
  });

  it("only accepts the remaining model slots", () => {
    expect(selectModelFiles(4, files.slice(0, 2))).toEqual({ accepted: [files[0]], rejected: true });
    expect(selectModelFiles(5, [files[0]])).toEqual({ accepted: [], rejected: true });
  });
});

describe("dropped image selection", () => {
  const jpg = { name: "look.jpg", type: "image/jpeg" } as File;
  const png = { name: "detail.png", type: "image/png" } as File;
  const text = { name: "notes.txt", type: "text/plain" } as File;

  it("keeps every valid image dropped on a model card", () => {
    expect(selectDroppedImageFiles("model", [jpg, png])).toEqual({
      accepted: [jpg, png],
      rejectedNonImages: false,
      ignoredExtra: false,
    });
  });

  it("keeps only the first valid image dropped on a reference card", () => {
    expect(selectDroppedImageFiles("top", [jpg, png])).toEqual({
      accepted: [jpg],
      rejectedNonImages: false,
      ignoredExtra: true,
    });
  });

  it("rejects non-image drops before any upload starts", () => {
    expect(selectDroppedImageFiles("model", [text, jpg])).toEqual({
      accepted: [jpg],
      rejectedNonImages: true,
      ignoredExtra: false,
    });
  });
});
