# Move file storage off Supabase Storage → Cloudinary (shared across dev/test/prod)

**Written by Claude (Sonnet), 2026-08-31. Intended to be executed by another agent/session (Antigravity). Investigated live against the real codebase and the real (currently-suspended) Supabase project — not guesswork.**

---

## 0. Why this is needed — the actual trigger

Supabase project `vgqrrseziwnljkencqpy` (called "Test" throughout this codebase's E2E/dev tooling, but **confirmed also used for real demos/staging** — not disposable) is suspended:
```
Storage size: 5.68 GB of 1.1 GB  →  HTTP 402, all REST/Storage requests rejected
Refills: 2026-09-25 (next billing cycle) unless upgraded
```
This blocks Supabase Storage AND the REST/database API for the whole project — confirmed live via direct `curl` against `/rest/v1/` and `/storage/v1/bucket`, both return the same `exceed_storage_size_quota` error. It is currently blocking:
- The Switch Profile E2E test (separate issue, see `SWITCH_PROFILE_CHILD_CREATE_BUG_PLAN.md` — unrelated bug, but can't even be tested right now because of this quota block).
- Likely the whole E2E suite, since almost everything in `e2e/` reads/writes this same project.
- Any dev-mode traffic pointed at this project.

**Decision (confirmed with the user):** rather than just paying to upgrade the Supabase plan (which doesn't fix the root cause and will recur), move file *storage* specifically off Supabase onto **Cloudinary**, and route dev/test/prod through the same Cloudinary account/credentials so the fix is permanent, not per-environment.

---

## 1. What's actually using Supabase Storage (confirmed by reading the code, not assumed)

Two buckets found in the whole codebase (`ai-mentor/server` — the old monolith; no other repo on Desktop references Supabase Storage at all):

### 1a. `ncert-books` — the dominant contributor, almost certainly most/all of the 5.68 GB

- **Written by:** `ai-mentor/server/scripts/upload-pdfs-to-supabase.js` — a one-off/occasional archival script. Uploads every NCERT textbook PDF from local disk (`data/ncert_books/grade<N>/<subject>/<code>.pdf`) into the bucket, path-mirrored. Its own header comment: *"so ingestion no longer depends on local/ephemeral disk (Cloud Run) and the source of truth lives in the cloud."*
- **Read by (at runtime):** **nothing found.** The live app (`ai-mentor/server/index.js:100`) serves these PDFs to users from **local disk** via `express.static('/data/ncert_books', ...)` — it never touches Supabase Storage for this. The ~29 files matching `ncert-books`/`ncert_books` in a repo-wide search are almost all one-off ingestion/audit/pipeline scripts (`ingest-all-ncert.js`, `orchestrate-ncert.js`, `verify-coverage.cjs`, etc.) that work against the **local disk copy**, not the Supabase bucket.
- **⚠️ Unconfirmed — verify before deleting anything:** no explicit "download from Supabase to repopulate local disk" script was found in this search, but Cloud Run deployments have ephemeral filesystems that reset on every redeploy/cold-start — **if `data/ncert_books` is not committed to git and not baked into the deploy image, something must be rehydrating it from somewhere on a fresh container, and the Supabase bucket is the only plausible candidate found.** Before deleting/migrating this bucket, confirm one way or the other: check whether `data/ncert_books/` is `.gitignore`'d in `ai-mentor/server`, and check the Cloud Run deploy config/Dockerfile for any startup step that downloads from Supabase. If genuinely nothing reads it back, it's a pure historical backup and safe to migrate/delete freely. If something DOES depend on it, that dependency needs to be repointed at Cloudinary as part of this migration, not left behind.

### 1b. `challenge-thumbnails` — small, low-risk

- **Written + read by:** `ai-mentor/server/routes/super-admin.js` (~line 315-325) — uploads a thumbnail image, gets its public URL back, stores that URL in the `challenges.thumbnail_url` column. Simple upload→public-URL pattern, actively used by the real app (super-admin challenge management UI), not just archival.
- Images are small; this bucket is very unlikely to be a meaningful contributor to 5.68 GB, but should still migrate for consistency (and because it's actively read, unlike `ncert-books`, so its migration must not have any downtime — see §3).

---

## 2. Why Cloudinary, not Cloudflare — already decided by the existing codebase

`ai-mentor/server` already has a real, working Cloudinary integration — **use it, don't introduce a second file-storage vendor**:
- `package.json`: `"cloudinary": "^2.9.0"` already a dependency.
- `services/audioCache.js`: working `cloudinary.uploader.upload_stream(...)` pattern, lazy-loaded only if `CLOUDINARY_CLOUD_NAME` etc. are configured (so it doesn't crash in environments without credentials — copy this defensive pattern).
- `services/cloudinaryUrls.js`: existing URL-resolution helper (`resolveImageUrl`), already used by `services/rag.js`.
- Confirmed 3 `CLOUDINARY_*` env vars already present in `ai-mentor/server/.env` (names only checked, not values — do not print/log these).

This means Cloudinary credentials, SDK, and working upload code already exist in this exact repo. The migration is "use the pattern that's already there for two more buckets," not "integrate a new vendor from scratch."

---

## 3. Migration steps

### 3a. `ncert-books` (do this first — biggest quota win, lowest risk since nothing reads it live)

1. **Resolve the §1a unconfirmed question first.** If a Cloud-Run-startup rehydration step from Supabase is found, note where, and make sure step 3 (below) repoints it at Cloudinary instead of just deleting the Supabase copy out from under it.
2. Write a one-off migration script (mirror `upload-pdfs-to-supabase.js`'s structure — same resumable/checkpoint pattern) that:
   - Reads every file from Supabase Storage bucket `ncert-books` (or, more simply, since local disk already has the same content per §1a, just re-run the equivalent of `upload-pdfs-to-supabase.js` but targeting Cloudinary instead of Supabase — **skip the Supabase read entirely if local disk is confirmed to be the actual source of truth**).
   - Uploads each PDF to Cloudinary using the existing `cloudinary.uploader.upload_stream` pattern from `audioCache.js`, using `resource_type: 'raw'` (Cloudinary's mode for non-image/video files like PDFs — confirm this is right for large PDFs specifically, Cloudinary has file-size tier limits depending on plan).
   - Preserves the same path structure (`grade<N>/<subject>/<code>`) as the Cloudinary `public_id`, so URL construction stays predictable (mirrors `cloudinaryAudioUrl`'s pattern in `audioCache.js`).
3. Once every file is confirmed uploaded and spot-checked (a handful of URLs actually resolve and serve the right PDF), **delete the `ncert-books` bucket's contents in Supabase Storage** (via the Supabase dashboard — full API access to Storage is blocked right now by the quota suspension itself; the email states *"You continue to have full access to your database through the dashboard while other services are restricted"* — confirm whether Storage bucket management is reachable via the dashboard UI even while the API is blocked; if not, this may require first unblocking via a temporary plan upgrade or contacting Supabase support to get write/delete access restored specifically to clear space).
4. If §1a's unconfirmed rehydration step exists, update it to pull from Cloudinary instead of Supabase.

### 3b. `challenge-thumbnails` (do this second — small, but actively read, so needs a clean cutover)

1. Add a Cloudinary-backed equivalent of the upload block in `routes/super-admin.js` (~line 315-325), reusing the existing `cloudinary.uploader.upload_stream` pattern.
2. **Do not delete existing Supabase-hosted thumbnails immediately.** Existing `challenges.thumbnail_url` rows point at Supabase public URLs already in use (potentially shown to real users on staging/demo). Migration order for zero-downtime:
   - Deploy the new upload code (new thumbnails go to Cloudinary from this point forward).
   - Backfill: for existing rows where `thumbnail_url` still points at the Supabase bucket, download each and re-upload to Cloudinary, then update the row's URL.
   - Only after confirming every row's URL now points at Cloudinary, clear the old Supabase bucket contents.

### 3c. Route dev/test/prod through the same Cloudinary account

Per the user's explicit ask ("route it for dev/test and Prod"): use the **same** Cloudinary cloud/credentials across all environments — do not create separate Cloudinary accounts per environment (that would just recreate the same "which env has which config" confusion this session already burned hours on with the Dev-vs-Test Supabase mixups). Confirm the 3 existing `CLOUDINARY_*` env vars in `ai-mentor/server/.env` are the values to reuse everywhere (dev/test/local `.env` files, and whatever secret-management the production Cloud Run deployment uses) — check whether any of the other repos on Desktop (`aivorah-*-service` microservices) need their own copy of these same credentials if any of them ever touch file uploads (current search found zero Supabase Storage usage in any microservice — confirm no NEW file-upload feature has silently landed in a microservice since the last check).

---

## 4. Acceptance criteria

- [ ] §1a's "does anything read `ncert-books` back at runtime/deploy-time" question is definitively answered (not left as "probably not") — either confirmed nothing depends on it, or the dependency found and repointed at Cloudinary.
- [ ] All NCERT PDFs accessible via Cloudinary URLs, spot-checked (open a handful in a browser, confirm real PDF content, not a broken link).
- [ ] `challenge-thumbnails`: new uploads go to Cloudinary; all EXISTING `challenges.thumbnail_url` rows backfilled to Cloudinary URLs (verify via a Supabase query: zero rows still pointing at the old Supabase Storage public URL pattern).
- [ ] Both Supabase Storage buckets emptied (or safely deletable) once the above is confirmed — actually check the Supabase Storage quota dashboard shows usage dropped well under 1.1 GB, confirming this really was the dominant contributor (if it ISN'T — if storage stays high after clearing these two buckets — there's a THIRD storage consumer somewhere not found in this investigation, and that needs chasing down before declaring victory).
- [ ] Same Cloudinary credentials confirmed working across dev, test/E2E, and prod — not per-environment accounts.
- [ ] Once Storage usage is back under quota, re-verify the Supabase project itself is unblocked: `curl` the same `/rest/v1/` endpoint used to confirm the block in the first place (see `SWITCH_PROFILE_CHILD_CREATE_BUG_PLAN.md`/session history for the exact check) and confirm a normal 200-range response instead of HTTP 402.
- [ ] Once unblocked, the Switch Profile E2E test and the broader E2E suite (see `CI_E2E_15MIN_PLAN.md`) can actually be re-attempted — this migration is a prerequisite for both of those other in-flight plans, not a replacement for them.

## 5. Out of scope for this task

- Do not fix the Switch Profile child-creation bug (`SWITCH_PROFILE_CHILD_CREATE_BUG_PLAN.md`) or the CI build/commit issue (`CI_E2E_15MIN_PLAN.md`) as part of this task — those are separate, already-planned pieces of work that happen to be blocked by this same Supabase quota issue. Fix the quota issue, then return to those plans.
- Do not introduce Cloudflare R2/Images or any other new storage vendor — Cloudinary is the established, already-integrated choice per §2.
- Do not touch the Test Supabase project's DATABASE tables/rows as part of this — this is specifically a Storage (file) migration, the quota violation named is Storage-only ("Storage size: 5.68 GB of 1.1 GB"), not database row/table size.
- Do not upgrade the Supabase plan as an alternative fix unless the user explicitly asks for that instead — they've already decided on the Cloudinary migration path.
