# 图片预览与整套换装工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让任务组显示素材缩略图、每组支持最多五张模特图，并增加将整套参考穿搭换到目标模特的模式。

**Architecture:** 继续由 `assets` 统一保存图片；扩展受控的 role 和 apply_mode。浏览器通过已认证的图片预览路由显示私有图片；模型图片以 `asset_ordinal` 保持 T01–T05 稳定。

**Tech Stack:** Next.js App Router、React、TypeScript、Supabase Postgres/Storage、Vitest。

## Global Constraints

- 每组支持 1–5 张模特图，第 6 张由客户端与服务端拒绝。
- 旧 top、bottom、model、top/bottom/set 任务和输出命名不变。
- full_look 仅是服装参考，不是成图目标。
- 资产保持私有，浏览器不能拿到 service key 或 object key。

---

### Task 1: 数据库模式和模型数量限制

**Files:**
- Create: `supabase/migrations/0006_full_look_and_model_limit.sql`
- Test: `tests/integration/full-look-sql-contract.test.ts`

**Interfaces:**
- Produces: `full_look` apply mode/asset role；`add_asset` 对第 6 张 model 抛出 `MODEL_LIMIT_REACHED`。
- Consumes: migration 0005 的 `add_asset` RPC。

- [ ] **Step 1: Write the failing test**

```ts
expect(sql).toMatch(/apply_mode in \('top', 'bottom', 'set', 'full_look'\)/i);
expect(sql).toMatch(/MODEL_LIMIT_REACHED/);
expect(sql).toMatch(/role = 'model'/);
```

- [ ] **Step 2: Verify red**

Run: `npm test -- tests/integration/full-look-sql-contract.test.ts`

Expected: FAIL because migration 0006 does not exist.

- [ ] **Step 3: Implement minimal migration**

Extend the groups and assets check constraints with `full_look`. Replace `add_asset` from migration 0005, permitting `full_look` in its role/object-key validation and rejecting a model insert if `count(*)` for that group/model role is already five. Extend `add_group` using its existing lock/version logic to permit `full_look`.

- [ ] **Step 4: Verify green**

Run: `npm test -- tests/integration/full-look-sql-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add supabase/migrations/0006_full_look_and_model_limit.sql tests/integration/full-look-sql-contract.test.ts && git commit -m "feat: support full-look groups and five-model limit"`

### Task 2: 服务端角色和模式校验

**Files:**
- Modify: `lib/repositories.ts`
- Modify: `app/api/jobs/[jobDate]/groups/[groupId]/assets/[role]/route.ts`
- Test: `tests/unit/repositories.test.ts`
- Test: `tests/integration/asset-route-contract.test.ts`

**Interfaces:**
- Produces: `addGroup` accepts `"full_look"`; `addAsset` accepts role `"full_look"`.
- Consumes: Task 1 error `MODEL_LIMIT_REACHED`.

- [ ] **Step 1: Write failing tests**

```ts
expect(repositoryError({ message: "MODEL_LIMIT_REACHED" })).toMatchObject({ status: 400 });
expect(source).toContain('"full_look"');
```

- [ ] **Step 2: Verify red**

Run: `npm test -- tests/unit/repositories.test.ts tests/integration/asset-route-contract.test.ts`

Expected: FAIL because role/mode unions omit `full_look` and the limit maps to 500.

- [ ] **Step 3: Implement minimal validation**

Add `full_look` to the repository and route unions/valid role set. Map `MODEL_LIMIT_REACHED` to 400 with `每个任务组最多上传 5 张模特图。`.

- [ ] **Step 4: Verify green**

Run: `npm test -- tests/unit/repositories.test.ts tests/integration/asset-route-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add lib/repositories.ts app/api/jobs/[jobDate]/groups/[groupId]/assets/[role]/route.ts tests/unit/repositories.test.ts tests/integration/asset-route-contract.test.ts && git commit -m "feat: validate full-look assets and model limit"`

### Task 3: 交接文本和上传槽位

**Files:**
- Modify: `lib/workbench-view.ts`
- Modify: `lib/handoff.ts`
- Test: `tests/unit/workbench-view.test.ts`
- Test: `tests/unit/handoff.test.ts`

**Interfaces:**
- Produces: `groupAssetSlots("full_look")` yields `["full_look", "model"]`; handoff contains `模式：整套换装` and `整套参考图：<name>`.

- [ ] **Step 1: Write failing tests**

```ts
expect(groupAssetSlots("full_look")).toEqual(["full_look", "model"]);
expect(markdown).toContain("模式：整套换装");
expect(markdown).toContain("整套参考图：look.jpg");
```

- [ ] **Step 2: Verify red**

Run: `npm test -- tests/unit/workbench-view.test.ts tests/unit/handoff.test.ts`

Expected: FAIL because the mode is absent.

- [ ] **Step 3: Implement minimal presentation**

Add role/mode types. Full-look handoff emits only its whole-look reference plus existing model output contracts; it repeats that target model images are the only edit targets.

- [ ] **Step 4: Verify green**

Run: `npm test -- tests/unit/workbench-view.test.ts tests/unit/handoff.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add lib/workbench-view.ts lib/handoff.ts tests/unit/workbench-view.test.ts tests/unit/handoff.test.ts && git commit -m "feat: render full-look handoff"`

### Task 4: 客户端多选与缩略图

**Files:**
- Create: `lib/asset-selection.ts`
- Modify: `components/Workbench.tsx`
- Modify: `app/globals.css`
- Test: `tests/unit/asset-selection.test.ts`

**Interfaces:**
- Produces: `MAX_MODELS_PER_GROUP = 5` and `selectModelFiles(existingCount, files)` returning accepted files plus rejected flag.

- [ ] **Step 1: Write failing test**

```ts
expect(selectModelFiles(0, [a, b, c, d, e])).toMatchObject({ accepted: [a, b, c, d, e], rejected: false });
expect(selectModelFiles(4, [a, b])).toMatchObject({ accepted: [a], rejected: true });
expect(selectModelFiles(5, [a])).toMatchObject({ accepted: [], rejected: true });
```

- [ ] **Step 2: Verify red**

Run: `npm test -- tests/unit/asset-selection.test.ts`

Expected: FAIL because helper is missing.

- [ ] **Step 3: Implement minimal UI**

Make the model input `multiple`; sequentially upload accepted files so each request uses the refreshed job version. Render top, bottom, full_look and every model as thumbnail cards with filename and model ordinal; use a private preview URL. Display the five-image limit message when a selection is trimmed.

- [ ] **Step 4: Verify green**

Run: `npm test -- tests/unit/asset-selection.test.ts tests/unit/workbench-view.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add lib/asset-selection.ts components/Workbench.tsx app/globals.css tests/unit/asset-selection.test.ts && git commit -m "feat: preview assets and upload up to five models"`

### Task 5: 已认证私有图片预览和最终验证

**Files:**
- Create: `app/api/jobs/[jobDate]/assets/[assetId]/preview/route.ts`
- Test: `tests/integration/asset-preview-route-contract.test.ts`
- Modify: `docs/DEPLOYMENT.md`

**Interfaces:**
- Produces: `GET /api/jobs/:jobDate/assets/:assetId/preview`, returning that job asset bytes only after the existing read-auth guard passes.

- [ ] **Step 1: Write failing route contract test**

```ts
expect(source).toContain("requireReadAccess");
expect(source).toContain("tryon-assets");
expect(source).toContain("assetId");
expect(source).toContain("Content-Type");
```

- [ ] **Step 2: Verify red**

Run: `npm test -- tests/integration/asset-preview-route-contract.test.ts`

Expected: FAIL because route is absent.

- [ ] **Step 3: Implement minimal private proxy**

Authenticate, load the job, find the asset inside that job only, download its private storage object, return its bytes with image content type and `Cache-Control: private, max-age=300`. Add migration 0006 to the deployment steps.

- [ ] **Step 4: Verify green and full project**

Run: `npm test -- tests/integration/asset-preview-route-contract.test.ts && npm test && npm run build`

Expected: focused test, all Vitest tests and production build PASS.

- [ ] **Step 5: Commit**

Run: `git add app/api/jobs/[jobDate]/assets/[assetId]/preview/route.ts tests/integration/asset-preview-route-contract.test.ts docs/DEPLOYMENT.md && git commit -m "feat: serve authenticated asset previews"`
