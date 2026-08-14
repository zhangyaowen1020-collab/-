import { z } from "zod";

import { ApiError, requireSameOrigin, requireSession } from "@/lib/api";
import { serverEnv } from "@/lib/env";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const jobDate = z.string().regex(/^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/, "任务日期无效。");
const groupId = z.string().regex(/^G[0-9]{2}$/, "任务组编号无效。");

export function requireReadAccess(request: Request) {
  const environment = serverEnv();
  requireSession(request, environment.SESSION_SECRET);
  return createSupabaseAdmin(environment);
}

export function requireWriteAccess(request: Request) {
  const environment = serverEnv();
  requireSession(request, environment.SESSION_SECRET);
  requireSameOrigin(request);
  return createSupabaseAdmin(environment);
}

export function parseJobDate(value: string) {
  return jobDate.parse(value);
}

export function parseGroupId(value: string) {
  return groupId.parse(value);
}

export function parseJsonBody(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "请求内容无效。");
  }
  return value;
}
