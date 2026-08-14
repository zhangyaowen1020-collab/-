import { z } from "zod";

import { jsonError } from "@/lib/api";
import { createJob } from "@/lib/repositories";
import { parseJsonBody, requireWriteAccess } from "@/lib/request-guards";

const createJobBody = z.object({
  jobDate: z.string().regex(/^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/),
});

export async function POST(request: Request) {
  try {
    const client = requireWriteAccess(request);
    const body = createJobBody.parse(parseJsonBody(await request.json().catch(() => null)));
    const job = await createJob(client, body.jobDate);
    return Response.json({ job, version: job.version }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
