import { ApiError, jsonError } from "@/lib/api";
import { handoffInputFromJob } from "@/lib/handoff-job";
import { renderHandoff } from "@/lib/handoff";
import { getJobByDate } from "@/lib/repositories";
import { parseJobDate, requireReadAccess } from "@/lib/request-guards";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobDate: string; phase: string }> },
) {
  try {
    const client = requireReadAccess(request);
    const { jobDate: rawJobDate, phase } = await context.params;
    if (phase !== "baseline" && phase !== "final") throw new ApiError(400, "交接阶段无效。");
    const job = await getJobByDate(client, parseJobDate(rawJobDate));
    if (!job) throw new ApiError(404, "未找到该任务。");
    const data = handoffInputFromJob(job as Parameters<typeof handoffInputFromJob>[0], phase);
    if (data.groups.length === 0) throw new ApiError(400, "请先上传至少一张模特图。");
    return Response.json({ phase, markdown: renderHandoff(data) });
  } catch (error) {
    return jsonError(error);
  }
}
