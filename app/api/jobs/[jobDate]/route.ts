import { jsonError } from "@/lib/api";
import { getJobByDate } from "@/lib/repositories";
import { parseJobDate, requireReadAccess } from "@/lib/request-guards";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobDate: string }> },
) {
  try {
    const client = requireReadAccess(request);
    const { jobDate } = await context.params;
    const job = await getJobByDate(client, parseJobDate(jobDate));
    if (!job) return Response.json({ error: "未找到该任务。" }, { status: 404 });
    return Response.json({ job, version: job.version });
  } catch (error) {
    return jsonError(error);
  }
}
