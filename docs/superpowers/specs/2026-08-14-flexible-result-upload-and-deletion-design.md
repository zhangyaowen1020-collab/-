# Flexible Result Upload and Asset Deletion Design

## Goal

Make the task board easier to use: users can remove wrongly uploaded garment or model images, choose an AI result with any local filename, preview it before upload, and see the completed result as an image in the task group.

## User Flow

1. Every garment, full-look reference, and model thumbnail has a `删除` button.
2. Clicking `删除` asks for confirmation, then removes exactly that asset from private storage and the task group. Other assets and outputs remain unchanged.
3. Every expected baseline result has a file picker. The user may choose any PNG filename.
4. After choosing a file, its browser-local thumbnail appears with `确认上传` and `重新选择`.
5. On confirmation, the app uses the task contract output name internally, rather than the source file's name.
6. The server still validates PNG content and target dimensions. A mismatched dimension remains a technical FAIL.
7. Once uploaded, the baseline result is shown as an authenticated thumbnail beside its technical/manual QC state.

## Server Design

- Add an authenticated `DELETE /api/jobs/[jobDate]/groups/[groupId]/assets/[role]/[assetId]` handler.
- The handler reads the selected asset, calls a repository mutation that deletes only that asset with the optimistic job version, then removes its private storage object. If the database mutation fails, storage is untouched. If storage removal fails after deletion, the handler returns an error and reports the orphan for follow-up.
- Change result validation so the route parameter `outputFile` remains the authoritative task-contract name, while the uploaded file's original name is ignored. `validateResultFile` continues to require a PNG type/extension; `resolveResultUpload` resolves the contract from `outputFile`, never from the local upload name.
- Add `GET /api/jobs/[jobDate]/outputs/[outputFile]/preview`, which finds the recorded output by its contract name and streams its private object with an image content type.

## Client Design

- Extend job assets and outputs with their existing IDs/object keys as needed for authenticated preview URLs.
- Store one pending result file per expected output key in component state. Use `URL.createObjectURL` only for the pending local preview and revoke it when replaced, cleared, or uploaded.
- Replace the bare result file input with an upload card: expected contract label (small), pending preview, `确认上传`, and `重新选择`.
- Render completed outputs as image cards using the output preview API, alongside current technical QC and quick-pass controls.
- Add per-asset delete buttons to thumbnail cards. They are disabled while another mutation is active.

## Error Handling

- Non-PNG results show a clear message before confirmation.
- A missing/invalid pending selection does not send a request.
- Result filename differences never produce an error.
- Failed delete keeps the thumbnail visible after the next job refresh and shows the server message.
- Existing version-conflict behavior remains unchanged.

## Tests

- Unit tests verify a result resolves from the URL contract even when its uploaded local name is arbitrary, while dimensions still determine PASS/FAIL.
- Route-contract tests cover the output-preview path and asset-delete endpoint contract.
- Existing asset preview, output contract, and mutation tests continue to pass.

## Scope

No database migration, no change to completion/QC rules, no direct image generation inside the website, and no deletion of completed output images in this change.
