# Drag-and-Drop Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users drag image files from their desktop directly onto a task-group asset card, while preserving click-to-upload.

**Architecture:** Keep file-selection rules in the existing pure `lib/asset-selection.ts` module so card behavior is testable without a browser. `Workbench.tsx` will convert a browser drop event to `File[]`, use that helper, and reuse the existing upload functions; CSS will provide a visible drop target state.

**Tech Stack:** Next.js App Router, React client component, TypeScript, Vitest, CSS.

## Global Constraints

- Keep the existing click-to-upload controls working.
- Only accept JPEG, PNG, and WebP image files.
- Top, bottom, and full-look reference cards upload the first valid dropped image only; tell the user when extra files were skipped.
- Model card accepts several dropped images but still enforces the existing maximum of five model images per task group.
- Reject file-less drops, non-image files, URL/text drops, and folders without changing the job.
- Do not introduce a database migration or change API endpoints.

---

### Task 1: Add a pure drop-file selection contract

**Files:**
- Modify: `lib/asset-selection.ts`
- Modify: `tests/unit/asset-selection.test.ts`

**Interfaces:**
- Consumes: `AssetRole = "model" | "top" | "bottom" | "full_look"` and `File[]`.
- Produces: `selectDroppedImageFiles(role, files): { accepted: File[]; rejectedNonImages: boolean; ignoredExtra: boolean }`.
- `Workbench.tsx` will use `accepted` and display the two flags as Chinese feedback.

- [ ] **Step 1: Write the failing unit tests**

```ts
import { selectDroppedImageFiles } from "@/lib/asset-selection";

it("keeps every valid dropped file for the model card", () => {
  expect(selectDroppedImageFiles("model", imageFiles)).toEqual({
    accepted: imageFiles,
    rejectedNonImages: false,
    ignoredExtra: false,
  });
});

it("keeps only the first valid reference image", () => {
  expect(selectDroppedImageFiles("top", imageFiles)).toEqual({
    accepted: [imageFiles[0]],
    rejectedNonImages: false,
    ignoredExtra: true,
  });
});

it("rejects non-image files before uploads begin", () => {
  expect(selectDroppedImageFiles("model", mixedFiles)).toEqual({
    accepted: [imageFiles[0]],
    rejectedNonImages: true,
    ignoredExtra: false,
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npm test -- tests/unit/asset-selection.test.ts
```

Expected: FAIL because `selectDroppedImageFiles` is not exported.

- [ ] **Step 3: Add the minimal pure implementation**

```ts
export type AssetRole = "model" | "top" | "bottom" | "full_look";
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function selectDroppedImageFiles(role: AssetRole, files: File[]) {
  const valid = files.filter((file) => acceptedTypes.has(file.type));
  const accepted = role === "model" ? valid : valid.slice(0, 1);
  return {
    accepted,
    rejectedNonImages: valid.length !== files.length,
    ignoredExtra: role !== "model" && valid.length > 1,
  };
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```powershell
npm test -- tests/unit/asset-selection.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the tested selection contract**

```powershell
git add lib/asset-selection.ts tests/unit/asset-selection.test.ts
git commit -m "feat: define drag-and-drop image selection"
```

### Task 2: Wire drop events into every asset card

**Files:**
- Modify: `components/Workbench.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `selectDroppedImageFiles(role, files)` from Task 1.
- Reuses: `uploadAsset(group, role, file)` and `uploadModels(group, files)`.
- Produces: file drops that have the same upload and job-version behavior as the existing file inputs.

- [ ] **Step 1: Add a drag-target state and shared upload dispatcher**

```tsx
const [dragTarget, setDragTarget] = useState<string | null>(null);

function assetSlotKey(group: Group, role: Asset["role"]) {
  return `${group.id}:${role}`;
}

function uploadDroppedFiles(group: Group, role: Asset["role"], files: File[]) {
  const selection = selectDroppedImageFiles(role, files);
  if (selection.accepted.length === 0) {
    setMessage("请拖入 JPG、PNG 或 WebP 图片。");
    return;
  }
  if (role === "model") void uploadModels(group, selection.accepted);
  else void uploadAsset(group, role, selection.accepted[0]);
  if (selection.rejectedNonImages || selection.ignoredExtra) {
    setMessage("只上传了可用图片；服装参考卡每次只接收第一张图片。");
  }
}
```

- [ ] **Step 2: Attach guarded drag handlers to each `.asset-slot`**

```tsx
<div
  className={`asset-slot ${dragTarget === assetSlotKey(group, role) ? "drag-over" : ""}`}
  onDragEnter={(event) => { event.preventDefault(); setDragTarget(assetSlotKey(group, role)); }}
  onDragOver={(event) => event.preventDefault()}
  onDragLeave={(event) => { event.preventDefault(); setDragTarget(null); }}
  onDrop={(event) => {
    event.preventDefault();
    setDragTarget(null);
    uploadDroppedFiles(group, role, Array.from(event.dataTransfer.files));
  }}
>
```

Add a visible card-local hint: `可直接把桌面图片拖到这里，或点击上传。` The handlers must not read `text/plain` or URL data and must never navigate the browser to a dropped image.

- [ ] **Step 3: Add the active drop-zone styling**

```css
.asset-slot.drag-over {
  border: 2px dashed #000;
  background: rgb(255 235 242 / 96%);
  box-shadow: inset 0 0 0 3px rgb(0 0 0 / 10%);
}
.drop-hint { margin: 0; font-size: .82rem; font-weight: 700; }
```

- [ ] **Step 4: Keep the input path aligned with the new selection rules**

Use the same dispatcher for `onChange`, after resetting the input value. This keeps a click-selected reference file and a dropped reference file consistent, and preserves `uploadModels` as the sole place enforcing the five-model limit.

- [ ] **Step 5: Run targeted tests and production build**

Run:

```powershell
npm test -- tests/unit/asset-selection.test.ts tests/unit/workbench-view.test.ts
npm run build
```

Expected: all selected tests and the build pass.

- [ ] **Step 6: Commit the UI behavior**

```powershell
git add components/Workbench.tsx app/globals.css
git commit -m "feat: upload task images by drag and drop"
```

### Task 3: Verify the release candidate

**Files:**
- Modify: no production files unless verification identifies a failure.

**Interfaces:**
- Consumes: the completed Tasks 1–2 implementation.
- Produces: a committed, tested revision for the user to push from their normal terminal.

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
npm test
```

Expected: every Vitest test passes.

- [ ] **Step 2: Manually verify the browser acceptance path after deployment**

1. Open a task date and create a group.
2. Drag one desktop JPEG onto the top card and verify its preview appears.
3. Drag two images onto the model card and verify two thumbnails appear.
4. Drag two images onto a reference card and verify only the first uploads with a clear notice.
5. Try dropping a `.txt` file and verify no asset is uploaded.

- [ ] **Step 3: Hand off the committed revision for deployment**

Tell the user to use their normal terminal:

```powershell
cd "C:\Users\15798\Documents\Codex\2026-08-11\new-chat\work\yishou-tryon-workbench\cloud-workbench"
git push
```

Vercel will automatically redeploy `main`; no Supabase migration is required.
