import { ApiError, jsonError } from "@/lib/api";
import { assertMutationVersion } from "@/lib/job-mutations";
import { findOutputInJob, getJobByDate, saveReview } from "@/lib/repositories";
import { validateReview } from "@/lib/qc";
import { parseJobDate, parseJsonBody, requireWriteAccess } from "@/lib/request-guards";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ jobDate: string; outputFile: string }> },
) {
  try {
    const client = requireWriteAccess(request);
    const { jobDate: rawJobDate, outputFile } = await context.params;
    const jobDate = parseJobDate(rawJobDate);
    const expectedVersion = assertMutationVersion(request.headers.get("if-match-version"));
    const job = await getJobByDate(client, jobDate);
    if (!job) throw new ApiError(404, "未找到该任务。");
    const output = findOutputInJob(job as Parameters<typeof findOutputInJob>[0], outputFile);
    if (!output) throw new ApiError(404, "未找到该成图。");
    const review = validateReview(
      parseJsonBody(await request.json().catch(() => null)),
      output.technical_status,
    );
    await saveReview(client, { jobDate, expectedVersion, outputId: output.id, review });
    const refreshed = await getJobByDate(client, jobDate);
    return Response.json({ job: refreshed, version: refreshed?.version });
  } catch (error) {
    return jsonError(error);
  }
}
