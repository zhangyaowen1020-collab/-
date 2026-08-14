import { ApiError, jsonError } from "@/lib/api";
import { findOutputInJob, getJobByDate } from "@/lib/repositories";
import { parseJobDate, requireReadAccess } from "@/lib/request-guards";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobDate: string; outputFile: string }> },
) {
  try {
    const client = requireReadAccess(request);
    const { jobDate: rawJobDate, outputFile } = await context.params;
    const job = await getJobByDate(client, parseJobDate(rawJobDate));
    if (!job) throw new ApiError(404, "未找到该任务。");
    const output = findOutputInJob(job as Parameters<typeof findOutputInJob>[0], outputFile);
    if (!output) throw new ApiError(404, "未找到该成图。");
    const result = await client.storage.from("tryon-assets").download(output.object_key);
    if (result.error || !result.data) throw new ApiError(404, "成图暂时无法读取。");
    return new Response(result.data, {
      headers: { "Content-Type": result.data.type || "image/png", "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    return jsonError(error);
  }
}
