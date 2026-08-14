import { createHash, randomUUID } from "node:crypto";

import { ApiError, jsonError } from "@/lib/api";
import { imageMetadata, safeImageUpload } from "@/lib/image-validation";
import { assertMutationVersion } from "@/lib/job-mutations";
import { addAsset, getJobByDate } from "@/lib/repositories";
import { parseGroupId, parseJobDate, requireWriteAccess } from "@/lib/request-guards";

const validRoles = new Set(["model", "top", "bottom", "full_look"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ jobDate: string; groupId: string; role: string }> },
) {
  try {
    const client = requireWriteAccess(request);
    const { jobDate: rawJobDate, groupId: rawGroupId, role: rawRole } = await context.params;
    if (!validRoles.has(rawRole)) throw new ApiError(400, "素材类型无效。");
    const jobDate = parseJobDate(rawJobDate);
    const groupId = parseGroupId(rawGroupId);
    const expectedVersion = assertMutationVersion(request.headers.get("if-match-version"));
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "请选择一张图片。");
    const { extension, safeName } = safeImageUpload(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { width, height } = imageMetadata(bytes);
    const job = await getJobByDate(client, jobDate);
    const group = job?.groups.find((item) => (item as { group_id?: string }).group_id === groupId) as { id?: string } | undefined;
    if (!job || !group?.id) throw new ApiError(404, "未找到该任务组。");
    const objectKey = `jobs/${job.id}/groups/${group.id}/${rawRole}/${randomUUID()}.${extension}`;
    const upload = await client.storage.from("tryon-assets").upload(objectKey, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) throw new ApiError(500, "图片写入私有存储失败。");
    try {
      const stored = await addAsset(client, {
        jobDate,
        expectedVersion,
        groupId,
        role: rawRole as "model" | "top" | "bottom" | "full_look",
        originalName: safeName,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        width,
        height,
        objectKey,
      });
      const refreshed = await getJobByDate(client, jobDate);
      return Response.json({ asset: stored, job: refreshed, version: refreshed?.version }, { status: 201 });
    } catch (error) {
      await client.storage.from("tryon-assets").remove([objectKey]);
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}
