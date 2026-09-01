# Get the full E2E suite green in CI, inside a 15-minute budget

**Written by Claude (Sonnet), 2026-08-31. Intended to be executed by another agent/session (Antigravity). Investigated live against this repo's actual GitHub Actions run history — not guesswork.**

---

## 0. The real problem — read this first

**The E2E suite has never actually run in CI recently at all.** Every one of the last 5 CI runs (`gh run list --workflow=ci.yml`, all on `feature/dob-grade-validation`) failed in **2m50s, at the `build_and_setup` job's "Build Web Application" step** — before `npm ci` for E2E, before Playwright install, before the setup login, before a single E2E test executes. This is not a 15-minute-budget problem yet; it's a **the build doesn't compile problem.**

Exact error (`gh run view 33253310688 --log-failed`):
```
Error: Unable to resolve module ./components/TopFilters from
  /home/runner/.../src/screens/teacher/student-progress/TeacherStudentProgressScreen.tsx
None of these files exist:
  * src/screens/teacher/student-progress/components/TopFilters(.web.ts|.ts|...)
```

**Root cause: uncommitted files.** `TopFilters.tsx` exists on this machine's local working directory (built during last night's Student Progress work) but was never `git add`/`git commit`ed. CI checks out from git (`actions/checkout@v4`), so it literally cannot see it — the file doesn't exist as far as GitHub is concerned. Confirmed via `git status --short`: **as of right now, the vast majority of the last two sessions' work — Student Progress, Switch Profile refactor, Parent Dashboard tests — is entirely uncommitted.** This isn't specific to `TopFilters.tsx`; any of these files being referenced-but-missing would cause the identical class of failure.

**This is why "Antigravity was working on it but it wasn't properly completed."** Antigravity (or whoever) was almost certainly testing/iterating locally, where the file exists, so it looked fine — but nothing was ever pushed for CI to see. The CI workflow's own design (4-shard matrix, artifact-passed session state, decoupled setup/teardown) is actually solid — no changes needed there yet. It just never got a chance to run.

---

## 1. Step 1 — commit everything, correctly (do this FIRST, before touching CI config at all)

Run `git status --short` at the repo root. As of this writing, the relevant files fall into two buckets:

**A. Real work, must be committed:**
```
 M e2e/tests/helpers/accounts.js
 M src/.legacy-screens/onboarding/OnboardingParentBoxes.tsx
 M src/components/common/DrawerContent.tsx
 M src/components/common/Sidebar.tsx
 M src/screens/parent/dashboard/ParentDashboardScreen.tsx
 M src/screens/parent/dashboard/components/AIWeeklyInsightCard.tsx
 M src/screens/parent/dashboard/components/BottomGrid.tsx
 M src/screens/parent/dashboard/components/ChildCard.tsx
 M src/screens/teacher/student-progress/TeacherStudentProgressScreen.tsx
 M src/screens/teacher/student-progress/__tests__/integration/TeacherStudentProgressScreen.integration.test.tsx
?? src/components/common/SwitchProfile.tsx
?? src/components/common/__tests__/SwitchProfile.test.tsx
?? src/screens/parent/dashboard/__tests__/                      (whole dir)
?? src/screens/teacher/student-progress/__tests__/unit/HeatmapGrid.test.tsx
?? src/screens/teacher/student-progress/__tests__/unit/exportPdf.test.ts
?? src/screens/teacher/student-progress/__tests__/unit/profileSubjects.test.ts
?? src/screens/teacher/student-progress/__tests__/unit/searchStudents.test.ts
?? src/screens/teacher/student-progress/__tests__/unit/subjectSummary.test.ts
?? src/screens/teacher/student-progress/components/StudentSearchBar.tsx
?? src/screens/teacher/student-progress/components/TopFilters.tsx    <- the one breaking CI right now
?? src/screens/teacher/student-progress/utils/exportPdf.ts
?? src/screens/teacher/student-progress/utils/profileSubjects.ts
?? src/screens/teacher/student-progress/utils/searchStudents.ts
?? src/screens/teacher/student-progress/utils/subjectSummary.ts
?? e2e/tests/helpers/deleteCreatedChild.js
?? e2e/tests/teacher/switch-profile/                              (whole dir — the actual spec)
```

**B. Junk — do NOT commit, delete or `.gitignore` instead:**
```
?? cloc_student_teacher.csv          — a one-off analysis output, not source
?? dist2/                            — a stray build output directory (note: NOT the normal `dist/`
                                        the build script produces — investigate why this exists
                                        before deleting, in case something is now writing here by
                                        mistake instead of `dist/`)
?? e2e/skip_child_slots.mjs          — a debug scratch script from mid-session troubleshooting
?? ts_prune_output.txt               — a one-off tool output, not source
```
Also two planning docs at repo root (`STUDENT_PROGRESS_PLAN.md`, `SWITCH_PROFILE_CHILD_CREATE_BUG_PLAN.md`) — these are legitimate handoff documents, fine to commit if useful as history, or delete once the work they describe is done. Not blocking either way.

**Also check whether the corresponding NAVIGATOR changes are committed** — `TeacherNavigator.tsx` and `SuperAdminNavigator.tsx`'s `TeacherProgressScreen` import (see `STUDENT_PROGRESS_PLAN.md` §7 gotcha: "`TeacherProgress` route keeps getting reverted"). They did NOT show as modified in the `git status --short` above, meaning either they're already committed correctly, or this needs re-verifying — run `git status --short src/navigation/` specifically and confirm the import is present and staged.

**Commit strategy:** do not just `git add -A`. Stage bucket A explicitly, confirm bucket B is excluded (delete the junk files, or add them to `.gitignore` if they're expected to recur — e.g. if `dist2/` gets regenerated by some script, find out which one and fix it to write to `dist/` or gitignore `dist2/`), then commit and push to whatever branch CI watches (currently `feature/dob-grade-validation`, based on run history — confirm this is still the intended branch).

---

## 2. Step 2 — confirm the build succeeds locally BEFORE pushing

Do not push and hope. Reproduce the exact CI build step locally first:
```bash
cd C:/Users/Asus/Desktop/aivorah-frontend
EXPO_NO_TELEMETRY=1 CI=1 npx expo export --platform web
```
This is exactly what `npm run vercel-build` runs. If this succeeds locally with a clean `git stash` (to simulate exactly what git has, not what's in the working directory) — even better:
```bash
git stash --include-untracked   # temporarily set aside anything NOT yet committed
git status --short              # should be empty now
EXPO_NO_TELEMETRY=1 CI=1 npx expo export --platform web   # should succeed if the commit is complete
git stash pop                   # restore
```
If this fails, the commit is still missing something — find it before pushing, not after burning another CI run.

---

## 3. Step 3 — push, trigger CI, watch the FIRST real run

```bash
git push
gh workflow run ci.yml --ref feature/dob-grade-validation   # or however CI is triggered — check if push alone triggers it (it does, per the `on: push` trigger in ci.yml)
gh run watch                                                 # or gh run list to get the run ID, then gh run view <id> --log
```

**Expect this run to actually reach `e2e_tests` for the first time.** At this point, and only at this point, does the "15-minute budget" question become real and measurable — right now it's unmeasurable because it's never run.

---

## 4. Step 4 — once it actually runs, THEN evaluate against the 15-minute budget

Do not pre-tune timing before step 3 gives real data. Once you have a real run:

- **`build_and_setup` job timing** — includes `npm ci`, `expo export`, E2E `npm ci`, Playwright browser install, then the setup script (warm-up + login 64 accounts + snapshot). Locally, the login step alone took **~113-135 seconds** consistently this session (64 accounts, concurrency 4) — expect CI (typically slower/more resource-constrained runners) to take similar or somewhat longer. Budget roughly 3-5 min for this whole job based on local numbers plus typical `npm ci`/browser-install overhead.
- **`e2e_tests` job timing** — 4 parallel shard jobs, each running `--workers=2`. 66 total spec files ÷ 4 shards ≈ 16-17 tests per shard ÷ 2 workers ≈ 8-9 tests per worker, sequentially within that worker. If each test averages roughly 10-20 seconds once the app is warm (this needs real measurement — do not assume), that's roughly 1.5-3 minutes of actual test execution per shard, but shard jobs run in PARALLEL with each other (not sequentially), so the e2e_tests job's wall-clock time is closer to the SLOWEST single shard, not the sum of all 4.
- **`teardown_and_report` job** — merges blob reports + restores mutated accounts. Should be fast (seconds to low tens of seconds based on local teardown script behavior), but currently failing too (`Error: Directory does not exist: .../all-blob-reports` — a downstream symptom of `e2e_tests` never having produced any blob reports, because the build never got that far. This should resolve itself automatically once step 3's run actually reaches `e2e_tests`.).

**Sum these three job timings** (they run sequentially — `e2e_tests` needs `build_and_setup`, `teardown_and_report` needs both) for the real end-to-end wall-clock total, and compare against the 15-minute target.

---

## 5. If the real timing measured in step 4 EXCEEDS 15 minutes — actual levers to pull, in order of impact

1. **Increase shard count** (currently 4, in the `matrix: shard: [1,2,3,4]` in `ci.yml`). GitHub Actions free/team runners typically allow generous job concurrency — going to 6 or 8 shards cuts the `e2e_tests` job's wall-clock roughly proportionally (66 tests ÷ 8 shards ≈ 8-9 tests/shard vs ÷ 4 ≈ 16-17/shard), at the cost of more parallel runner-minutes consumed (a cost/quota tradeoff, not a correctness one — check runner minute limits/billing before going too high).
2. **Increase `--workers` per shard** (currently 2). If runner CPU/memory allows it (GitHub-hosted `ubuntu-latest` runners are 2-core/7GB by default — 2 workers is likely already near the practical ceiling; verify with actual resource usage in a real run before increasing, since over-subscribing workers on a 2-core runner usually makes things SLOWER, not faster, due to context-switching and Chromium's own resource needs per instance).
3. **Cache `node_modules` and Playwright browsers properly.** Check whether `actions/setup-node@v4`'s `cache: 'npm'` is actually hitting (look for "Cache restored" vs "Cache not found" in the run log) and whether Playwright's browser binaries are being redundantly reinstalled in EVERY job (`build_and_setup` AND all 4 `e2e_tests` shards AND `teardown_and_report` each independently run `npm ci` / `playwright install --with-deps chromium chrome` — this is real, avoidable redundant time across 6 total jobs). Consider a dedicated Playwright browser cache action (`actions/cache` keyed on Playwright version) to skip the ~30-60s browser download+install in jobs that don't strictly need a fresh one.
4. **Move `warm-up` earlier / parallelize with build.** Currently `build_and_setup` does the full web build THEN starts a static server THEN does warm-up+login+snapshot, all sequentially in one job. If warm-up doesn't actually depend on the build being complete (it's hitting live Test-project Supabase/backend services, not the freshly-built frontend, for warm-up specifically — verify this from `warmup.js`), it could theoretically run in parallel with the build as a separate job. This is a bigger structural change — only pursue if steps 1-3 above don't get under 15 minutes on their own.
5. **Trim genuinely slow/flaky individual tests** rather than infrastructure changes, if the real run reveals a small number of specs dominating the total time (e.g. one spec taking 60+ seconds while others take 10s) — but only after real data identifies which ones, not speculatively.

**Do not implement any of §5 preemptively.** Steps 1-4 (commit → verify build → push → measure) come first. It's entirely possible the existing 4-shard/2-worker setup already fits comfortably under 15 minutes once the build succeeds — there is no evidence yet either way.

---

## 5a. Why you currently can't see ANY pass/fail counts — and how to fix that specifically

This is a separate complaint from raw timing, worth calling out explicitly since it's the most frustrating part of "I've been stuck for two days": **there is currently no way to see results, because none have ever been produced.** The `teardown_and_report` job's "Merge HTML Report" step fails with `Error: Directory does not exist: .../all-blob-reports` — there's nothing to merge because `e2e_tests` never ran (it's blocked on `build_and_setup`, which fails first). This isn't a reporting bug to fix — it will resolve itself automatically once §1-3 get the build succeeding, because then `e2e_tests` will actually produce blob reports for `teardown_and_report` to merge.

**Once the build succeeds and `e2e_tests` runs, here's exactly where to look for results** (confirm this works as part of step 4's validation, don't just assume):

1. **Fastest — the Actions run summary itself.** `gh run view <run-id>` (or the GitHub web UI's Actions tab) shows each of the 4 shard jobs as pass/fail at a glance, plus `gh run view <run-id> --log` for the raw Playwright `--reporter=blob` output per shard if you need per-test detail without downloading anything.
2. **Full detail — the merged HTML report.** `teardown_and_report`'s "Upload Final HTML Report" step uploads it as an artifact named `playwright-html-report` (7-day retention). Download via `gh run download <run-id> -n playwright-html-report`, then open `index.html` locally — this is Playwright's real interactive report: pass/fail counts, per-test timing, screenshots/videos/traces for failures, filterable by shard/tag. This is genuinely the same rich report `npx playwright show-report` gives you locally, just assembled from all 4 shards' results.
3. **Quickest numeric summary** if you just want "X passed, Y failed" without opening the HTML report: `gh run view <run-id> --log | grep -E "passed|failed"` after a completed run, or check the raw blob-report artifacts (`blob-report-1` through `blob-report-4`) if you want per-shard breakdowns before they're merged.

Add a note to the workflow (optional but recommended, low effort): a final step in `teardown_and_report` that echoes a plain-text summary line count (e.g. via `gh run view` isn't available FROM WITHIN the run itself easily, but Playwright's blob reporter can be paired with a simple `--reporter=list` addition, or just parse the merged report's JSON summary) directly into the GitHub Actions run summary page (`$GITHUB_STEP_SUMMARY`) so the pass/fail count is visible without downloading anything at all. This is a nice-to-have polish item, not required for the acceptance criteria below.

---

## 6. Acceptance criteria (what "done" means — used for validation)

- [ ] `git status --short` at repo root shows no unstaged/untracked files that are actual source code needed for the build (junk files from §1B may remain untracked/gitignored, that's fine).
- [ ] `EXPO_NO_TELEMETRY=1 CI=1 npx expo export --platform web` succeeds locally against a clean `git stash`-simulated checkout (see §2).
- [ ] A real CI run (`gh run list --workflow=ci.yml`) shows `build_and_setup` succeeding, all 4 `e2e_tests` shard jobs completing (pass OR fail on actual test assertions is fine — reaching and finishing them is the bar here, not 100% green tests, since the Switch Profile bug from `SWITCH_PROFILE_CHILD_CREATE_BUG_PLAN.md` may still be failing that one spec independently), and `teardown_and_report` completing successfully (merged HTML report uploaded, mutated accounts restored).
- [ ] Total wall-clock time from workflow start to `teardown_and_report` completion, reported via `gh run view <id>` — measured and written down. If over 15 minutes, at least one lever from §5 has been evaluated with real before/after numbers (not just applied speculatively).
- [ ] Confirmed the user (who has an 8GB-RAM local machine and cannot run the full suite locally) can actually retrieve pass/fail counts and per-test detail from a completed CI run using ONLY the commands in §5a — no local Playwright execution required. This is the actual point of moving to CI; verify it end-to-end, don't just assume the artifacts exist.
- [ ] The specific `TopFilters.tsx`-class of failure (a locally-present-but-uncommitted file breaking CI) cannot silently recur — either confirm the repo's pre-commit/PR process now includes a step that would have caught this (e.g. running `git status --short` as a CI job itself, before the build, that fails loudly on unexpected untracked source files — optional, use judgement on whether this is worth adding vs just being disciplined about commits going forward).

## 7. Out of scope for this task

- Do not fix the Switch Profile child-account-creation bug as part of this task — that's `SWITCH_PROFILE_CHILD_CREATE_BUG_PLAN.md`'s job, a separate document. That spec is allowed to fail in CI for now; the goal here is getting the WHOLE SUITE to run to completion in CI within budget, not 100% pass rate.
- Do not restructure the E2E suite's test organization/sharding logic beyond the specific, measured levers in §5.
- Do not change which branch CI triggers on unless confirming with the user first that `feature/dob-grade-validation` is still correct.
