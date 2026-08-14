import { jsonError } from "@/lib/api";
import { assertMutationVersion, parseGroupMutation } from "@/lib/job-mutations";
import { addGroup, getJobByDate } from "@/lib/repositories";
import { parseJobDate, parseJsonBody, requireWriteAccess } from "@/lib/request-guards";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobDate: string }> },
) {
  try {
    const client = requireWriteAccess(request);
    const { jobDate } = await context.params;
    const created = await addGroup(
      client,
      parseJobDate(jobDate),
      assertMutationVersion(request.headers.get("if-match-version")),
      parseGroupMutation(parseJsonBody(await request.json().catch(() => null))).applyMode,
    );
    const job = await getJobByDate(client, jobDate);
    return Response.json({ group: created, job, version: job?.version });
  } catch (error) {
    return jsonError(error);
  }
}
