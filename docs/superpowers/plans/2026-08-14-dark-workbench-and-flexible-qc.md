# Dark Workbench and Flexible QC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the cloud workbench a dark glass-style task board where operators can collapse the date picker, drag a PNG result into its slot, preview or delete it, and pass technical QC whenever the uploaded file is a readable PNG regardless of dimensions.

**Architecture:** Keep result names and object keys server-owned. The upload route records technical `PASS` after reading PNG metadata, never comparing target dimensions. A version-locked Supabase RPC deletes one output and its cascading review, after which the server deletes its private object.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Postgres/Storage, Vitest, CSS.

## Global Constraints

- Source assets remain JPG/PNG/WebP, with a maximum of five model images per group.
- Results remain PNG only; local filenames never need to match the output contract.
- Any readable PNG is technical `PASS`; pixel dimensions are not a technical gate.
- Source deletion remains draft-only; stored baseline/final result deletion also clears its QC review.
- The approved near-black glass UI uses CSS only, with white text and magenta highlights.

---

## File Structure

- `lib/result-upload.ts` — keeps output-contract mapping but makes technical status dimension-independent.
- `lib/repositories.ts` — exposes a version-safe `deleteOutput` operation.
- `app/api/jobs/[jobDate]/outputs/[outputFile]/route.ts` — writes readable PNGs as PASS and adds DELETE.
- `supabase/migrations/0008_delete_output_and_flexible_qc.sql` — service-role-only output delete RPC.
- `components/Workbench.tsx` — date collapse, output drag/drop, preview, and result delete controls.
- `app/globals.css` — dark glass layout and pill controls.
- `tests/unit/result-upload.test.ts`, `tests/integration/output-delete-rpc-contract.test.ts`, `tests/integration/output-delete-route-contract.test.ts`, `tests/unit/workbench-view.test.ts` — regressions for each behavior.

## Task 1: Flexible technical QC and safe output deletion backend

**Files:**
- Create: `supabase/migrations/0008_delete_output_and_flexible_qc.sql`
- Modify: `lib/result-upload.ts`
- Modify: `lib/repositories.ts`
- Modify: `app/api/jobs/[jobDate]/outputs/[outputFile]/route.ts`
- Modify: `tests/unit/result-upload.test.ts`
- Create: `tests/integration/output-delete-rpc-contract.test.ts`
- Create: `tests/integration/output-delete-route-contract.test.ts`

**Interfaces:**
- Consumes: `findOutputInJob`, `addOutput`, `imageMetadata`, and the `outputs -> reviews` relationship.
- Produces: `deleteOutput(client, { jobDate, expectedVersion, outputFile })` and `DELETE /api/jobs/:jobDate/outputs/:outputFile`.

- [ ] **Step 1: Write failing tests**

```ts
it("keeps a correctly contracted PNG as PASS when its dimensions differ", () => {
  expect(resolveResultUpload(group, "G01-T01-F01-01-front-v1.png", 1000, 1499))
    .toMatchObject({ technicalStatus: "PASS" });
});

expect(sql).toMatch(/create or replace function delete_output/i);
expect(sql).toMatch(/for update/i);
expect(sql).toMatch(/VERSION_CONFLICT/);
expect(sql).toMatch(/delete from outputs/i);
expect(route).toMatch(/export async function DELETE/);
expect(route).toMatch(/deleteOutput\(/);
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm test -- tests/unit/result-upload.test.ts tests/integration/output-delete-rpc-contract.test.ts tests/integration/output-delete-route-contract.test.ts
```

Expected: size test and both deletion tests fail because the behavior does not exist.

- [ ] **Step 3: Implement the minimum backend**

```ts
// lib/result-upload.ts
return { outputFile: fileName, targetOrdinal, technicalStatus: "PASS" as const };

// upload route: validate readable PNG bytes, but do not compare dimensions
imageMetadata(bytes);
await addOutput(client, { ...parameters, technicalStatus: "PASS" });

// lib/repositories.ts
export async function deleteOutput(client: SupabaseClient, parameters: {
  jobDate: string; expectedVersion: number; outputFile: string;
}) {
  const result = await client.rpc("delete_output", {
    p_job_date: parameters.jobDate,
    p_expected_version: parameters.expectedVersion,
    p_output_file: parameters.outputFile,
  }).single();
  if (result.error) throw repositoryError(result.error);
  const deleted = result.data as { version: number; object_key: string };
  if (deleted.object_key) await client.storage.from("tryon-assets").remove([deleted.object_key]);
  return deleted;
}
```

The SQL function locks the job by date, rejects stale versions, finds the output only within that job, deletes it (allowing the review FK cascade), increments job version, emits `output_deleted`, returns the object key, revokes public access, and grants only the exact signature to `service_role`.

- [ ] **Step 4: Add the route DELETE handler**

```ts
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const client = await requireWriteAccess(request);
  const jobDate = parseJobDate((await params).jobDate);
  const expectedVersion = requireVersion(request);
  const outputFile = decodeURIComponent((await params).outputFile);
  await deleteOutput(client, { jobDate, expectedVersion, outputFile });
  return NextResponse.json(await getJobByDate(client, jobDate));
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
npm test -- tests/unit/result-upload.test.ts tests/integration/output-delete-rpc-contract.test.ts tests/integration/output-delete-route-contract.test.ts
```

Expected: PASS.

```bash
git add lib/result-upload.ts lib/repositories.ts app/api/jobs/[jobDate]/outputs/[outputFile]/route.ts supabase/migrations/0008_delete_output_and_flexible_qc.sql tests/unit/result-upload.test.ts tests/integration/output-delete-rpc-contract.test.ts tests/integration/output-delete-route-contract.test.ts
git commit -m "feat: allow flexible result QC and deletion"
```

## Task 2: Dark UI, date collapse, result dragging and delete action

**Files:**
- Modify: `components/Workbench.tsx`
- Modify: `app/globals.css`
- Modify: `tests/unit/workbench-view.test.ts`

**Interfaces:**
- Consumes: output `DELETE` route, output upload route, `outputPreviewUrl`, and `pendingOutputs`.
- Produces: `handleOutputDrop(event, outputFile)`, `deleteOutput(outputFile)`, and `dateExpanded` state.

- [ ] **Step 1: Write the failing view test**

```ts
expect(source).toContain("dateExpanded");
expect(source).toContain("收起任务日期");
expect(source).toContain("展开任务");
expect(source).toContain("handleOutputDrop");
expect(source).toContain("onDrop={(event) => handleOutputDrop");
expect(source).toContain("method: \"DELETE\"");
expect(source).toContain("删除成图");
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm test -- tests/unit/workbench-view.test.ts
```

Expected: FAIL because those controls do not exist.

- [ ] **Step 3: Implement small client-side operations**

```tsx
const [dateExpanded, setDateExpanded] = useState(true);

function handleOutputDrop(event: DragEvent<HTMLElement>, outputFile: string) {
  event.preventDefault();
  const file = Array.from(event.dataTransfer.files).find((item) => item.type === "image/png");
  if (!file) return setMessage("成图只支持 PNG 文件。");
  selectOutput(outputFile, file);
}

async function deleteOutput(outputFile: string) {
  if (!job || !window.confirm("删除这张成图和它的质检记录？")) return;
  const next = await run(`/api/jobs/${jobDate}/outputs/${encodeURIComponent(outputFile)}`, {
    method: "DELETE", headers: versionHeaders(job.version),
  });
  if (next) setJob(next);
}
```

The default date card includes a `收起任务日期` control. Its collapsed capsule displays the selected date and `展开任务`. Missing-output cards accept drag-over/drop of one PNG, then reuse the existing preview, confirm, rechoose, and cancel flow. Stored results display preview plus `删除成图`; source deletes stay draft-only.

- [ ] **Step 4: Implement approved CSS**

```css
:root { color: #f7f5f7; background: #141311; }
body { background: radial-gradient(circle at 50% -15%, #4b3c47 0, #1b1918 38%, #111 100%); }
.card { background: rgba(30, 29, 28, .78); border: 1px solid rgba(255,255,255,.14); backdrop-filter: blur(18px); }
button, .button { border-radius: 999px; }
```

Use near-white primary text, muted gray secondary text, magenta only for active emphasis, soft shadows, visible focus states, and responsive previews.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
npm test -- tests/unit/workbench-view.test.ts
```

Expected: PASS.

```bash
git add components/Workbench.tsx app/globals.css tests/unit/workbench-view.test.ts
git commit -m "feat: polish result workflow and dark workbench"
```

## Task 3: Full verification and deployment

**Files:**
- Verify: all tests and production build
- Apply manually: `supabase/migrations/0007_delete_draft_asset.sql` and `supabase/migrations/0008_delete_output_and_flexible_qc.sql`

**Interfaces:**
- Consumes: tasks 1 and 2.
- Produces: an independently tested `main` branch ready for Vercel auto-deployment.

- [ ] **Step 1: Run the full suite**

```powershell
npm test
```

Expected: all Vitest files pass.

- [ ] **Step 2: Build production**

```powershell
npm run build
```

Expected: Next.js build passes without TypeScript errors.

- [ ] **Step 3: Apply SQL in Supabase SQL Editor**

Run `0007_delete_draft_asset.sql` if not already run, then run `0008_delete_output_and_flexible_qc.sql`. Supabase's warning is acceptable here because these migrations create/replace functions; they do not delete existing task data.

- [ ] **Step 4: Push from the user-owned repository and verify on Vercel**

```cmd
cd /d "D:\chatgpt\Codex\2026-08-11_from_C\new-chat\work\yishou-tryon-workbench\cloud-workbench"
git push
```

After Vercel shows Ready, hard-refresh the workbench and check: collapse/expand date, drop PNG to an empty result slot, local preview before confirm, result deletion, and technical PASS for a readable PNG with different dimensions.

## Self-Review

- Spec coverage: Task 1 covers flexible QC and safe deletion; Task 2 covers all confirmed UI behavior; Task 3 covers test/build/database/deploy.
- Placeholder scan: all files, commands, expected outcomes, and implementation signatures are explicit.
- Type consistency: UI DELETE uses `outputFile`; route and repository use `{ jobDate, expectedVersion, outputFile }`; RPC uses the same values with `p_` names.
