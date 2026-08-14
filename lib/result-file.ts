export function validateResultFile(input: {
  declaredOutputFile: string;
  uploadedName: string;
  contentType: string;
}) {
  if (input.uploadedName !== input.declaredOutputFile) {
    throw new Error("成图文件名必须与输出合同完全一致。");
  }
  if (input.contentType !== "image/png") {
    throw new Error("成图必须是 PNG 文件。");
  }
}
