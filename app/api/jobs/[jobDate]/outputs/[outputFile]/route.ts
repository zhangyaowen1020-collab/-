import { randomUUID } from "node:crypto";

import { ApiError, jsonError } from "@/lib/api";
import { imageMetadata } from "@/lib/image-validation";
import { findResultContractInJob } from "@/lib/job-result-contract";
import { assertMutationVersion } from "@/lib/job-mutations";
import { addOutput, getJobByDate } from "@/lib/repositories";
import { validateResultFile } from "@/lib/result-file";
import { parseJobDate, requireWriteAccess } from "@/lib/request-guards";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobDate: string; outputFile: string }> },
) {
  try {
    const client = requireWriteAccess(request);
    const { jobDate: rawJobDate, outputFile } = await context.params;
    const jobDate = parseJobDate(rawJobDate);
    const expectedVersion = assertMutationVersion(request.headers.get("if-match-version"));
    const phase = request.headers.get("x-tryon-phase");
    const attempt = Number(request.headers.get("x-tryon-attempt"));
    if ((phase !== "baseline" && phase !== "final") || !Number.isInteger(attempt) || attempt < 1) {
      throw new ApiError(400, "请提供有效的成图阶段和轮次。");
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "请选择成图 PNG 文件。");
    validateResultFile({ contentType: file.type });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const dimensions = imageMetadata(bytes);
    const job = await getJobByDate(client, jobDate);
    if (!job) throw new ApiError(404, "未找到该任务。");
    let contract;
    try {
      contract = findResultContractInJob(job as Parameters<typeof findResultContractInJob>[0], phase, attempt, outputFile);
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : "输出合同无效。");
    }
    const objectKey = "jobs/" + job.id + "/groups/" + contract.groupUuid + "/outputs/" + phase + "/" + attempt + "/" + randomUUID() + ".png";
    const upload = await client.storage.from("tryon-assets").upload(objectKey, bytes, {
      contentType: "image/png",
      upsert: false,
    });
    if (upload.error) throw new ApiError(500, "成图写入私有存储失败。");
    try {
      const stored = await addOutput(client, {
        jobDate,
        expectedVersion,
        groupId: contract.groupId,
        phase,
        attempt,
        outputFile,
        objectKey,
        technicalStatus: dimensions.width === contract.width && dimensions.height === contract.height ? "PASS" : "FAIL",
      });
      const refreshed = await getJobByDate(client, jobDate);
      return Response.json({ output: stored, job: refreshed, version: refreshed?.version }, { status: 201 });
    } catch (error) {
      await client.storage.from("tryon-assets").remove([objectKey]);
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}
