export function validateResultFile(input: {
  contentType: string;
}) {
  if (input.contentType !== "image/png") {
    throw new Error("成图必须是 PNG 文件。");
  }
}
