# Finish the migration: remove remaining monolith calls from "already migrated" features

**Written by Claude (Sonnet), 2026-08-31. Intended for Antigravity (Claude 4.x). Scope is deliberately limited — see §0.**

---

## 0. Scope — read this first

This plan covers **only** the features flagged in `ARCHITECTURE_MAP.md`'s audit section: features that already have their OWN dedicated microservice, but still have some files calling the old monolith (`ai-mentor/server`) too. This is the "finish what's already started" work, NOT a brand-new migration.

**Explicitly OUT of scope for this plan** (much bigger, separate task, do not start it here): the entire Parent persona and entire School Admin persona have **zero** dedicated services — every screen there is 100% monolith with nothing extracted yet. That is a different, much larger undertaking (would mean designing and standing up new services from scratch) and should be its own dedicated plan when there's time/budget for it. Same for the `.legacy-*` screens (AI Storyteller, Drawing Buddy, Math Helper, etc.) — untouched, out of scope here.

Per this codebase's standing rule (`CLAUDE.md`): monolith work only happens as a deliberate, planned, scoped task — never incidentally. This document IS that deliberate scoping for the items below.

---

## 1. Priority order (biggest/riskiest first, so the highest-value work happens even if time runs out)

| # | Feature | Files affected | Real extraction needed? |
|---|---|---|---|
| 1 | **Teacher Assignments** | 15 files | **Yes — the bulk of this plan's work.** See §2. |
| 2 | Student Learning Paths | 5 files | Partial — see §3 |
| 3 | Student Settings | 4 files | **Probably NOT** — likely intentional, verify don't migrate blindly. See §4 |
| 4 | Student Assignments | 2 files | Likely just repointing — see §5 |
| 5 | Student Challenges | 2 files | Needs checking — see §5 |
| 6-9 | Student Dashboard, Student Schedule, Student AI Coach, Teacher Students (1 file each) | 4 files | Needs checking — see §5 |

---

## 2. Teacher Assignments (`src/screens/teacher/assignments/`) — do this first

**Confirmed by reading the actual code** (not assumed) — every monolith endpoint this feature still calls, and whether `aivorah-assignments-service` already has it:

### 2a. Already exists in `aivorah-assignments-service` — just repoint the import, no backend work needed
| File | Endpoint | Action |
|---|---|---|
| `hooks/useQuizGeneration.ts` | `POST /assignments/generate-quiz` | Service already has `POST /generate-quiz` (confirmed via `grep` on `aivorah-assignments-service/routes`). Swap the `SERVER_URL` import for `assignmentsServerUrl.ts`, confirm the route path/payload shape actually matches (don't assume identical — verify request/response shape between the monolith version and the service version before cutting over), test, done. |

### 2b. Genuinely missing from `aivorah-assignments-service` — needs real extraction from `ai-mentor/server`
These are the actual work. For each, find the matching route in `ai-mentor/server/routes/` (search for the same path string), port the handler logic into `aivorah-assignments-service` following the SAME pattern already used for its existing routes (matching style/structure — look at how `POST /generate-quiz` is currently implemented in the service as the template), then repoint the frontend file:

| File(s) | Endpoint(s) | Notes |
|---|---|---|
| `components/InteractiveQuizPreviewModal.tsx` | `POST /quiz/normalize`, `POST /quiz/render-preview` | |
| `components/QuizLibraryPreviewModal.tsx`, `hooks/useQuizLibrary.ts` | `GET /quiz/`, `GET /quiz/list` | |
| `components/ReuseQuizModal.tsx` | `POST /quiz/render-preview` | shared handler w/ above |
| `components/WorksheetUploadFlow.tsx`, `hooks/useUploadWorksheet.ts` | `POST /quiz/render-preview`, `POST /quiz/list`, `POST /assignments/docx-to-pdf`, `POST /assignments/extract-questions-async`, `POST /assignments/generate-quiz` (worksheet variant — check if same handler as 2a's or a different one), `POST /assignments/pdf-to-quiz`, `POST /assignments/upload-doc`, `POST /quiz/generate-async`, `POST /quiz/generate-image` | **The largest chunk of work** — this is the AI worksheet-upload → quiz pipeline, likely several distinct async/AI-calling handlers. Budget the most time here. Check if any of these already have partial equivalents in the service under different names before assuming all-new. |
| `hooks/useBulkUpload.ts` | `POST /assignments`, `POST /assignments/docx-to-pdf`, `POST /quiz/render-preview` | Overlaps with WorksheetUploadFlow's endpoints — likely shares backend handlers, port once, repoint both consumers |
| `hooks/useIBGeneration.ts` | `POST /assignments/generate-ibpyp` | IB-curriculum-specific quiz generation |
| `hooks/useTaskSteps.ts` | `POST /assignments/generate-steps` | |
| `services/jobsService.ts` | `GET/POST /jobs/*` | Background-job status polling — likely tied to the async generation endpoints above (`generate-async`, `extract-questions-async`). Port alongside whichever async endpoint(s) actually create these jobs. |

### 2c. Wrong service entirely — these belong to OTHER already-existing services, not `aivorah-assignments-service`
| File | Endpoint | Belongs to | Action |
|---|---|---|---|
| `hooks/useTeacherCurriculumGrade.ts` | `GET /curriculum/subjects` | Likely `aivorah-learning-paths-service` (curriculum/syllabus data) — verify by checking if that service already has an equivalent route before assuming it needs porting | Check, then repoint or extract accordingly |
| `hooks/useTeacherCurriculumGrade.ts` | `GET /user/preferences` | `aivorah-profile-service` — **this one already exists there**, this file is very likely just importing the wrong config (`serverUrl.ts` instead of `profileServerUrl.ts`) for a route that's already migrated elsewhere in the app. Cheap fix — just repoint the import, verify. |
| `TeacherAssignmentsScreen.tsx` | `GET /student/by-teacher/` | `aivorah-teacher-dashboard-service` or `aivorah-students-service` — this exact route pattern was already extracted once (Teacher Dashboard's `/student/by-teacher/:teacherId` route, per this session's own memory of that extraction). Almost certainly just needs repointing, not re-extracting — verify the route exists in one of those two services first. |

**After 2a-2c: `hooks/useTeacherCurriculumGrade.ts` and `TeacherAssignmentsScreen.tsx` might turn out to need ZERO backend work, just import fixes** — check §2c before writing any new backend code for those two files.

---

## 3. Student Learning Paths (`src/screens/student/learning-paths/`) — 5 files

Files: `hooks/useBlockedSubjects.ts`, `hooks/useSubjects.ts`, `lesson-screen/components/ListenTab.tsx`, `quiz/hooks/useQuiz.ts`, `quiz/utils.ts`.

Same process as §2: for each, find its actual monolith endpoint(s) (`grep -oE "SERVER_URL\}[a-zA-Z0-9/_:-]*" <file>`), check whether `aivorah-learning-paths-service` already has a matching route, port what's missing, repoint what already exists. Not pre-investigated in this plan — do this check first before estimating effort, same as §2 was investigated before writing its table.

---

## 4. Student Settings (`src/screens/student/settings/`) — 4 files, verify before migrating

Files: `hooks/useDeleteAccount.ts`, `hooks/useEmailChange.ts`, `hooks/usePasswordChange.ts`, `hooks/useRecoveryEmail.ts`.

**Do not blindly migrate these.** Account deletion, password change, and email change are security-sensitive operations that often deliberately stay on a single hardened backend rather than being spread across microservices (fewer places handling credentials/Firebase Admin operations = smaller attack surface). Before doing any work here:
1. Check whether these operations require Firebase Admin SDK access (deleting a Firebase user, changing auth email, etc.) — if so, check which backend(s) currently HAVE Firebase Admin credentials configured (this session found `aivorah-auth-service` has `services/firebaseAdmin.js` already, but no working credentials configured locally — worth checking if it's configured in the deployed/production environment).
2. If `aivorah-auth-service` is the right long-term home for these (it already owns password-reset-link generation per its own header comment: *"used to generate password reset links server-side, and by a few other endpoints (change-email, delete-account) that need to act on a user's Firebase account directly"* — **this strongly suggests `aivorah-auth-service` may ALREADY have some or all of these routes**, meaning this could be another case of "just repoint the import," not new backend work).
3. **Check `aivorah-auth-service`'s existing routes first** (`grep -rhoE "router\.(get|post|put|delete)\('[^']*'" routes/` same as done for assignments-service in this plan) before assuming any backend work is needed at all.

---

## 5. The remaining single-file cases (Student Dashboard, Student Assignments, Student Challenges, Student Schedule, Student AI Coach, Teacher Students) — 9 files total across 6 features

Lower priority (smaller blast radius each), but same investigation process for all of them:
1. `grep -oE "SERVER_URL\}[a-zA-Z0-9/_:-]*" <file>` to find the exact endpoint(s).
2. `grep -rhoE "router\.(get|post|put|delete)\('[^']*'" <target-service>/routes/` to check if it's already there.
3. If yes → repoint import, verify request/response shape matches, test.
4. If no → port the handler from the monolith, following that service's existing route patterns/style.

Do these AFTER §2-4 (Teacher Assignments, Learning Paths, Settings) — they're smaller and lower-risk, better to bank the big wins first given limited time.

---

## 6. Acceptance criteria

- [ ] For every file in §2-5: either (a) confirmed genuinely repointed to the correct existing service with a passing manual/automated test, or (b) confirmed as a real extraction, with the route ported into the target service AND the frontend repointed AND tested — not just "backend code copied, frontend still points at monolith" (a common half-finished trap).
- [ ] `grep -rl "from '.*config/serverUrl'" src/screens/teacher/assignments src/screens/student/learning-paths src/screens/student/settings src/screens/student/assignments src/screens/student/challenges src/screens/student/dashboard src/screens/student/schedule src/screens/student/ai-coach src/screens/teacher/students` returns **zero files** when this plan is complete (re-run the exact audit command from `ARCHITECTURE_MAP.md` to confirm).
- [ ] `ARCHITECTURE_MAP.md`'s audit table updated to reflect the new, fully-clean state (or explicitly note any file left on the monolith on purpose, e.g. Student Settings if §4's investigation confirms that's intentional — don't silently leave it out of the doc).
- [ ] Existing tests for each touched feature still pass (`npx jest src/screens/teacher/assignments src/screens/student/learning-paths ...` etc. — check each touched feature folder has its tests re-run, not just the changed files eyeballed).
- [ ] No regressions in the newly-touched microservices' own test suites (`aivorah-assignments-service`, `aivorah-learning-paths-service`, `aivorah-auth-service`, etc. — whichever actually received new routes).

## 7. Out of scope (do not do these as part of this plan)

- Parent persona, School Admin persona, `.legacy-*` screens — see §0, separate future task.
- The Switch Profile bug, the Supabase storage migration, and the CI 15-minute plan — separate documents, separate concerns, though note the Supabase storage migration blocks actually TESTING any of this work (same quota-suspended project) — sequence accordingly, that blocker likely needs resolving before this plan's changes can be verified end-to-end.
- Do not add brand-new features or redesign existing ones while doing this — this is a "move the pipes," not "change what flows through them" task.
