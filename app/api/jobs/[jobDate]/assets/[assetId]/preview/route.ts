import { ApiError, jsonError } from "@/lib/api";
import { getJobByDate } from "@/lib/repositories";
import { parseJobDate, requireReadAccess } from "@/lib/request-guards";

type StoredAsset = { id: string; object_key: string };

export async function GET(
  request: Request,
  context: { params: Promise<{ jobDate: string; assetId: string }> },
) {
  try {
    const client = requireReadAccess(request);
    const { jobDate: rawJobDate, assetId } = await context.params;
    const job = await getJobByDate(client, parseJobDate(rawJobDate));
    if (!job) throw new ApiError(404, "未找到该任务。");
    const asset = job.groups
      .flatMap((value) => (value as { assets?: StoredAsset[] }).assets ?? [])
      .find((value) => value.id === assetId);
    if (!asset) throw new ApiError(404, "未找到该图片。");
    const result = await client.storage.from("tryon-assets").download(asset.object_key);
    if (result.error || !result.data) throw new ApiError(404, "图片暂时无法读取。");
    return new Response(result.data, {
      headers: { "Content-Type": result.data.type || "image/jpeg", "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    return jsonError(error);
  }
}
