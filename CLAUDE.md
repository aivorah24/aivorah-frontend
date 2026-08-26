# Aivorah Frontend — Backend Architecture (read before planning any test/refactor work)

## Two backends exist, migration is mid-flight

- **Old monolith** (`ai-mentor/server`, a Node/Express app) — was the original single backend for everything.
- **New microservices** — one dedicated repo per feature, extracted from the monolith over time (e.g. `aivorah-assignments-service`, `aivorah-challenges-service`, `aivorah-leaderboard-service`, `aivorah-profile-service`, `aivorah-learning-paths-service`, `aivorah-schedule-service`, `aivorah-daily-habits-service`, `aivorah-bedtime-stories-service`, `aivorah-world-and-you-service`, `aivorah-help-center-service`, `aivorah-ai-coach-service`, `aivorah-auth-service`).
- Migration is **feature by feature, not finished** — some features are fully moved, some partially, some untouched.

## How to tell which backend a frontend feature uses

- Look at `src/config/*ServerUrl.ts`.
  - A feature with its own dedicated file (`assignmentsServerUrl.ts`, `challengesServerUrl.ts`, `leaderboardServiceUrl.ts`, etc.) → **migrated**, real microservice exists.
  - A feature still importing the generic `serverUrl.ts` → **still on the old monolith**.
- A single feature's service file can call **more than one backend at once** (mixed state) — check every `fetch()` call, not just the import list.

## Frontend refactor vs backend migration are SEPARATE axes

- Frontend refactor = splitting a screen into `components/hooks/services/utils` folders. Tracked separately (see teacher sidebar refactor audit).
- Backend migration = moving that feature's routes out of the monolith into its own service repo.
- **A screen can be fully refactored on the frontend while its backend is still 100% monolith** — e.g. Teacher Dashboard: frontend is cleanly modular, but all 3 of its API calls (`/student/by-teacher/:email`, `.../insights`, `/student/recent-activity/by-teacher/:email`) still hit the monolith. Don't assume one implies the other.

## Confirmed status snapshot (check again if it's been a while — this drifts)

- **Teacher Dashboard**: frontend ✅ refactored; backend ✅ **extracted** (2026-08-24) into `aivorah-teacher-dashboard-service` (new repo on Desktop) — see dedicated section below.
- **Student Dashboard**: frontend ✅ refactored; backend **mixed** — `fetchPerformance` → `aivorah-leaderboard-service` (migrated), `fetchCurriculumSubjects` → migrated to `aivorah-learning-paths-service` only for IB DP/MYP/Cambridge Grade 6+ (else monolith), `fetchCurriculum`/`fetchNcertChapters` → still monolith.
- **Teacher Students/Assignments/Challenges/Schedule/Progress/Settings**: frontend ❌ monolithic single files (not refactored); backend unconfirmed per-feature, check before assuming.

## Rule: don't touch monolith code incidentally — only as a deliberate, planned step

- Not "never touch it" — the monolith (`ai-mentor/server`) WILL eventually be refactored and its remaining routes extracted into proper microservices. That's the actual end goal.
- What's off-limits is touching it **as a side effect of other work** — no extracting/editing/backend-testing against it while doing today's frontend refactor/test pass, no reaching into it "just to check something" mid-task.
- Monolith refactor + extraction happens as its **own dedicated, planned task** later (e.g. "extract Teacher Dashboard's 3 endpoints" as a scoped follow-up), not folded into unrelated work.
- Until that dedicated task starts, any feature still backed by the monolith stays **out of scope for backend refactor/tests** today.
- Frontend work, and backend work against already-extracted microservices, is unaffected by this rule.
- Good news (2026-08-24): the monolith's source in `ai-mentor` is very likely recoverable — `git status` shows a huge staged (uncommitted) deletion across the whole repo, and `git log -- server` confirms the code existed (commit `79af30a`). Not yet restored (pending user confirmation to run `git restore --staged --worktree .`), but it means "the source is genuinely missing" is no longer the real blocker — the rule above is now the only reason it's out of scope.
- 🚨 Also found: `ai-mentor`'s git remote has a live GitHub token embedded in the URL (`https://user:TOKEN@github.com/...`). Flagged to the user to rotate — don't display or reuse that token.

## Monolith source — RESOLVED (confirmed 2026-08-25, was previously blocking)

- `C:\Users\Asus\Desktop\ai-mentor\server\` **now has real code** — confirmed present: `index.js` (307 lines), full `routes/` directory (assignments.js, challenges.js, curriculum.js, habits.js, etc.), `git status --short server` clean. The earlier "no real code" blocker below is stale — someone restored it since it was last hit.
- `ai-mentor\backend\` is still a **different, unrelated** Python/FastAPI service (RAG/ingestion, Qdrant) — do not confuse it with the Node monolith.
- Practical implication: it can now be run locally (`node server/index.js`, port 3007 per frontend's dev-mode `serverUrl.ts`) to unblock local E2E runs for any feature still partially depending on it (e.g. auth/profile-completeness routing) — this is just *running* it as a dependency, not editing/extracting it, so it doesn't violate the "don't touch incidentally" rule below.
- If this turns out wrong again (re-deleted, moved, etc.), re-verify before assuming either state.

## Test file structure convention (adopted 2026-08-24, going forward)

- **Frontend**: colocated per-feature — `src/screens/<role>/<feature>/__tests__/unit/*.test.ts` and `.../__tests__/integration/*.integration.test.tsx`. Everything for one feature (component/hook/service/util code AND its tests) stays together under that feature's folder. Applied to Teacher Dashboard's 5 test files; the other ~117 pre-existing frontend test files (still using a flatter colocated `__tests__/*.test.ts` with no unit/integration split) were NOT retroactively migrated — this convention applies going forward to new/touched features only, not as a backfill project.
- **Backend** (each microservice repo): top-level `tests/unit/` + `tests/integration/` (not colocated per-route, since these are single-purpose services) — matches `aivorah-assignments-service`'s existing pattern, now also applied to `aivorah-teacher-dashboard-service`.

## Teacher Dashboard backend — extracted 2026-08-24

- New repo: `C:\Users\Asus\Desktop\aivorah-teacher-dashboard-service` — ported verbatim (with a couple of dead helpers dropped) from `ai-mentor/server/routes/student.js`'s 3 teacher-dashboard routes: `GET /student/by-teacher/:teacherId`, `.../insights`, `GET /student/recent-activity/by-teacher/:teacherId`.
- Tests live in `tests/unit/` + `tests/integration/` (per-repo top-level split — this is the backend convention; the frontend uses colocated `__tests__/unit/` + `__tests__/integration/` per feature instead, see below).
- 23 Jest integration tests (supertest + a chainable Supabase mock, same pattern as `aivorah-assignments-service`'s tests), all passing. Final coverage on `routes/student.js`: **99.69% statements, 100% functions, 100% lines, 77.77% branches**. The branch gap is accepted as final — every remaining uncovered branch is a trivial `??`/`||` default-value fallback (~70 of them), not real logic; user confirmed stopping here (2026-08-24) rather than writing ~40-60 more tests to force each one.
- One known cross-test gotcha hit while writing these: the module-level `_topicCountCache` Map (30-min TTL, keyed by `curriculum|grade|subject`) persists across ALL tests in the same file. Reusing a curriculum/grade/subject combo across tests can silently serve a stale cached count instead of calling Qdrant — give each test a distinct combo when asserting on `totalTopics`/Qdrant call behavior.
- Frontend now points at it: `src/config/teacherDashboardServerUrl.ts` (new file) → `src/screens/teacher/dashboard/services/teacherDashboardService.ts` (updated to import it instead of `serverUrl.ts`).
- **Deployed** (confirmed 2026-08-25) — `teacherDashboardServerUrl.ts`'s `LIVE_SERVICE` URL (`https://aivorah-teacher-dashboard-service.onrender.com`) is a real, live deployment on Render (verified via a live request that hit Supabase and returned a real DB error, not a connection failure) — the note below about it being an undeployed placeholder is stale, corrected here. For local dev, run it on port 3016 (`npm start` in that repo) — `teacherDashboardServerUrl.ts` already points web-dev builds there.
- The heatmap route (`GET /student/by-teacher/:teacherId/heatmap`) also lives in the same monolith file but isn't called by the current frontend — left in the monolith, not extracted (nothing depends on it yet).
- This was NOT an "incidental monolith touch" — it was the explicit, deliberate, scoped extraction task the user asked for, per the "don't touch incidentally" rule.

## Teacher Dashboard frontend coverage — investigated 2026-08-24

Applied the "coverage is a flashlight, not a scorecard" method (triage each gap as: real behavior → test it; dead code → remove/flag it; genuinely hard-to-cover → document and accept) instead of chasing 100%.

**Before → After** (`src/screens/teacher/dashboard/**`, 101 tests, all passing):
- Statements: 51.73% → **96.84%**
- Branches: 29.8% → **78.43%**
- Functions: 35.83% → **97.5%**
- Lines: 54.61% → **97.18%**

Second pass (2026-08-24) triaged the remaining gaps one by one per "is this real logic / dead code / justified-unreachable": added close-button, Challenges-tile-dispatch, pull-to-refresh, and mobile-menu-button tests to `TeacherDashboardScreen`; fixed several tests that silently never exercised their target line because `Array.prototype.sort`'s comparator is skipped entirely for single/zero-element arrays (added a 2nd item to those fixtures). Added `testID`s (`modal-close-button`, `dashboard-scroll`, `header-menu-button`, `insight-modal`) to 4 components purely for reliable test queries — this RNTL version doesn't support `screen.UNSAFE_getByType`/`UNSAFE_getByProps`.

What moved the needle: the 3 insight-detail modal files (`AssignmentModals.tsx`/`ChallengeModals.tsx`/`LearningPathModals.tsx`) were at flat 0% — real leaderboard/ranking/subject-scoping business logic, reachable only by tapping an insight tile, nobody had tested it. Also added: `StudentOverviewCard`, `AISuggestedActionCard`, `InsightsColumns` press-handler tests, and a "fully populated insights" unit test batch for `buildDashboardStats.ts`'s positive-content branches (only empty/zero states were tested before).

**Real finding, fixed 2026-08-24 — `onProfilePress` was dead code**: `Header.tsx` declared an `onProfilePress?: () => void` prop but never called it anywhere (pressing the profile button opens an in-place profile modal instead). 3 screens passed this prop expecting it to navigate (`AICoachScreen.tsx`, student `DashboardScreen.tsx`, `TeacherDashboardScreen.tsx`) — none of them actually worked. Removed all 4 lines (the unused prop type + 3 call sites) — confirmed zero remaining references, no regressions (1092/1092 project tests, tsc clean).

**Remaining gaps, accepted as final** (each individually triaged, not blanket-skipped):
- `TeacherDashboardScreen.tsx` line 86 — **Category C (dead code)**: `onProfilePress={() => navigation.navigate('TeacherSettings')}` is passed to `Header`, which never calls that prop (see the dead-code finding above). Deliberately left uncovered — testing it would assert behavior that doesn't happen. Fix belongs to the separate `onProfilePress` cleanup task, not here.
- `useTeacherDashboardData.ts`'s visibilitychange/focus listener effect (lines 58-63) — **Category D (hard to cover given the harness)**: tried covering via `@jest-environment jsdom` override, but jsdom conflicts with RNTL's own render/timer machinery in this test file — every subsequent test started timing out. Reverted; documented in the test file itself. The effect is a thin web-only wrapper around the already-tested `fetchStudents()`, not distinct logic.
- `DonutChart.tsx`'s default-parameter branch (line 4) — **Category D (justified-unreachable)**: only reachable by rendering with zero props at all; `ClassProgressCard` (its only real caller) always passes every prop explicitly.
- Scattered `??`/`||` micro-fallbacks across `buildDashboardStats.ts` and the 3 modal files (~40 remaining branch points) — **Category D**, same reasoning as the backend section above: real but low-value one-line defaults (e.g. `ev.name || 'Unknown'`, `s.progressPct || 0`).

## Test/refactor work order (agreed convention)

For each feature: **E2E (safety net) → Refactor (frontend, if not done) → Unit + Integration tests (on the now-isolated pieces) → Coverage report.**
Backend unit tests only apply to features whose backend is confirmed migrated (has its own service repo present locally).
