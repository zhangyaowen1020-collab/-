import { z } from "zod";

import { ApiError, jsonError } from "@/lib/api";
import { assertMutationVersion } from "@/lib/job-mutations";
import { deleteDraftAsset, getJobByDate } from "@/lib/repositories";
import { parseGroupId, parseJobDate, requireWriteAccess } from "@/lib/request-guards";

const validRoles = new Set(["model", "top", "bottom", "full_look"]);
const assetId = z.string().uuid();

export async function DELETE(
  request: Request,
  context: { params: Promise<{ jobDate: string; groupId: string; role: string; assetId: string }> },
) {
  try {
    const client = requireWriteAccess(request);
    const params = await context.params;
    if (!validRoles.has(params.role)) throw new ApiError(400, "素材类型无效。");
    await deleteDraftAsset(client, {
      jobDate: parseJobDate(params.jobDate),
      expectedVersion: assertMutationVersion(request.headers.get("if-match-version")),
      groupId: parseGroupId(params.groupId),
      role: params.role as "model" | "top" | "bottom" | "full_look",
      assetId: assetId.parse(params.assetId),
    });
    const job = await getJobByDate(client, params.jobDate);
    return Response.json({ job, version: job?.version });
  } catch (error) {
    return jsonError(error);
  }
}
