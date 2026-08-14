import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api";

export type JobSnapshot = {
  id: string;
  job_date: string;
  status: string;
  next_group_number: number;
  version: number;
  groups: unknown[];
};

export type JobOutput = {
  id: string;
  output_file: string;
  object_key: string;
  technical_status: "PASS" | "FAIL";
};

export function findOutputInJob(
  job: { groups: Array<{ group_id?: string; outputs?: JobOutput[] }> },
  outputFile: string,
) {
  for (const group of job.groups) {
    const output = group.outputs?.find((item) => item.output_file === outputFile);
    if (output) return output;
  }
  return null;
}

function repositoryError(error: { message: string } | null) {
  const message = error?.message ?? "数据库请求失败。";
  if (message.includes("VERSION_CONFLICT")) {
    return new ApiError(409, "该任务已被另一台设备修改，请刷新后重试。");
  }
  if (message.includes("JOB_NOT_FOUND") || message.includes("GROUP_NOT_FOUND") || message.includes("ASSET_NOT_FOUND")) {
    return new ApiError(404, "未找到该任务或任务组。");
  }
  if (message.includes("GROUP_NOT_DRAFT") || message.includes("GROUP_HAS_OUTPUTS")) {
    return new ApiError(400, "只有尚未生成结果的草稿任务组可以删除。");
  }
  if (message.includes("GROUP_LIMIT_REACHED")) {
    return new ApiError(400, "单个任务最多可创建 99 个任务组。");
  }
  if (message.includes("MODEL_LIMIT_REACHED")) {
    return new ApiError(400, "每个任务组最多上传 5 张模特图。");
  }
  if (message.includes("INVALID_APPLY_MODE")) {
    return new ApiError(400, "换装模式无效。");
  }
  if (message.includes("TECHNICAL_CHECK_FAILED")) {
    return new ApiError(400, "技术检查未通过，不能一键通过。");
  }
  if (message.includes("OUTPUT_NOT_FOUND")) {
    return new ApiError(404, "未找到该成图。");
  }
  return new ApiError(500, "数据库暂时无法处理请求。");
}

const jobSelect = "id, job_date, status, next_group_number, version, groups(id, group_id, apply_mode, status, baseline_attempt, expansion_attempt, assets(id, role, original_name, width, height, object_key, asset_ordinal), outputs(id, phase, attempt, output_file, technical_status, object_key, reviews(*)))";

export async function getJobByDate(client: SupabaseClient, jobDate: string): Promise<JobSnapshot | null> {
  const result = await client.from("jobs").select(jobSelect).eq("job_date", jobDate).maybeSingle();
  if (result.error) throw repositoryError(result.error);
  return result.data as JobSnapshot | null;
}

export async function createJob(client: SupabaseClient, jobDate: string) {
  const inserted = await client
    .from("jobs")
    .upsert({ job_date: jobDate }, { onConflict: "job_date", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  if (inserted.error) throw repositoryError(inserted.error);
  const job = await getJobByDate(client, jobDate);
  if (!job) throw new ApiError(500, "任务创建后无法读取。");
  return job;
}

export async function addGroup(
  client: SupabaseClient,
  jobDate: string,
  expectedVersion: number,
  applyMode: "top" | "bottom" | "set" | "full_look",
) {
  const result = await client.rpc("add_group", {
    p_job_date: jobDate,
    p_expected_version: expectedVersion,
    p_apply_mode: applyMode,
  }).single();
  if (result.error) throw repositoryError(result.error);
  return result.data;
}

export async function deleteDraftGroup(
  client: SupabaseClient,
  jobDate: string,
  expectedVersion: number,
  groupId: string,
) {
  const job = await getJobByDate(client, jobDate);
  const group = job?.groups.find((item) => (item as { group_id?: string }).group_id === groupId) as
    | { assets?: Array<{ object_key?: string }> }
    | undefined;

  const result = await client.rpc("delete_draft_group", {
    p_job_date: jobDate,
    p_expected_version: expectedVersion,
    p_group_id: groupId,
  }).single();
  if (result.error) throw repositoryError(result.error);

  const objectKeys = group?.assets?.flatMap((asset) => asset.object_key ? [asset.object_key] : []) ?? [];
  if (objectKeys.length > 0) {
    // Database deletion already succeeded. A failed cleanup only leaves private,
    // unreachable storage objects; it cannot revive or expose a deleted group.
    await client.storage.from("tryon-assets").remove(objectKeys);
  }
  return result.data;
}

export async function deleteDraftAsset(
  client: SupabaseClient,
  parameters: {
    jobDate: string;
    expectedVersion: number;
    groupId: string;
    role: "model" | "top" | "bottom" | "full_look";
    assetId: string;
  },
) {
  const result = await client.rpc("delete_draft_asset", {
    p_job_date: parameters.jobDate,
    p_expected_version: parameters.expectedVersion,
    p_group_id: parameters.groupId,
    p_role: parameters.role,
    p_asset_id: parameters.assetId,
  }).single();
  if (result.error) throw repositoryError(result.error);
  const deleted = result.data as { version: number; object_key: string };

  if (deleted.object_key) {
    // The database row is already gone. A failed storage cleanup only leaves
    // an unreachable private object and never restores the deleted asset.
    await client.storage.from("tryon-assets").remove([deleted.object_key]);
  }
  return deleted;
}

export async function addAsset(
  client: SupabaseClient,
  parameters: {
    jobDate: string;
    expectedVersion: number;
    groupId: string;
    role: "model" | "top" | "bottom" | "full_look";
    originalName: string;
    sha256: string;
    width: number;
    height: number;
    objectKey: string;
  },
) {
  const result = await client.rpc("add_asset", {
    p_job_date: parameters.jobDate,
    p_expected_version: parameters.expectedVersion,
    p_group_id: parameters.groupId,
    p_role: parameters.role,
    p_original_name: parameters.originalName,
    p_sha256: parameters.sha256,
    p_width: parameters.width,
    p_height: parameters.height,
    p_object_key: parameters.objectKey,
    p_asset_ordinal: null,
  }).single();
  if (result.error) throw repositoryError(result.error);
  return result.data;
}

export async function addOutput(
  client: SupabaseClient,
  parameters: {
    jobDate: string;
    expectedVersion: number;
    groupId: string;
    phase: "baseline" | "final";
    attempt: number;
    outputFile: string;
    objectKey: string;
    technicalStatus: "PASS" | "FAIL";
  },
) {
  const result = await client.rpc("add_output", {
    p_job_date: parameters.jobDate,
    p_expected_version: parameters.expectedVersion,
    p_group_id: parameters.groupId,
    p_phase: parameters.phase,
    p_attempt: parameters.attempt,
    p_output_file: parameters.outputFile,
    p_object_key: parameters.objectKey,
    p_technical_status: parameters.technicalStatus,
  }).single();
  if (result.error) throw repositoryError(result.error);
  return result.data;
}

export async function deleteOutput(
  client: SupabaseClient,
  parameters: { jobDate: string; expectedVersion: number; outputFile: string },
) {
  const result = await client.rpc("delete_output", {
    p_job_date: parameters.jobDate,
    p_expected_version: parameters.expectedVersion,
    p_output_file: parameters.outputFile,
  }).single();
  if (result.error) throw repositoryError(result.error);
  const deleted = result.data as { version: number; object_key: string };

  if (deleted.object_key) {
    // The database row and any review are already removed. A failed storage
    // cleanup can only leave one unreachable private object.
    await client.storage.from("tryon-assets").remove([deleted.object_key]);
  }
  return deleted;
}

export async function saveReview(
  client: SupabaseClient,
  parameters: {
    jobDate: string;
    expectedVersion: number;
    outputId: string;
    review: {
      identity: string; body_pose: string; background: string; garment_structure: string;
      color_material: string; logo_print: string; occlusion: string; group_consistency: string;
      final_status: string;
    };
  },
) {
  const review = parameters.review;
  const result = await client.rpc("save_review", {
    p_job_date: parameters.jobDate,
    p_expected_version: parameters.expectedVersion,
    p_output_id: parameters.outputId,
    p_identity: review.identity,
    p_body_pose: review.body_pose,
    p_background: review.background,
    p_garment_structure: review.garment_structure,
    p_color_material: review.color_material,
    p_logo_print: review.logo_print,
    p_occlusion: review.occlusion,
    p_group_consistency: review.group_consistency,
    p_final_status: review.final_status,
  }).single();
  if (result.error) throw repositoryError(result.error);
  return result.data;
}
