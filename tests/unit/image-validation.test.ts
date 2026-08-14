import { describe, expect, it } from "vitest";

import { imageMetadata, safeImageUpload } from "@/lib/image-validation";

describe("private asset validation", () => {
  it("reads a PNG's true dimensions", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(png.buffer).setUint32(16, 640);
    new DataView(png.buffer).setUint32(20, 480);

    expect(imageMetadata(png)).toEqual({ width: 640, height: 480 });
  });

  it("allows only a small supported image upload", () => {
    expect(() => safeImageUpload({ name: "look.gif", type: "image/gif", size: 100 })).toThrow(/JPG/);
    expect(() => safeImageUpload({ name: "look.jpg", type: "image/jpeg", size: 20 * 1024 * 1024 + 1 })).toThrow(/20MB/);
    expect(safeImageUpload({ name: "01 front.png", type: "image/png", size: 100 })).toEqual({
      extension: "png",
      safeName: "01-front.png",
    });
  });
});
