import { jsonError } from "@/lib/api";
import { assertMutationVersion } from "@/lib/job-mutations";
import { deleteDraftGroup, getJobByDate } from "@/lib/repositories";
import { parseGroupId, parseJobDate, requireWriteAccess } from "@/lib/request-guards";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ jobDate: string; groupId: string }> },
) {
  try {
    const client = requireWriteAccess(request);
    const { jobDate, groupId } = await context.params;
    await deleteDraftGroup(
      client,
      parseJobDate(jobDate),
      assertMutationVersion(request.headers.get("if-match-version")),
      parseGroupId(groupId),
    );
    const job = await getJobByDate(client, jobDate);
    return Response.json({ job, version: job?.version });
  } catch (error) {
    return jsonError(error);
  }
}
