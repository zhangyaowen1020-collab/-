"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { expectedOutput } from "@/lib/output-contract";
import { quickPassPayload } from "@/lib/quick-pass";
import { selectDroppedImageFiles, selectModelFiles } from "@/lib/asset-selection";
import { canDeleteGroup, groupAssetSlots } from "@/lib/workbench-view";

type Asset = {
  id: string;
  role: "model" | "top" | "bottom" | "full_look";
  original_name: string;
  width: number;
  height: number;
  asset_ordinal: number;
};
type Output = {
  id: string;
  output_file: string;
  technical_status: "PASS" | "FAIL";
  reviews?: Array<{ final_status: "PASS" | "FAIL" }>;
};
type Group = {
  id: string;
  group_id: string;
  apply_mode: "top" | "bottom" | "set" | "full_look";
  status: string;
  baseline_attempt: number;
  assets: Asset[];
  outputs: Output[];
};
type Job = { id: string; job_date: string; version: number; groups: Group[] };

const roleName = { model: "模特图", top: "上装", bottom: "下装", full_look: "整套参考图" };

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function Workbench() {
  const [jobDate, setJobDate] = useState(today);
  const [job, setJob] = useState<Job | null>(null);
  const [mode, setMode] = useState<Group["apply_mode"]>("set");
  const [message, setMessage] = useState("");
  const [handoff, setHandoff] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const headers = useMemo(() => {
    const result: Record<string, string> = {};
    if (job) result["If-Match-Version"] = String(job.version);
    return result;
  }, [job]);

  async function load(date = jobDate) {
    const response = await fetch("/api/jobs/" + date);
    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }
    if (response.status === 404) {
      setJob(null);
      return;
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "读取任务失败。");
    setJob(payload.job);
  }

  useEffect(() => { void load(); }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  async function openJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDate }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "创建任务失败。");
      setJob(payload.job);
      setHandoff("");
    });
  }

  async function addGroup() {
    await run(async () => {
      if (!job) throw new Error("请先新建或打开当天任务。");
      const response = await fetch("/api/jobs/" + job.job_date + "/groups", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ applyMode: mode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "新增任务组失败。");
      setJob(payload.job);
    });
  }

  async function uploadAsset(group: Group, role: Asset["role"], file?: File) {
    await run(async () => {
      if (!file || !job) throw new Error("请选择图片。");
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/jobs/" + job.job_date + "/groups/" + group.group_id + "/assets/" + role, {
        method: "POST", headers, body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "素材上传失败。");
      setJob(payload.job);
    });
  }

  async function uploadModels(group: Group, files: File[]) {
    if (!job) return;
    const selection = selectModelFiles(group.assets.filter((asset) => asset.role === "model").length, files);
    await run(async () => {
      let currentJob = job;
      for (const file of selection.accepted) {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/jobs/" + currentJob.job_date + "/groups/" + group.group_id + "/assets/model", {
          method: "POST", headers: { "If-Match-Version": String(currentJob.version) }, body: form,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "模特图上传失败。");
        currentJob = payload.job;
        setJob(currentJob);
      }
    });
    if (selection.rejected) setMessage("每个任务组最多上传 5 张模特图。");
  }

  function assetSlotKey(group: Group, role: Asset["role"]) {
    return `${group.id}:${role}`;
  }

  function uploadSelectedFiles(group: Group, role: Asset["role"], files: File[]) {
    if (busy) {
      setMessage("正在上传，请等待当前操作完成。");
      return;
    }
    const selection = selectDroppedImageFiles(role, files);
    if (selection.accepted.length === 0) {
      setMessage(selection.rejectedNonImages ? "请只拖入 JPG、PNG 或 WebP 图片。" : "没有接收到图片文件。");
      return;
    }
    if (role === "model") void uploadModels(group, selection.accepted);
    else void uploadAsset(group, role, selection.accepted[0]);
    if (selection.rejectedNonImages || selection.ignoredExtra) {
      setMessage("已上传可用图片；服装参考卡每次只接收第一张图片。");
    }
  }

  function handleAssetDrop(event: DragEvent<HTMLDivElement>, group: Group, role: Asset["role"]) {
    event.preventDefault();
    setDragTarget(null);
    uploadSelectedFiles(group, role, Array.from(event.dataTransfer.files));
  }

  function previewUrl(asset: Asset) {
    return job ? "/api/jobs/" + job.job_date + "/assets/" + asset.id + "/preview" : "";
  }

  async function removeGroup(group: Group) {
    if (!job || !window.confirm("确认删除 " + group.group_id + " 吗？草稿素材也会删除。")) return;
    await run(async () => {
      const response = await fetch("/api/jobs/" + job.job_date + "/groups/" + group.group_id, {
        method: "DELETE", headers,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "删除任务组失败。");
      setJob(payload.job);
    });
  }

  async function createHandoff() {
    await run(async () => {
      if (!job) throw new Error("请先新建任务。");
      const response = await fetch("/api/jobs/" + job.job_date + "/handoff/baseline");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "生成交接文本失败。");
      setHandoff(payload.markdown);
    });
  }

  async function copyHandoff() {
    await run(async () => {
      if (!handoff) throw new Error("请先生成交接文本。");
      await navigator.clipboard.writeText(handoff);
      setMessage("交接文本已复制，可粘贴给 ChatGPT 或 Codex。");
    });
  }

  async function uploadOutput(group: Group, asset: Asset, ordinal: number, file?: File) {
    await run(async () => {
      if (!job || !file) throw new Error("请选择对应的 PNG 成图。");
      const outputFile = expectedOutput({
        groupId: group.group_id,
        phase: "baseline",
        attempt: group.baseline_attempt + 1,
        targetOrdinal: ordinal,
        modelName: asset.original_name,
        width: asset.width,
        height: asset.height,
      }).outputFile;
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/jobs/" + job.job_date + "/outputs/" + encodeURIComponent(outputFile), {
        method: "POST",
        headers: { ...headers, "x-tryon-phase": "baseline", "x-tryon-attempt": String(group.baseline_attempt + 1) },
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "成图上传失败。");
      setJob(payload.job);
    });
  }

  async function quickPass(output: Output) {
    await run(async () => {
      if (!job) throw new Error("未打开任务。");
      const response = await fetch("/api/jobs/" + job.job_date + "/reviews/" + encodeURIComponent(output.output_file), {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(quickPassPayload({ status: output.technical_status })),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "保存质检失败。");
      setJob(payload.job);
    });
  }

  return <main className="workbench-shell">
    <header className="workbench-header">
      <div><p className="eyebrow">云端协作工作台</p><h1>一手 AI 换装</h1></div>
      <a href="/login">切换密码</a>
    </header>
    <form className="card date-card" onSubmit={openJob}>
      <label>任务日期<input type="date" value={jobDate} onChange={(event) => setJobDate(event.target.value)} /></label>
      <button className="primary" disabled={busy}>新建 / 打开任务</button>
      {job && <strong>当前版本：{job.version}　任务组：{job.groups.length}</strong>}
    </form>
    {message && <p className="notice" role="alert">{message}</p>}

    {job && <section className="workbench-grid">
      <section className="card">
        <h2>新增任务组</h2>
        <div className="inline-actions">
          <select value={mode} onChange={(event) => setMode(event.target.value as Group["apply_mode"])}>
            <option value="set">上装 + 下装</option><option value="top">仅上装</option><option value="bottom">仅下装</option><option value="full_look">一套换装</option>
          </select>
          <button className="primary" type="button" disabled={busy} onClick={() => void addGroup()}>新增任务组</button>
        </div>
        <p>只可删除没有结果图的草稿组；删除后编号不会复用。</p>
      </section>
      <section className="card">
        <h2>人工交接</h2>
        <div className="inline-actions">
          <button type="button" disabled={busy} onClick={() => void createHandoff()}>生成基准图交接</button>
          <button type="button" disabled={!handoff || busy} onClick={() => void copyHandoff()}>复制交接文本</button>
        </div>
        {handoff && <textarea className="handoff" readOnly value={handoff} aria-label="Codex 交接文本" />}
      </section>
    </section>}

    {job?.groups.map((group) => <section className="card group-card" key={group.id}>
      <div className="group-title">
        <h2>{group.group_id}</h2>
        <span>{group.apply_mode === "set" ? "上装 + 下装" : group.apply_mode === "top" ? "仅上装" : group.apply_mode === "bottom" ? "仅下装" : "一套换装"}</span>
        {canDeleteGroup(group) && <button type="button" className="danger" disabled={busy} onClick={() => void removeGroup(group)}>删除草稿组</button>}
      </div>
      <div className="asset-grid">
        {groupAssetSlots(group.apply_mode).map((role) => {
          const assets = group.assets.filter((asset) => asset.role === role).sort((left, right) => left.asset_ordinal - right.asset_ordinal);
          const slotKey = assetSlotKey(group, role);
          return <div className={`asset-slot ${dragTarget === slotKey ? "drag-over" : ""}`} key={role}
            onDragEnter={(event) => { event.preventDefault(); setDragTarget(slotKey); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { event.preventDefault(); setDragTarget(null); }}
            onDrop={(event) => handleAssetDrop(event, group, role)}>
            <strong>{roleName[role]}{role === "model" ? "（最多 5 张）" : ""}</strong>
            <div className="asset-preview-list">
              {assets.length === 0 ? <span>尚未上传</span> : assets.map((asset) => <figure className="asset-preview" key={asset.id}>
                <img src={previewUrl(asset)} alt={asset.original_name} />
                <figcaption>{role === "model" ? `T${String(asset.asset_ordinal).padStart(2, "0")} · ` : ""}{asset.original_name}</figcaption>
              </figure>)}
            </div>
            <label className="upload-control">{role === "model" ? "添加模特图" : "上传图片"}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple={role === "model"} disabled={busy}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.currentTarget.value = "";
                  uploadSelectedFiles(group, role, files);
                }} />
            </label>
            <p className="drop-hint">可直接将桌面图片拖到这里，或点击上传。</p>
          </div>;
        })}
      </div>
      <div className="outputs">
        <h3>基准成图与质检</h3>
        {group.outputs.map((output) => <div className="output-row" key={output.id}>
          <code>{output.output_file}</code>
          <span className={output.technical_status === "PASS" ? "pass" : "fail"}>技术：{output.technical_status}</span>
          {output.reviews?.[0] ? <span>人工：{output.reviews[0].final_status}</span>
            : output.technical_status === "PASS"
              ? <button type="button" disabled={busy} onClick={() => void quickPass(output)}>快速通过</button>
              : <span>技术检查未通过，不能快速通过</span>}
        </div>)}
        {group.assets.filter((asset) => asset.role === "model").sort((left, right) => left.asset_ordinal - right.asset_ordinal).map((asset, index) => {
          const outputFile = expectedOutput({
            groupId: group.group_id, phase: "baseline", attempt: group.baseline_attempt + 1,
            targetOrdinal: index + 1, modelName: asset.original_name, width: asset.width, height: asset.height,
          }).outputFile;
          const exists = group.outputs.some((output) => output.output_file === outputFile);
          return !exists && <label className="result-upload" key={asset.id}>
            上传 {outputFile}
            <input type="file" accept="image/png" disabled={busy}
              onChange={(event) => void uploadOutput(group, asset, index + 1, event.target.files?.[0])} />
          </label>;
        })}
      </div>
    </section>)}
  </main>;
}
