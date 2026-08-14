export type Phase = "baseline" | "final";
export type TechnicalStatus = "PASS" | "FAIL";

export function outputFileName(
  groupId: string,
  targetOrdinal: number,
  phase: Phase,
  attempt: number,
  managedStem: string,
) {
  const phaseCode = phase === "baseline" ? "B" : "F";
  return `${groupId}-T${String(targetOrdinal).padStart(2, "0")}-${phaseCode}${String(attempt).padStart(2, "0")}-${managedStem}-v1.png`;
}

export function nextGroupId(job: { next_group_number: number }) {
  if (!Number.isInteger(job.next_group_number) || job.next_group_number < 1) {
    throw new Error("next_group_number 必须是正整数。");
  }
  if (job.next_group_number > 99) throw new Error("每日最多 99 个任务组。");
  return {
    groupId: `G${String(job.next_group_number).padStart(2, "0")}`,
    nextGroupNumber: job.next_group_number + 1,
  };
}

export function canQuickPass(check: { status: TechnicalStatus }) {
  return check.status === "PASS";
}
