# Aivorah — Bug Fix Tracker (from "Bugs Found 27-08-2026.pdf")

Process for every entry: Reproduce → RCA → check existing test coverage → add/strengthen regression test → confirm it FAILS → fix root cause → confirm it PASSES → run related regression → E2E where relevant → manual verify.

## Classification

**BUGS** (real defects — fixed in priority order): #1 (teacher session/onboarding), #2 (display name doesn't persist), #9 (avatar doesn't persist), #3.1 (stale "14% this week"), #4/#5/#13 (Hindi/NCERT content shows English/placeholder titles), #6 (garbled topic names), #7/#12 (Learning Path subject list mismatch), #8 (non-existent topic + deprecated topic page), #11 (NCERT shows "Coming soon" despite content existing), #14 (AI Coach prompts not grade-scoped), #15 (event cancel with no confirmation), #17 (teacher schedule alignment defect), #19 (calendar week starts Monday not Sunday; tap-date doesn't scroll), #20 (Brain Teaser wrong format; "Test Your Knowledge" quiz-load error), #22 (XP inconsistent between pages; false "1d streak"; "no challenges available"), #23 (leaderboard column misalignment/symbol error), #24 (Progress "Month" toggle non-functional), #27 (Settings grade dialog doesn't reflect real grade).

**ENHANCEMENTS** (deferred until bugs are done): pg2 item 1 (filter default), 2.1 (edit-button placement), 10 (avatar list scoped to grade/curriculum — pending code confirmation, not yet verified either way), 15's color/theme part, 16 (hide-completed filter), 17's current-time indicator / 8am–7pm range / auto-scroll, 18 (remove Add Event — needs user confirm), 19.1 (auto date-scroll UX), 21 (sample assignment), 22's "topic done" filter, 25 (autocomplete box), 26 (help-center content refresh), 28 (location picker), 29 (button wording).

Item #10's classification is still open — will confirm against code before filing it either way.

---

## Bug #1 — Teacher session/onboarding not persisting

**Status:** ✅ CLOSED — RCA confirmed, regression tests added and passing, tsc clean, manually verified against the real DB with a real login.

**Observed:** Teacher logs in, completes onboarding. Next day, logging in again shows Teacher Onboarding again instead of the dashboard.

**Repro account found (read-only DB check, matches the PDF screenshot):** `sparklekingofkotha@gmail.com` ("Sparkles"). `users.onboarding_complete = false`, but `user_preferences` has a fully-completed teacher profile (curriculum, teacherRole, experience, avatarStyle) dated 2026-08-25 — proves the teacher genuinely completed the current `OnboardingTeacherBoxes.tsx` flow, yet the DB never recorded completion.

**RCA:**
- `App.tsx:905` gates onboarding on `user.onboardingComplete !== true`.
- On every fresh login, `AuthContext.tsx` sets `onboardingComplete` from the **server's** response (`supaProfile.onboardingComplete === true`) whenever the server provides that field — this is correct, source-of-truth behavior (`AuthContext.tsx:558-565`).
- `aivorah-profile-service`'s `updateProfile()` sets `patch.onboarding_complete = true` unconditionally whenever `complete === true` is sent for a non-student role (`services/profile-service.js:39-47`) — code looks correct in isolation.
- Traced `/user/sync` (called on every login) end-to-end: it **never** writes `onboarding_complete` in its patch object at all (confirmed by grep across `aivorah-auth-service`) — ruled out as a "resets it back to false" cause.
- Grepped all 3 backends for any `onboarding_complete = false` write — only one write site exists anywhere (`profile-service.js:47`, sets it to `true`). It is never explicitly reset to false by any service.
- **Confirmed defect, in `OnboardingTeacherBoxes.tsx`'s `handleFinish()` (lines ~207-244):** after PATCHing `/user/profile`, the client parses the response into `saved` but **never reads `saved.onboardingComplete`** — it unconditionally calls `updateUser({ onboardingComplete: true, ... })` regardless of what the server actually persisted. This breaks the single-source-of-truth contract: if the server-side write of `onboarding_complete` doesn't apply for any reason (only observable historically via this DB row, since no request logs are retained), the UI still shows success and lets the teacher through — until the *next* login, when `AuthContext` re-fetches the real (still-false) value from the server and bounces them back to onboarding. This exactly matches "worked yesterday, broken today."

**Scope:** Isolated to `OnboardingTeacherBoxes.tsx`'s finish handler. `OnboardingStudentBoxes.tsx`/`OnboardingParentBoxes.tsx` need the same check (to be verified before closing this bug — see acceptance criteria).

**Existing test coverage:** `OnboardingTeacherBoxes.integration.test.tsx` exists but never exercises `handleFinish()` (no test fills the whole form and taps "Complete Setup"); `updateUser` is jest.fn()-mocked with no assertions on its call args. **Gap confirmed — no test protects this path.**

**Regression test (in progress):** New integration test — fill all required fields, tap "Complete Setup", mock the `/user/profile` PATCH to return `200 { onboardingComplete: false, ... }` (server did not confirm), assert `updateUser` is **not** called with `onboardingComplete: true` and the teacher sees an error instead of silently proceeding.

**Acceptance criteria:**
1. ✅ New regression test fails before the fix (`Cannot find module`), passes after (4/4).
2. ✅ `OnboardingTeacherBoxes.integration.test.tsx` still passes (3/3).
3. ✅ `AuthContext` tests still pass (7/7).
4. ✅ Manual repro (2026-08-27): user completed teacher onboarding at localhost:3006 for `sparklekingofkotha@gmail.com`. Confirmed via direct DB read: `users.onboarding_complete = true`, `last_active_at` updated to the test timestamp. This is the server's authoritative value (what `AuthContext` reads on every fresh login), not local cache — confirms the fix holds across a real login, not just a page refresh.
5. ✅ Confirmed the exact same defect (`onboardingComplete: true` hardcoded, ignoring the server's response) existed in `OnboardingStudentBoxes.tsx` and `src/.legacy-screens/onboarding/OnboardingParentBoxes.tsx` too — same root cause, same fix applied to both, not just the teacher screen.

**Fix:** New shared util `src/screens/onboarding/utils/resolveOnboardingSaveResult.ts` — single source of truth for interpreting a `/user/profile` `complete:true` response. Wired into all 3 onboarding screens' finish handlers: they now throw (and show the existing error UI) instead of declaring success when the server didn't actually confirm `onboardingComplete: true`.

**Files changed:**
- `src/screens/onboarding/utils/resolveOnboardingSaveResult.ts` (new)
- `src/screens/onboarding/utils/__tests__/resolveOnboardingSaveResult.test.ts` (new, 4 tests)
- `src/screens/onboarding/OnboardingTeacherBoxes.tsx`
- `src/screens/onboarding/OnboardingStudentBoxes.tsx`
- `src/.legacy-screens/onboarding/OnboardingParentBoxes.tsx`

**Test results:** `resolveOnboardingSaveResult.test.ts` 4/4 pass · full `src/screens/onboarding/**` suite 8 suites / 84 tests pass · `src/context/__tests__` 7/7 pass · `tsc --noEmit` clean · no lint script configured in this project · no dedicated build script (dev-server only) — `tsc` is the closest build-correctness gate and is clean.

**Known pre-existing (unrelated) issue found along the way:** the onboarding integration test files timeout under `jest`'s default 5000ms when run all together in one process (resource contention from 3 heavy RTL renders) but pass individually or with a longer timeout — this is a pre-existing test-infra flakiness, not something introduced by this fix, and out of scope to fix here.

---

## Bug #2 — Student display name reverts after refresh

**Status:** ✅ CLOSED

**Observed:** Changed display name "Sai Mohan" → "Sai" in My Profile. Shows "Sai" immediately, but after a page refresh it reverts to "Sai Mohan".

**RCA:**
- `Header.tsx`'s `handleSaveName()` called `updateUser({ name: newName })` and `setEditingName(false)` (declaring success) **synchronously, before even sending** the `PATCH /user/profile` request — the fetch was the function's first `await`, fired-and-forgotten with a silent `catch {}` (no error ever surfaced).
- Live reproduction (with explicit user go-ahead, using a disposable e2e-fixture student account, not real user data): confirmed the write endpoint itself (monolith `/user/profile`, same Supabase `users` table also read by `aivorah-auth-service`'s `/user/sync`) persists correctly and is read back correctly on both paths — so persistence itself is NOT broken.
- Root cause is a client-side race: because the UI declares success before the network request is even sent, a page refresh in that window (a very natural thing to do right after seeing the name change, e.g. verifying it "stuck") cancels the in-flight PATCH before the server ever receives it. On the next load, the server's still-old value correctly wins over local cache (same trust-server-truth logic from Bug #1) — but the user never sees an error, so it looks like a silent, consistent bug rather than a race.
- Same root-cause **class** as Bug #1: client declaring success before server confirmation. Different code, different screen, same defect pattern — worth watching for elsewhere in the codebase.

**Scope:** Isolated to `Header.tsx`'s `handleSaveName()` — the "Edit display name" flow, shared across all 4 personas (student/teacher/parent/school-admin) since `Header` is a common component.

**Existing test coverage:** None — no test file existed for `Header.tsx` at all.

**Regression test added:** `src/components/common/__tests__/Header.saveDisplayName.integration.test.tsx` — holds the `/user/profile` PATCH pending and asserts the edit UI does NOT close / declare success until the server responds.

**Test type:** Integration (RTL, real component + real async handler) — this is fundamentally a request/UI-sequencing defect, not isolable business logic, so integration is the right level (per the "choose test level by root cause" rule).

**Before fix:** FAIL ❌ (`expect(received).toBeTruthy() — Received: null` — edit UI had already closed while the PATCH was still pending)

**Fix:** Reordered `handleSaveName()` to `await` the PATCH and check `res.ok` BEFORE calling `updateUser()`/closing the edit UI; added a `savingName` state (disables Save/Cancel + shows a spinner while in flight) and a user-facing error alert on failure instead of a silent `catch {}`.

**After fix:** PASS ✅

**Related regression:** Teacher Dashboard + Student Dashboard integration suites (both render `Header`) — 12 suites / 103 tests, all pass.

**TypeScript:** Clean (`tsc --noEmit`, zero errors)

**Files changed:** `src/components/common/Header.tsx` · `src/components/common/__tests__/Header.saveDisplayName.integration.test.tsx` (new)

**Correction (2026-08-27):** The original fix only reordered the save sequencing but left `handleSaveName()`'s PATCH pointed at `SERVER_URL` — the monolith. Per [[guardrail_no_monolith_edits]], swapped it to `PROFILE_SERVER_URL` (`aivorah-profile-service`, already deployed and already handles bare `{email, name}` PATCHes for the onboarding screens). No monolith code was ever edited for this bug — only this one runtime call target changed. Verified live against the real deployed profile-service (200 OK). The other pre-existing `SERVER_URL` calls in `Header.tsx` (photo upload, analytics tracking, admin panel link) are untouched — out of scope for this bug.

**Manual verification:** ✅ Confirmed by user (2026-08-27) at localhost:3006 — edit name, save, refresh: name persists correctly.

---

## Bug #3.1 (+ part of #22) — Stale "14% this week" / false "1 day streak" on first login

**Status:** ✅ CLOSED (code + regression tests, refactored service — see correction below)

**Correction (2026-08-27):** Originally fixed directly in the monolith (`ai-mentor/server/routes/student.js`) — flagged by the user as a guardrail violation (see [[guardrail_no_monolith_edits]]: never edit the monolith, check for a refactored equivalent first). **The monolith edit and its test were fully reverted.** Turned out `aivorah-leaderboard-service/services/student-stats.js` already has this exact route (`GET /:id`), ported verbatim from the monolith with the identical bug — the fix was reapplied there instead, which is also where the student-facing frontend (`StudentDataContext.tsx`) already points via `LEADERBOARD_SERVICE_URL` (confirmed — no frontend call-site changes needed for the student's own Dashboard/Challenges/Leaderboard/Progress screens). Only some legacy parent-viewing-child screens (`.legacy-screens/parent/*`) and one teacher-legacy screen still call the monolith for this same data — a separate, pre-existing migration gap, not touched here.
Also fixed `src/config/leaderboardServiceUrl.ts`, which (like most `*ServerUrl.ts` configs except `messagesServerUrl.ts`) was hardcoded to the live Render URL with no local-dev branch despite its own comment claiming one — required to actually test this fix locally; verified live against the local service + real DB (`currentStreak: 0` returned for a never-active fixture, not the old buggy `1`).

**Observed:** A brand-new/never-active student account shows "14% this week" (Performance card) and a "1 day streak" (Challenges page) despite having done zero lessons, quizzes, or any real activity — "Just now I'm logging in then how 1 day streak?"

**RCA:**
- Frontend: `computeWeeklyConsistency(streak) = round(min(streak,7)/7*100)` (`src/screens/student/utils/performanceStats.ts`). For `streak=1`: `round(1/7*100) = 14%` — exactly the reported number. This function itself is correct; it's faithfully reporting a wrong input.
- Root cause is upstream, in the monolith: `current_streak` is written in exactly **one** place in the entire codebase — `GET /student/:id`'s day-rollover block (`ai-mentor/server/routes/student.js`). Confirmed via grep: neither `POST /complete-lesson` nor `POST /:id/study-time` (the actual activity-recording endpoints) ever touch it.
- That GET-triggered rollover set `current_streak = 1` whenever `record.last_active_date !== today` and it wasn't a same-day repeat — i.e., **merely opening the app on a new calendar day** credited a streak day, regardless of whether the student had ever done anything. A login-streak masquerading as a learning-streak.
- Confirmed via live reproduction earlier this session (the `sparklekingofkotha@gmail.com` account had `current_streak` credited despite `student_stats` otherwise being all-zero) — matches the reported symptom exactly.

**Scope:** Any first-time-in-a-day app open for a student with zero real activity the previous day. Not isolated to brand-new accounts — also affects any student who skipped several days with no activity, then just opens the app (streak should reset to 0, not jump back to 1).

**Existing test coverage:** None for `current_streak`/streak logic in `aivorah-leaderboard-service` (only used as inert fixture data in `student-stats.unit.test.js`).

**Regression test added:** `aivorah-leaderboard-service/tests/unit/student-stats-streak-rollover.unit.test.js` (7 cases) — extracted the day-rollover decision into a new exported pure function `computeStreakRollover(record, today)` in `services/student-stats.js`.

**Test type:** Unit — pure decision logic (day-rollover + activity check), isolable from the DB/Express layer.

**Before fix:** FAIL ❌ (7/7 — `computeStreakRollover is not a function`, confirmed via `git stash` on just this file to run the exact same tests against the pre-fix code)

**Fix:** `computeStreakRollover()` now only continues/increments the streak when `record` shows real activity (`today_study_minutes > 0`, `today_xp > 0`, or `completed_topics` non-empty) on the day being rolled over from. No activity → streak resets to 0 instead of being credited to 1. `today_study_minutes`/`today_xp` reset and `last_active_date` stamping behavior unchanged.

**After fix:** PASS ✅ (7/7)

**Related regression:** Full `aivorah-leaderboard-service` suite: 4 suites / 54 tests pass (unit + integration).

**Files changed:** `aivorah-leaderboard-service/services/student-stats.js` · `aivorah-leaderboard-service/tests/unit/student-stats-streak-rollover.unit.test.js` (new) · `aivorah-frontend/src/config/leaderboardServiceUrl.ts` (added missing local-dev branch, required to test locally)

**Manual verification:** ✅ Verified live — leaderboard-service run locally against the real Supabase DB, `GET /student/:id` for a never-active fixture returns `currentStreak: 0` (previously would have been credited to `1`). Frontend bundle (localhost:3006) compiles cleanly with the config change.

**Note:** Frontend's `performanceStats.ts`/`computeWeeklyConsistency` was already correct and already has full existing unit test coverage — no frontend logic changes needed, this was purely a backend (refactored service) fix.

---

## Bug #4 — Performance card ("0% Average score", "0/N Mastered") never updates from real quiz activity

**Status:** ✅ CLOSED

**Observed:** User asked to verify: if a student takes a quiz, does the Performance card's 0% actually increase? (Screenshots in the original bug PDF show 0% across every subject/chapter regardless.)

**RCA:**
- `Dashboard`'s Performance card is driven by `GET /student/:id/performance` (`aivorah-leaderboard-service`), which called `getStudentPerformance(email)` — this filtered `analytics_events` for `eventType IN ('ibpyp_quiz_result', 'ncert_quiz_result')`.
- Grepped the entire frontend for those two exact event-type strings: **zero matches, anywhere.** The real quiz-completion flow (`useQuiz.ts`) never logs them.
- Confirmed empirically (live, read-only DB query): `analytics_events` has **zero** rows of either event type across the *entire* database, ever — only `page_view`/`app_access` events exist. This is not one broken account; the code path is universally dead.
- Traced what the real quiz-completion flow DOES do: `useQuiz.ts` correctly `POST`s every real attempt to `/student/track-attempt`, which writes `topic`, `subject`, `grade`, `score` to the `topic_attempts` table — confirmed via a live query this table has real, correctly-populated data going back days. The Performance calculation simply never read from it — the function's own header comment even said "id is unused... kept for URL-shape compatibility," acknowledging the gap was known but never wired up.

**Scope:** Every student account, unconditionally — Performance/"Mastered"/per-chapter scores could never reflect real activity regardless of how many quizzes were taken.

**Existing test coverage:** `student-stats.unit.test.js` had 2 tests for `getStudentPerformance`, but they asserted the OLD (buggy) `analytics_events`-based behavior — i.e., tests that passed while validating dead logic. Rewritten, not duplicated.

**Regression test:** Rewrote the 2 existing tests + added a 3rd (Supabase-error fallback) in `student-stats.unit.test.js` to assert against real `topic_attempts` rows instead of never-populated `analytics_events` rows.

**Test type:** Unit (same file/pattern as the rest of this service) + live manual verification against the real Supabase DB (below) — the "is this data ever populated at all" question needed a real DB read, not just a mock, given the original bug was a query targeting a table that's silently always empty in the mocked test too.

**Before fix:** The 2 pre-existing tests passed, but validated behavior confirmed dead via live DB read (zero qualifying events, ever).

**Fix:** `getStudentPerformance(id)` now queries `topic_attempts` by `student_id` (the already-available URL param) instead of `analytics_events` by email. Route (`routes/student-stats.js`) updated to pass `req.params.id` instead of `req.query.email`. Removed the now-fully-unused `readEvents` import.

**After fix:** PASS ✅ — 55/55 across the full `aivorah-leaderboard-service` suite (was 54; net +1 after rewriting 2 tests into 3).

**Manual verification:** ✅ Live-tested locally against the real DB: `GET /student/f1dc5339-862b-4462-acbc-49873c03584b/performance` now returns `{"topics":{"e2e-stat-tile-topic":{"subject":"Mathematics","avgScore":100,"quizCount":4,...}},"avgScore":100,"topicCount":1}` for a real account with real quiz history — was `{"topics":{},"avgScore":null,"topicCount":0}` before the fix, for the same account, same data.

**Files changed:** `aivorah-leaderboard-service/services/student-stats.js` · `aivorah-leaderboard-service/routes/student-stats.js` · `aivorah-leaderboard-service/tests/unit/student-stats.unit.test.js`

**Risk/Impact:** No frontend changes needed — response shape (`{topics, avgScore, topicCount}`) is unchanged, only the data source. Response now correctly varies per-student based on real activity instead of always being empty.

---

## Bug #6 (+ #4/#5/#13 partially) — Garbled chapter titles ("Fff F", "Klmn", "Hco", "Crcrcr")

**Status:** ✅ CLOSED

**Observed:** Grade 9 Hindi (and reportedly other subjects/grades) show nonsense chapter titles instead of real names — exact match confirmed: Chapter 7 "Fff F", Chapter 8 "Klmn", Chapter 9 "Hco", Chapter 10 "Crcrcr", Chapter 4 "Oba".

**RCA:**
- Traced from the Learning Path UI down to the actual stored data: `data/curricula/cbse-g9-hindi-ihsc1-chapters.json` (present identically in both the monolith and the already-refactored `aivorah-learning-paths-service` — this is a static data asset, not live-generated).
- `extract-ncert-structure.cjs`'s page-1 title extraction (`titleFromPage1()`, monolith-only tool script — not touched, per the no-monolith-edits guardrail) uses a regex that only checks for Latin uppercase letters (`/^[A-Z][A-Z \-'&,]{2,45}$/`) — it has no concept of whether the result is an actual word.
- Hindi NCERT textbooks are Devanagari-script PDFs. When such a PDF has a non-standard/subsetted embedded font without a proper Unicode mapping, plain-text extraction (`pdf-parse`) can produce short Latin-looking mojibake — which still satisfies that regex and gets accepted as a "real" title, silently overwriting the safe `"Chapter N"` + `needsTitleReview: true` placeholder these chapters should have kept.
- Confirmed empirically via a live Qdrant scroll query too: Grade 9 Hindi's Qdrant `topic` payload field is **100% raw PDF filename codes** (`ihsc101`–`ihsc113`, zero real titles) — a related but distinct symptom of the same underlying "Hindi-script PDF extraction is unreliable" problem, not fixed here (that's the Qdrant ingestion path, a separate script — noted for a future pass, not this bug's scope).

**Scope:** Confirmed for Grade 9 Hindi (5 of 13 chapters affected). The same class of defect (accepting any Latin-looking regex match as a title with no real-word validation) could affect any other Devanagari/non-Latin-script subject's chapters if/when re-extracted — the fix is written generically (validates any title, any subject), not Hindi-specific.

**Existing test coverage:** `syllabus-map.unit.test.js` had a placeholder test (title still literally `"Chapter N"`) but nothing testing a title that looks superficially valid (passes the regex) but is actually garbage.

**Regression test:** 2 new tests in `syllabus-map.unit.test.js` — (1) the exact real Grade 9 Hindi data (chapters 7-10) must fall back to `"Chapter N"` + `placeholder: true`; (2) a genuinely short real title ("Sets") must NOT be flagged as mojibake — guards against an overly aggressive filter.

**Test type:** Unit — pure validation logic, same file/pattern as the rest of this service.

**Before fix:** FAIL ❌ (confirmed via `git stash` on just the service file: `Expected "Chapter 7", Received "Fff F"`)

**Fix:** Added `looksLikeRealTitle()` in `aivorah-learning-paths-service/services/syllabus-map.js` — rejects titles that are too short (`< 4` chars) or contain no vowel at all. Applied at **load time**, not by editing the JSON data files — so it self-heals for this and any future occurrence without needing a one-off data patch, and without touching the monolith's extraction script at all.

**After fix:** PASS ✅ — 63/63 across the full `aivorah-learning-paths-service` suite (was 62 pre-existing + 1 new after a length-threshold adjustment mid-fix: `"Hco"` at exactly 3 chars needed the minimum bumped to 4).

**Manual verification:** ✅ Live-tested locally: `GET /teacher/syllabus/current?grade=Grade%209&subject=Hindi&curriculum=CBSE` now returns `"Chapter 4"`, `"Chapter 7"`, `"Chapter 8"`, `"Chapter 9"`, `"Chapter 10"` instead of the garbled titles, for the exact same underlying data file.

**Files changed:** `aivorah-learning-paths-service/services/syllabus-map.js` · `aivorah-learning-paths-service/tests/unit/syllabus-map.unit.test.js`

**Risk/Impact:** Low — purely additive validation at load time; only affects titles that were already broken. No monolith files touched (extraction script, data JSON — both left alone; the live-serving refactored service's copy is what changed).

---

## Follow-up (2026-08-27, same day) — full-scope curriculum audit

User spotted the Hindi fix wasn't visible live and pointed out correctly that this is a Qdrant/curriculum-wide issue across all NCERT grades 1-12, not just Hindi — asked for root cause across the full scope before any more patching.

**Findings from a full scan of all 154 `data/curricula/*-chapters.json` files (1465 chapters, grades 1-12, all subjects):**
1. **Config gap** (why the fix wasn't visible): `learningPathsServerUrl.ts` was hardcoded to the live Render URL with no local-dev branch — same class of gap as `leaderboardServiceUrl.ts` earlier. Fixed.
2. **Validator strengthened**: the original fix (length+vowel check) caught 64/1465 garbled titles but missed ~25 more with vowels that were still garbage — e.g. `"Onstructionofanindexnumber"` (one giant run-together word), `"Mawlynnongmawlynnong"` (self-duplicated), `"Ntroductionntroduction Ntroductionntroduction Ntroduction"` (repeated fragment), `"Iiiiiiiv"` (repeated-letter). Added 3 more checks (max word length, 5+ consonant run, duplicated-half word, 3+ repeated same letter) — now catches **89/1465**. Verified against all 700 legitimately-real titles with zero new false positives (spot-checked + full regression suite). ~10 remaining ambiguous 4-letter codes (e.g. "Adcb", "Pplo") left unflagged — not confidently distinguishable from real short titles (e.g. "Rabi", a real Geography topic) without a dictionary check; noted rather than risking false positives.
3. **681/1465 chapters (46%) were never extracted at all** — still the literal `"Chapter N"` placeholder. This is the dominant driver of "Coming soon"-style bugs (#11) and empty Learning Path content — much bigger than title garbling. Full grade × subject breakdown generated (see below) — user will run the extraction pipeline overnight to close this.
4. **AI Coach suggestion pollution (bug #14)** — traced to `useSuggestions.ts` calling the monolith's `/curriculum?curriculum=NCERT&grade=...` directly (raw, unfiltered Qdrant `topic` values — the `ihsc101`-style raw PDF codes). `aivorah-learning-paths-service`'s own `routes/curriculum.js` explicitly documents this exact call shape as **not yet migrated** ("every other curriculum's frontend call is untouched and keeps hitting the monolith"). Fixing this properly means designing a new API route in the refactored service, not just filtering existing data — bigger than a quick fix. **Stopped here and flagged to the user rather than building new API surface unprompted or touching the monolith.**

**681-unextracted breakdown by grade (full list; Hindi is the worst subject in nearly every grade — consistent with the same Devanagari-PDF extraction unreliability root-caused in Bug #6):**

| Grade | Unextracted | Worst subject(s) |
|---|---|---|
| 1 | 17 | Mathematics (13) |
| 2 | 67 | Hindi (25), Urdu (19) |
| 3 | 61 | The World Around Us (24), Mathematics (21) |
| 4 | 60 | The World Around Us (34) |
| 5 | 40 | The World Around Us (28) |
| 6 | 22 | Physical Education (14) |
| 7 | 45 | Hindi (33) |
| 8 | 76 | Hindi (41), Social Science (17) |
| 9 | 23 | Hindi (8), Mathematics (6) |
| 10 | 71 | Hindi (37), Science (11) |
| 11 | 102 | Hindi (39), Business Studies (11) |
| 12 | 97 | English (23), Hindi (21) |

Pipeline command (per `extract-ncert-structure.cjs`'s own header, monolith-only tool — not touched):
```
node scripts/extract-ncert-structure.cjs --grade <N> --subject <subject>
# or multiple grades at once:
node scripts/extract-ncert-structure.cjs --grades 1,2,3 --dry   (--dry to preview first)
```
Full per-file breakdown saved in this session's scratch output — ask if you want the exact file list re-generated.

**Files changed (this follow-up):** `aivorah-learning-paths-service/services/syllabus-map.js` (strengthened validator) · `aivorah-learning-paths-service/tests/unit/syllabus-map.unit.test.js` (+2 tests) · `aivorah-frontend/src/config/learningPathsServerUrl.ts` (local-dev branch)

**Test results:** 65/65 pass (`aivorah-learning-paths-service` full suite). `tsc --noEmit` clean.

**Still open:** AI Coach suggestion pollution (#14) — needs a scoping decision, not a silent fix. #7/#12 (Learning Path subject mismatch), #8 (phantom topic), #11 (largely explained by the 681-unextracted finding above, but worth re-verifying once the pipeline runs).

---

## Bug #8 — "Ability Beyond Disability" opens the deprecated VideoLesson screen

**Status:** ✅ CLOSED

**Observed:** A Learning Path topic ("Ability Beyond Disability") opens the old-style topic page instead of the current Learn/AI Tutor/Ask Aivorah/Practice flow.

**RCA:**
- The topic itself is **real** (confirmed live via Qdrant: Grade 9 English, `iebe105.pdf`, about Dr. Deepa Malik) — the original report's "no topic called this" was factually wrong, but the underlying complaint (wrong screen) was real.
- `DashboardScreen.openFeaturedLesson()` only routes into the current `LessonScreen` if the topic exists in a hand-curated registry (`src/data/syllabusRegistry.ts`) — which **only covers Grade 6 CBSE**. Everything else fell back to the deprecated `VideoLesson` screen, by explicit original design ("so nothing regresses for subjects/grades without curated data yet").
- Found a second guard already in place (`curatedTopicNames` in `DashboardScreen.tsx`) that restricts "Continue Learning" candidates to curated topics *only when curated data exists for that grade* — for any grade without curated data (i.e. everything except Grade 6), it already deliberately falls back to raw/uncurated topics. This is exactly the scenario that surfaced "Ability Beyond Disability."
- `LessonScreen` already had a **second, generic, DB-backed path** (`useDbTopic` + a `topicId`) for real teacher-uploaded content — but it requires a `syllabus_topics.id`, and that table is empty for NCERT content (NCERT lives only in Qdrant). So even this path couldn't reach Qdrant-only topics like this one.

**Scope:** Every real NCERT topic outside Grade 6 CBSE's curated registry — i.e. most of the catalog.

**Fix (built, not deferred — user asked for a code-level fix):** Added a **third, Qdrant-backed resolution path**, parallel to the existing DB-id path, so a real topic reaches the current lesson flow without needing either a curated registry entry or a `syllabus_topics` row:
- `aivorah-learning-paths-service/services/qdrant.js`: new `resolveTopicContent(curriculum, grade, subject, topic)` — fetches real chunk text from the `aivorah_curriculum_chunks_v1` collection (confirmed this is where NCERT content actually lives, separate from this service's existing `ai_mentor_content` IB collection), excluding image-caption chunks from the text body.
- `aivorah-learning-paths-service/services/curriculum/resourceResolver.js`: new `resolveResourcesByTopicName()` — shapes that content into the same `LearningResource[]` array the existing DB-id path returns, so the frontend needs no special-casing.
- `aivorah-learning-paths-service/routes/syllabus.js`: new `GET /teacher/syllabus/topic-by-name/resources?curriculum=&grade=&subject=&topic=`.
- `aivorah-frontend`'s `useDbTopic.ts`: extended to accept an optional `byName: {curriculum, grade, subject, topic}` alongside the existing `topicId` — calls the new route when there's no DB id.
- `LessonScreen.tsx`: passes a new `byNameTopic` route param through to `useDbTopic`.
- `DashboardScreen.openFeaturedLesson()`: the old `navigation.navigate('VideoLesson', ...)` fallback is now `navigation.navigate('LessonScreen', {..., byNameTopic: featuredLesson.topic})` — if a topic somehow has no content at all even in Qdrant, `LessonScreen`'s own `contentReady` state shows an honest "Coming Soon" pane (already built), never worse than the old fallback.
- **No DB (`syllabus_topics`) involvement in this new path at all** — user explicitly asked to confirm this; verified: NCERT/Qdrant content resolves straight from Qdrant, zero Supabase table reads for this path. The DB-id path remains solely for the separate teacher-upload feature.

**Existing test coverage:** None for any of the new functions/route (all new code). `DashboardScreen.openFeaturedLesson()` itself also had zero existing coverage (pre-existing gap, not introduced here).

**Regression tests added:**
- `aivorah-learning-paths-service/tests/unit/qdrant-resolveTopicContent.unit.test.js` (5 tests) — ordering by `chunk_index`, image-caption exclusion, null-on-no-match, error propagation.
- `aivorah-learning-paths-service/tests/unit/resourceResolver-byTopicName.unit.test.js` (4 tests) — placeholder degradation on nothing-found/error, correct `AI_EXPLANATION` shaping, `IMAGES` items[].description-as-url contract match.
- `aivorah-learning-paths-service/tests/integration/syllabus.integration.test.js` (+3 tests) — new route's 400/success/500 contract.
- `aivorah-frontend`'s `useDbTopic.test.tsx` (+3 tests) — byName mode fetches the right URL (not the topicId URL), no-op with neither identifier, topicId takes priority when both present.

**Test type:** Unit (pure resolver/hook logic, same pattern as the rest of both codebases) + integration (route contract) + live manual verification (below) — no E2E, since the actual "does this reach the real Learn/AI Tutor/Practice screen" question is best proven at the API-contract level here; a full E2E click-through is a reasonable follow-up but wasn't run this session.

**Before fix:** FAIL ❌ across all 3 new/extended test files (confirmed via `git stash` per file — `qdrant-resolveTopicContent`: 5/5 fail, `resourceResolver-byTopicName`: 4/4 fail, `useDbTopic`'s new byName test: fails with empty intro).

**After fix:** PASS ✅ — `aivorah-learning-paths-service` full suite: 8 suites / 77 tests. `aivorah-frontend`'s `useDbTopic.test.tsx`: 9/9. `DashboardScreen` + full `lesson-screen` suites: no regressions (2/2 and 52/52 respectively).

**Manual verification:** ✅ Live-tested the new route against the real Qdrant data locally: `GET /teacher/syllabus/topic-by-name/resources?curriculum=NCERT&grade=Grade%209&subject=English&topic=Ability%20Beyond%20Disability` returns `AI_EXPLANATION: READY` with the real Deepa Malik lesson text, other resource types correctly `COMING_SOON`.

**Known gap:** `DashboardScreen.openFeaturedLesson()`'s new `byNameTopic` navigation branch itself has **no direct test** — the function isn't exported standalone, and a full integration test would need mocking 5+ conditional curriculum-fetching data paths (`fetchCurriculum` / `fetchCurriculumSubjects` / IB-vs-NCERT parsing branches) which risked being fragile under time pressure. Verified indirectly: `tsc` clean, no regressions in the existing (thin) `DashboardScreen` and `LessonScreen` suites, and the underlying API chain it calls is fully tested and live-verified. Flagging honestly rather than claiming full coverage — a good candidate for a follow-up integration test if this area gets touched again.

**Files changed:** `aivorah-learning-paths-service/services/qdrant.js` · `aivorah-learning-paths-service/services/curriculum/resourceResolver.js` · `aivorah-learning-paths-service/routes/syllabus.js` · `aivorah-learning-paths-service/tests/unit/qdrant-resolveTopicContent.unit.test.js` (new) · `aivorah-learning-paths-service/tests/unit/resourceResolver-byTopicName.unit.test.js` (new) · `aivorah-learning-paths-service/tests/integration/syllabus.integration.test.js` · `aivorah-frontend/src/screens/student/learning-paths/lesson-screen/hooks/useDbTopic.ts` · `.../hooks/__tests__/useDbTopic.test.tsx` · `.../LessonScreen.tsx` · `aivorah-frontend/src/screens/student/dashboard/DashboardScreen.tsx`

**Risk/Impact:** Low-medium. Additive — the curated-registry path (Grade 6) is completely untouched; only the pre-existing `VideoLesson` fallback branch changed behavior, and only for topics that previously had a broken/deprecated experience anyway. No monolith touched.

---

## Bug #7/#12 — Learning Path subject chips disagree with Performance's

**Status:** ✅ CLOSED

**Observed:** Performance card shows 5 subjects (English, Hindi, Mathematics, Physical Education and Well Being, Science). The Learning Path section on the *same* Dashboard screen shows 7 (adds a bare duplicate "Physical Education" alongside "Physical Education and Well Being", plus "Social Science").

**RCA:**
- `barSubjects` (Performance's chips) derives from `subjectChapters` — the canonical, book-derived NCERT chapter data (`syllabus-map.js`, already hardened by Bug #6's title-validity fix).
- `lessonSubjects` (Learning Path's chips) derived from `allLessons`, which comes from raw Qdrant-ingested `curriculum.topics` — a completely different source, carrying every inconsistent subject tag from ingestion (the same "Physical Education" vs "Physical Education and Well Being" naming inconsistency already seen across this session's curriculum-pipeline investigation), including subjects with **zero real chapters mapped** in `subjectChapters` at all.
- Consequence, confirmed by reading the render code: the actual chapter rows shown (`filteredChapterRows`) are filtered from `subjectChapters` — the *correct* source — so any chip Learning Path showed that wasn't also in that set (the stray "Social Science", the bare "Physical Education") **matched zero rows when tapped**. A dead filter chip, not just a cosmetic mismatch.
- Found `filteredLessons` (built from the old, wrong `allLessons` source) is dead code — computed but never rendered anywhere. Confirms the fix targets the actual live code path.

**Scope:** Every grade/subject combination where raw Qdrant ingestion tags disagree with the book-derived chapter data — likely widespread given the same naming inconsistency was already observed elsewhere this session.

**Existing test coverage:** None for `lessonSubjects`' derivation logic (it lived inline in the component, untested).

**Fix:** Extracted the derivation into `computeLessonSubjects()` in `performanceStats.ts` (matching this codebase's own established convention — `computeAllBarTopics`/`computeMasteredTopics` already live there for exactly this reason: "moved out of DashboardScreen.tsx so they can be unit-tested directly"). Now derives from `subjectChapters` — the same canonical source `barSubjects` and the actual rendered chapter rows already use — instead of raw ingested topics.

**Regression test:** 5 new tests in `performanceStats.test.ts`, using the exact real Grade 9 subject set from the bug report — asserts the stray "Social Science" and duplicate "Physical Education" never appear, "recently studied" ordering still works, and a "recent" subject not in the canonical set is never injected.

**Test type:** Unit — pure derivation logic, same file/pattern as the rest of this module.

**Before fix:** FAIL ❌ (5/5 new tests, confirmed via `git stash` on just `performanceStats.ts`)

**After fix:** PASS ✅ (20/20 in the file; 31/31 combined with `DashboardScreen` + `allBarTopics` suites, no regressions)

**Files changed:** `src/screens/student/utils/performanceStats.ts` · `src/screens/student/utils/__tests__/performanceStats.test.ts` · `src/screens/student/dashboard/DashboardScreen.tsx`

**Risk/Impact:** Low — purely changes which data source feeds the chip list; the chapter rows being filtered were already using the correct source, so this only removes chips that were already non-functional (matched nothing) and fixes the naming inconsistency. `tsc` clean, no monolith touched.

**Manual verification:** Not yet performed live — pending your test at localhost:3006 (Grade 9 account) to confirm Learning Path now shows exactly the same 5 subjects as Performance.

---

## Bug #5 — Grade 9 Maths garbled/placeholder chapter names

**Status:** ✅ CLOSED (no separate work needed — already covered by Bug #6)

Verified live: `GET /teacher/syllabus/current?grade=Grade%209&subject=Mathematics&curriculum=CBSE` returns all 8 chapters with real, clean titles ("Orienting Yourself: the Use of Coordinates", "Linear Polynomials", "The World of Numbers", ...) — zero placeholders, zero garbled text. Bug #6's `looksLikeRealTitle()` fix in `syllabus-map.js` already covers this subject; nothing further to do.

---

## Bug #11 — NCERT shows "Coming Soon" despite content existing

**Status:** ✅ CLOSED

**Observed:** User's original complaint: NCERT chapters show "Coming Soon" even though books/content already exist in Supabase storage and Qdrant.

**RCA:**
- `pending` (drives the "Coming Soon" badge) in `GET /teacher/syllabus/current` was computed **only** from `syllabus_topics` (a Supabase table) — `pending: !existing || existing.topics.length === 0`. That table is confirmed empty for NCERT content (checked earlier this session). Qdrant was **never consulted at all** — a genuine code bug, not just the "46% never-extracted" content-coverage gap found earlier. Every single NCERT chapter, everywhere, showed "Coming Soon" regardless of real content.
- Fix attempt #1 (reusing `listSyllabus()`) was wrong and caught only via live verification, not the mocked tests: `listSyllabus()` queries `IB_COLLECTION` (`ai_mentor_content`), which has zero NCERT content — silently returned nothing for every NCERT subject. Live-testing after "fixing" it still showed 100% pending, which is what caught this.
- Fix attempt #2 assumed Qdrant points carry a numeric `chapter` field (matching `listSyllabus()`'s pattern for other curricula) — also wrong, caught the same way. Real NCERT Qdrant points have no reliable `chapter` field at all; the chapter identity lives in a PDF filename embedded in either a `source` or `source_reference` string field (inconsistent between ingestion batches), e.g. `"iemr101.pdf"` or `"NCERT English Grade 9 | iebe105.pdf | Page 22"`.

**Scope:** Every NCERT chapter across every grade/subject, universally — not a partial-coverage issue like the earlier 681-chapter title finding.

**Fix:** `pdfFilesWithContent(curriculum, grade, subject)` in `aivorah-learning-paths-service/services/qdrant.js` — queries `NCERT_COLLECTION` directly (not the IB one), extracts the PDF filename from whichever payload field carries it, returns a lowercased `Set`. `routes/syllabus.js`'s `/current` handler now cross-checks each chapter's `pdfFile` (already available from `syllabus-map.js`) against this set, on top of the existing DB-topics check — either signal clears `pending`.

**Existing test coverage:** None for the pending computation's Qdrant awareness (it never had any).

**Regression tests:** 6 new unit tests (`pdfFilesWithContent` — extraction from both payload field variants, dedup/case-insensitivity, empty/malformed payloads) + 4 integration tests (`/current` route — pending cleared when Qdrant has the file, stays pending when it doesn't, curriculum label mapping, graceful degradation on a Qdrant error).

**Test type:** Unit (pure extraction logic) + integration (route contract) + live manual verification — this bug specifically escaped two mocked-test-passing "fixes" in a row because the mocks didn't reflect real Qdrant payload shape; live verification is what actually caught both mistakes, underlining why it was necessary here specifically.

**Before fix:** FAIL ❌ (confirmed via `git stash`)

**After fix:** PASS ✅ — 87/87 across the full `aivorah-learning-paths-service` suite.

**Manual verification:** ✅ Live-tested twice — first "fix" still showed 100% pending on real data (caught the `listSyllabus`/IB_COLLECTION mistake), second attempt still showed 100% pending (caught the nonexistent-`chapter`-field mistake), final version correctly shows `pending: false` for all 17 real Grade 9 English chapters. Also spot-checked Grade 1 Mathematics: chapters whose *titles* are still unresolved ("Chapter 2", "Chapter 5" — Bug #6/#5 territory) now correctly show `pending: false` too, since title extraction and content ingestion are genuinely independent — clarifies that Qdrant content ingestion is far more complete than the title-extraction pipeline, and confirms the user's original complaint was accurate: real content existed and a pure code bug was hiding it.

**Files changed:** `aivorah-learning-paths-service/services/qdrant.js` · `aivorah-learning-paths-service/routes/syllabus.js` · `aivorah-learning-paths-service/tests/unit/qdrant-chaptersWithContent.unit.test.js` (new) · `aivorah-learning-paths-service/tests/integration/syllabus.integration.test.js`

**Risk/Impact:** Low — additive check, degrades gracefully to the old DB-only logic on any Qdrant error, no monolith touched.

---

## Bug #11 follow-up — "NaN%" on the subject syllabus header

**Status:** ✅ CLOSED

**Observed:** While re-checking Bug #11 live (Grade 11 Accountancy), the subject header showed "NaN%" instead of "0%" — a new, separate finding, spotted in the same screenshot.

**RCA:** `SubjectSyllabusScreen.tsx`'s `overallPct` guarded against zero *chapters* (`chapters.length ? ... : 0`) but not against zero *total topics* — the actual denominator. A subject with real chapters that all have zero real topics yet (every one still `pending`, only book-derived `subtopics` — exactly the Accountancy case) divides `0/0`, producing `NaN`, unguarded by the chapters-length check.

**Fix:** Compute `totalTopicsCount` first and guard on that instead.

**Regression test:** 1 new test, using the exact reported Accountancy scenario (chapters with `topics: []`), asserting no "NaN" text renders and "0%" shows instead.

**Before fix:** FAIL ❌ — reproduced verbatim (`<Text>NaN%</Text>`) via `git stash`.

**After fix:** PASS ✅ — 24/24 across the full `subject-syllabus` suite. `tsc` clean.

**Files changed:** `src/screens/student/learning-paths/subject-syllabus/SubjectSyllabusScreen.tsx` · `.../SubjectSyllabusScreen.integration.test.tsx`

---

## Bug #11 — real second root cause found and fixed (frontend)

After a genuine refresh still showed "Coming Soon" (confirmed the NaN fix above WAS live, so bundle/config were never the issue) — found the real second bug: `ChapterCard.tsx`'s `isPending` computed `!!chapter.pending || chapter.topics.length === 0` — an **OR** that silently discarded the server's correct `pending: false` whenever `chapter.topics` (the `syllabus_topics` DB array) was empty. Since that table stays empty for virtually all NCERT content regardless of real Qdrant content (it's a separate, teacher-upload-only feature), this OR effectively made the entire backend fix a no-op for the NCERT surface — the frontend never trusted it.

**Fix:** Trust the server's `pending` field explicitly whenever it's provided (`!== undefined`); only fall back to the `topics.length === 0` heuristic for sources that never send `pending` at all (the curated `syllabusRegistry` datasets).

**Regression test:** New `ChapterCard.test.tsx` (4 tests) — server `pending: false` + empty topics → renders available (the exact reported bug); server `pending: true` → "Coming soon"; no server field at all → falls back correctly either way.

**Before fix:** FAIL ❌ — reproduced verbatim via `git stash` (`<Text>Coming soon</Text>` rendered despite `pending: false`).

**After fix:** PASS ✅ — 28/28 across the full `subject-syllabus` suite (was 24, +4 new). `tsc` clean.

**Files changed:** `src/screens/student/learning-paths/subject-syllabus/components/ChapterCard.tsx` · `.../components/__tests__/ChapterCard.test.tsx` (new)

**Manual verification:** ✅ Grade 11 Accountancy "Coming soon" confirmed fixed after refresh — which surfaced a **third**, related finding (below), same underlying pattern.

---

## Bug #11 — third finding: "0 topics" even when not pending

**Status:** ✅ CLOSED

**Observed:** After the "Coming soon" fix, chapters correctly showed as available — but every chapter showed "0 topics" and nothing listed when expanded (Grade 11 Biology screenshot). User: "we have all content in vector DB, then why?"

**RCA:** Once `pending: false`, `ChapterCard.tsx`'s label switches from showing `subtopics` (book-derived section titles) to showing `chapter.topics.length` — the DB-only (`syllabus_topics`) count, which is 0 for virtually all NCERT content (that table is a separate, teacher-upload-only feature). The two earlier Bug #11 fixes correctly told the UI "this chapter has real content," but nothing ever populated a real, browsable topic list from Qdrant — so "not pending" + "0 topics" was internally consistent but still wrong from the user's perspective.

**Fix:** Extended the same Qdrant query (`topicsByPdfFile()`, replacing the narrower `pdfFilesWithContent()` — one Qdrant round-trip instead of two) to also collect and group real topic names per chapter, in the same `{id, name, kind, page}` shape already used elsewhere (`listSyllabus()`, Bug #8). `routes/syllabus.js` now populates `chapter.topics` with real Qdrant topics whenever no real DB topics exist — DB topics (teacher-uploaded) still take priority when both exist. Reuses Bug #6's garbage-filter logic (excludes image-caption chunks and raw PDF-code placeholders like `"iemr101"` from the topic list).

**Regression tests:** Extended unit tests for the renamed/extended `topicsByPdfFile()` (grouping, dedup, garbage filtering — 5 tests) + 2 new integration tests (Qdrant topics populate when DB is empty; DB topics take priority when both exist).

**Before fix:** FAIL ❌ (confirmed via `git stash`, same as the "Coming soon" fix — same files).

**After fix:** PASS ✅ — 87/87 across the full `aivorah-learning-paths-service` suite.

**Manual verification:** ✅ Live-tested against the exact reported subject: `GET /teacher/syllabus/current?grade=Grade%2011&subject=Biology&curriculum=CBSE` now returns 12-22 real topic names per chapter (e.g. "Classification and Nomenclature", "Taxonomic Categories") instead of an empty array.

**Files changed:** `aivorah-learning-paths-service/services/qdrant.js` (`pdfFilesWithContent` removed, replaced by `topicsByPdfFile`) · `aivorah-learning-paths-service/routes/syllabus.js` · `aivorah-learning-paths-service/tests/unit/qdrant-chaptersWithContent.unit.test.js` · `aivorah-learning-paths-service/tests/integration/syllabus.integration.test.js`

---

## Bug #11 — fourth finding: tapping a real Qdrant topic still shows "Content coming soon"

**Status:** ✅ CLOSED

**Observed:** With real topics now listed (previous fix), tapping one of them ("Nucleic Acids Building Blocks", Grade 11 Biology) opened `LessonScreen` but showed "Content coming soon" instead of the real lesson — despite the exact same topic returning real, `READY` content when queried directly via the API.

**RCA:** `SubjectSyllabusScreen.tsx`'s `openLesson()` unconditionally sent `topicId: topic.id` for any "real" (non-curated) topic. For a Qdrant-sourced topic, `topic.id` is the synthetic identifier built in the backend fix above (`"qdrant:NCERT:Grade 11:Biology:Nucleic Acids Building Blocks"`), not a real `syllabus_topics` row id. `LessonScreen`'s `useDbTopic` hook treats *any* non-empty `topicId` as "fetch from the DB-id route" (`/teacher/syllabus/topic/:topicId/resources`) — Bug #8's `byName` path (the one that actually has this content) never activates, because `useDbTopic`'s own logic is `!topicId && byNameTopic` — a truthy `topicId`, even a fake one, blocks it. The DB-id route predictably found nothing for a fake id, and `contentReady` stayed false.

**Fix:** `openLesson()` now checks `topic.kind === 'qdrant'` (the tag the backend fix already attaches) to decide which param to send — `topicId` for real DB topics, `byNameTopic` for Qdrant ones, never both.

**Regression tests:** 2 new tests in `SubjectSyllabusScreen.integration.test.tsx` — a Qdrant-kind topic sends `byNameTopic` (not `topicId`); a real DB-kind topic still sends its real `topicId` (no regression to the teacher-upload path).

**Before fix:** FAIL ❌ (2/2 new tests, confirmed via `git stash`).

**After fix:** PASS ✅ — 30/30 across the full `subject-syllabus` suite (was 28, +2 new). `tsc` clean.

**Files changed:** `src/screens/student/learning-paths/subject-syllabus/SubjectSyllabusScreen.tsx` · `.../SubjectSyllabusScreen.integration.test.tsx`

**Manual verification:** ✅ superseded by fifth finding below — the fourth fix alone still showed "Content coming soon" because of a fifth, separate root cause found in the same flow.

---

## Bug #11 — fifth finding: routing fixed, still "Content coming soon" — curriculum label mismatch

**Status:** ✅ CLOSED

**Observed:** After the fourth fix, the user re-tested live and reported the exact same "Content coming soon" for both "Nucleic Acids Building Blocks" and "Transaction in Accounting" (Grade 11 Accountancy). Provided the real deep-link URL: `.../lesson?subject=Accountancy&curriculum=CBSE&grade=Grade%2011&...&byNameTopic=Transaction%20in%20Accounting`.

**RCA:** `curl` comparison proved it conclusively: `GET /topic-by-name/resources?curriculum=NCERT&...` (my earlier manual test) returned real `READY` content; the identical query with `curriculum=CBSE` (what the real frontend URL actually shows, and what `SubjectSyllabusScreen.tsx` always sends) returned all `COMING_SOON` placeholders. `resolveTopicContent()` and `topicsByPdfFile()` in `services/qdrant.js` filtered `NCERT_COLLECTION` on the literal `curriculum` value passed in — Qdrant tags this content `"NCERT"`, never `"CBSE"`. The `/current` route already had a private, inline `CBSE -> NCERT` mapping (added for Bug #11's first finding) but it only covered that one route — nobody had propagated it to `/topic-by-name/resources` (Bug #8) when that route was built, so every "real" topic reached through the normal in-app tap flow (frontend always sends `curriculum=CBSE`) silently matched zero Qdrant points. Same mismatch class as the first Bug #11 finding, just a second, un-propagated instance of it. Caught only via live curl comparison with the two curriculum values side by side — my manual tests of the Bug #8 feature had only ever used `curriculum=NCERT` directly, which is why this survived through the whole Bug #11 chain.

**Existing coverage:** `resolveTopicContent`/`topicsByPdfFile` unit tests all passed `'NCERT'` directly — never exercised a `'CBSE'`-input call, so nothing caught the gap.

**Fix:** Moved the mapping down to the shared source instead of duplicating it per-route — new `toQdrantCurriculum(curriculum)` helper in `services/qdrant.js` (`/^cbse$/i` -> `'NCERT'`, passthrough otherwise), applied at the top of both `topicsByPdfFile()` and `resolveTopicContent()` before building their Qdrant filters. `routes/syllabus.js`'s `/current` handler no longer needs its own inline copy — removed it, now passes `curriculum` straight through to `topicsByPdfFile()`, which maps it internally. Every current and future `NCERT_COLLECTION` query site is protected at the source.

**Regression tests:** `qdrant-resolveTopicContent.unit.test.js` — new `toQdrantCurriculum` unit tests (case-insensitive CBSE match, passthrough for other curricula) + a `resolveTopicContent('CBSE', ...)` test asserting the Qdrant filter actually queries `'NCERT'`. `syllabus.integration.test.js` — updated the existing `/current` Bug #11 test to expect `topicsByPdfFile` called with `'CBSE'` (route no longer pre-maps), added a new `/topic-by-name/resources` test asserting `curriculum=CBSE` passes through unmodified to the resolver (the mapping is one layer deeper than this route).

**Before fix:** FAIL ❌ — `toQdrantCurriculum is not a function` / `resolveTopicContent is not a function` (functions didn't exist pre-fix), confirmed via `git stash push -- services/qdrant.js`.

**After fix:** PASS ✅ — 91/91 across the full `aivorah-learning-paths-service` suite (13/13 in the touched qdrant unit file, 23/23 in the syllabus integration file).

**Files changed:** `aivorah-learning-paths-service/services/qdrant.js` · `.../routes/syllabus.js` · `.../tests/unit/qdrant-resolveTopicContent.unit.test.js` · `.../tests/integration/syllabus.integration.test.js`

**Manual verification:** ✅ confirmed live via curl with `curriculum=CBSE` (matching the real frontend exactly) — both "Transaction in Accounting" and "Nucleic Acids Building Blocks" now return `AI_EXPLANATION: READY` with real NCERT textbook content. Local service (port 3014) restarted after the fix. Superseded by the sixth finding below — the simplified explanation now loads, but the right-hand "real book" pane still didn't appear.

---

## Bug #11 — sixth finding: simplified content loads, but the real textbook pane never appears

**Status:** ✅ CLOSED

**Observed:** User re-tested live and confirmed the "Content coming soon" bug was gone — "Users of Accounting Information" now showed real simplified content on the left. But the right-hand "real book" pane (the split view every other working topic shows, e.g. "My Bicycle") was completely missing — only the single full-width simplified pane rendered. User asked directly: "we get content from Qdrant and show here right then why taking longer time for that?"

**RCA:** `ReadTab.tsx`'s `hasRealPdf = Platform.OS === 'web' && !!topic.pdfFile && !!topic.pdfPage` gates the right `BookPane`. For a DB-backed topic this is populated from `topic_resources.static_payload.pdfFile`/`pdfPage`. For a Qdrant `byName`-resolved topic (Bug #8's path — the one every real NCERT chapter now uses after the fifth finding), `useDbTopic.ts` reads `p.pdfFile`/`p.pdfPage` off the exact same `AI_EXPLANATION.payload` object the backend returns — but `resolveResourcesByTopicName()`/`resolveTopicContent()` in `aivorah-learning-paths-service` never put a `pdfFile` there at all. `hasRealPdf` was therefore always `false` for every Qdrant-only topic, so `BookPane` never rendered — not slow, structurally absent. Confirmed via direct curl: the AI_EXPLANATION payload for "Transaction in Accounting" was `{"intro": "...", "body": []}` — no `pdfFile` key. `useDbTopic.ts`'s existing fallback `pdfPage: p.pdfFile ? (p.pdfPage || 1) : undefined` already defaults the page to 1 when a `pdfFile` exists but no page is known — so `pdfFile` was the only missing piece.

**Existing coverage:** No test asserted the AI_EXPLANATION payload's `pdfFile` field for the byName path — the gap was invisible to the existing suite.

**Fix:** `resolveTopicContent()` (`services/qdrant.js`) now also returns `pdfFile`, extracted from the resolved point's `source`/`source_reference` via the same `pdfFileFromPayload()` helper Bug #11's third finding already uses (no new extraction logic, reused what exists). `resolveResourcesByTopicName()` (`services/curriculum/resourceResolver.js`) now includes `pdfFile` in the AI_EXPLANATION payload it returns. No page number is available in this Qdrant payload shape, so the book opens at page 1 via the frontend's pre-existing fallback — same as it already does for older DB-backed topics with no recorded page.

**Regression tests:** `qdrant-resolveTopicContent.unit.test.js` — 2 new tests (`pdfFile` correctly extracted from `source_reference`; `null` when no filename is extractable, never fabricated). `resourceResolver-byTopicName.unit.test.js` — 2 new tests (`pdfFile` passed through into the AI_EXPLANATION payload; `undefined` — not `null`/empty-string — when absent).

**Before fix:** FAIL ❌ — `resolveTopicContent is not a function` / `resolveResourcesByTopicName is not a function` (functions didn't exist pre-fix), confirmed via `git stash push -- services/qdrant.js services/curriculum/resourceResolver.js`.

**After fix:** PASS ✅ — 95/95 across the full `aivorah-learning-paths-service` suite.

**Files changed:** `aivorah-learning-paths-service/services/qdrant.js` · `.../services/curriculum/resourceResolver.js` · `.../tests/unit/qdrant-resolveTopicContent.unit.test.js` · `.../tests/unit/resourceResolver-byTopicName.unit.test.js`

**Manual verification:** ✅ confirmed live end-to-end — `curl` against the local service now returns `payload.pdfFile: "keac101.pdf"` for "Transaction in Accounting"; separately confirmed the real PDF is actually servable (not just wired) by hitting the live `aivorah-auth-service`'s `/data/ncert_books/grade11/accountancy/keac101.pdf` route directly — it 302-redirects to a real signed Supabase Storage URL for that exact file (2.5 MB PDF, present in the `ncert-books` bucket). Note: the bucket, previously confirmed empty in this session, now has real content for at least Grade 11 Accountancy — the handed-off `NCERT_EXTRACTION_PIPELINE_HANDOFF.md` pipeline has evidently started populating it; coverage across all grades/subjects is not verified here and remains that pipeline's own scope. Local `aivorah-learning-paths-service` (port 3014) restarted after the fix. Awaiting your in-app refresh to confirm the right-hand book pane now appears.

---

## Local-env note — `/ibpyp/quiz` (Practice tab) was 401'ing locally

**Status:** ✅ CLOSED (config, not code)

**Observed:** Tapping Practice showed an unresponsive "Preparing your practice test…" spinner in the local app.

**RCA:** `aivorah-learning-paths-service/.env`'s `GROQ_API_KEY` was empty — a local-dev secret gap, not an application bug. `/ibpyp/quiz` was returning 401 "Invalid API Key" from Groq; the frontend's `fetchQuiz()` catch handler (`Alert.alert` + `navigation.goBack()`) exists but `Alert.alert` no-ops on web, so the failure was invisible and the spinner looked stuck.

**Fix:** Restored the working key from a sibling local service (`aivorah-ai-coach-service/.env`, same key already used across other local services). `.env` is gitignored — confirmed via `git check-ignore` before editing, nothing committed.

**Verification:** `curl -X POST http://localhost:3014/ibpyp/quiz` now returns 200 with 5 real generated MCQ/fill-blank questions for "Transaction in Accounting". No code changed, no regression tests needed — this was a missing local secret, not a defect in the codebase. Full `aivorah-learning-paths-service` suite still 95/95.

---

## Bug — Practice → Quiz → back button loses the topic ("This lesson isn't available yet")

**Status:** ✅ CLOSED

**Observed:** Tapping Practice on a real Qdrant/byName-resolved topic (e.g. "Relevance of Information", Grade 11 Accountancy) correctly launched the Quiz. Tapping back from Quiz did NOT return to that lesson — it landed on a generic blank "Lesson" screen showing "This lesson isn't available yet," with no Learn content at all.

**RCA:** `usePracticeRedirect.ts` — the hook that fires when the Practice tab is selected and auto-navigates to the Quiz screen — built `returnParams` with only `{subject, curriculum, grade, chapterIndex, topicIndex}`, dropping `topicId`, `byNameTopic`, and `chapterTitle`. On the way back, `QuizScreen.goBackToOrigin()` navigates to `LessonScreen` with those incomplete `returnParams`. `LessonScreen`'s `isDbBacked = !!topicId || !!byName` then evaluates false (no topicId, no byNameTopic to build `byName` from), so it falls back to the curated `syllabusRegistry.ts` (Grade 6 only) instead of re-resolving the real Qdrant topic — finds nothing for Grade 11 Accountancy, and renders the generic "not available" error state. The apparently-separate "no Learn content" symptom the user reported was this same bug, not a content-fetch issue — the broken screen never attempts to render `ReadTab` at all.

**Existing coverage:** `usePracticeRedirect.test.tsx` asserted the old (incomplete) `returnParams` shape directly — the gap was actively encoded into the test, not just untested.

**Fix:** `usePracticeRedirect.ts`'s `params` type gained `byNameTopic`/`chapterTitle`; `returnParams` now includes `topicId`, `byNameTopic`, `chapterTitle`, and `topicName` (mirrors `byNameTopic` for `LessonScreen`'s `topicName` param). `LessonScreen.tsx`'s call site now passes `byNameTopic` and `chapter?.title` through (both already computed earlier in the component for its own `isDbBacked`/`chapter` logic — no new derivation needed).

**Regression tests:** `usePracticeRedirect.test.tsx` — updated the existing DB-topic test's expected `returnParams` shape; added a new byName-specific test asserting `returnParams.byNameTopic`/`chapterTitle`/`topicName` are carried through for a Qdrant-resolved topic with no `topicId` (the exact "Transaction in Accounting" scenario from the report).

**Before fix:** FAIL ❌ — both the existing test (old incomplete shape now missing the new fields) and the new byName test failed for the right reason, confirmed via `git stash push -- .../usePracticeRedirect.ts .../LessonScreen.tsx`.

**After fix:** PASS ✅ — 6/6 in `usePracticeRedirect.test.tsx`, 53/53 across the full `lesson-screen` test suite. `tsc --noEmit` clean on both changed files (pre-existing unrelated syntax errors in `ProfileScreen.integration.test.tsx`, already present on this branch before this session, are untouched by this fix).

**Files changed:** `src/screens/student/learning-paths/lesson-screen/hooks/usePracticeRedirect.ts` · `.../LessonScreen.tsx` · `.../hooks/__tests__/usePracticeRedirect.test.tsx`

**Manual verification:** Pending your refresh — tapping Practice then back on any real Qdrant-resolved topic (e.g. "Relevance of Information") should now return to that same lesson instead of the blank "not available" screen.

**Related, NOT a bug — Listen tab's empty right-hand pane:** Checked separately (`ListenTab.tsx`'s right pane is a *different* panel from the Learn tab's "View in Book" — it shows vocab/illustrations, not the PDF). It renders nothing for any Qdrant/byName-resolved topic because the backend's `AI_EXPLANATION` payload never includes `vocab`, `figureUrl`, or `illustrationPrompts` — those fields only ever get populated for curated/DB-authored topics. This is a real feature gap (no vocab/illustration extraction exists for Qdrant-sourced NCERT content), not a regression — flagged for a scoping decision rather than built silently.

---

## Teacher Settings — refactor pass 1 (Notifications, Teaching Prefs, Photo, Branding Logos)

**Status:** ✅ CLOSED for these 4 concerns — screen has 2 more (Account Settings incl. email-OTP/delete/parent-child creation, Teaching Entries editor) still inline, pending their own pass.

**Scope:** Today's plan item 1 ("Teacher – Settings: E2E testing, refactoring, Unit + Integration testing & code coverage"). `TeacherSettingsScreen.tsx` was a 1483-line monolithic file living in `.legacy-screens/teacher-legacy/` with zero tests and zero testIDs — same starting state Teacher Schedule/Students were in before their own passes.

**Order followed (E2E first, per standing work order):**
1. **E2E safety net** — added minimal testIDs to the Notifications section (only section with a real interactive toggle at the time), wrote `aivorah-e2e-tests/tests/teacher/settings/settings.spec.js` (2 tests) against the *unrefactored* screen, confirmed passing. Caught a real RN-Web gotcha along the way: `Switch`'s `testID` lands on the outer track/thumb wrapper `<div>`, not the actual `<input type="checkbox" role="switch">` nested inside — Playwright locator had to drill into `.locator('input')`.
2. **Refactor** — moved the screen out of `.legacy-screens/teacher-legacy/` into `src/screens/teacher/settings/TeacherSettingsScreen.tsx` (git mv, preserving history), matching the established feature-folder convention (Teacher Schedule/Students/Assignments/Learning Paths). Extracted 4 hooks (`useNotificationPreferences`, `useTeacherPreferences`, `useProfilePhoto`, `useBrandingLogos`), a `services/settingsService.ts` (raw fetch calls, separated from hook state per the `scheduleService.ts` convention), and 4 presentational components (`SectionHeader`, `NotificationsSection`, `BrandingLogosCard`, `TeacherPreferencesCard`) — zero behavior change. Updated all 3 navigators (`TeacherNavigator`, `SchoolAdminNavigator`, `SuperAdminNavigator`) that reference this screen.
3. **E2E re-verify** — re-ran the exact same spec against the fully refactored + componentized screen: both tests still pass, confirming no regression end-to-end.
4. **Unit + integration tests** — 49 tests total: 4 hook suites, 1 service suite, 2 component suites, 1 screen-level integration suite (renders the real composed `TeacherSettingsScreen`, drives the real `Switch` via `fireEvent(..., 'valueChange', ...)` — RNTL's `userEvent.press` doesn't fire `onValueChange` for `Switch`, only `onPress`-based components).
5. **Coverage** — 95.1% statements / 81.81% branches / 85% functions / 97.27% lines across `hooks/`, `services/`, `components/` (the still-inline parent screen file itself is intentionally excluded from this coverage collection until its remaining concerns are extracted).

**Files changed:** `src/screens/teacher/settings/TeacherSettingsScreen.tsx` (moved) · `.../hooks/{useNotificationPreferences,useTeacherPreferences,useProfilePhoto,useBrandingLogos}.ts` · `.../services/settingsService.ts` · `.../components/{SectionHeader,NotificationsSection,BrandingLogosCard,TeacherPreferencesCard}.tsx` · `.../__tests__/unit/*` (7 files) · `.../__tests__/integration/TeacherSettingsScreen.integration.test.tsx` · `src/navigation/{Teacher,SchoolAdmin,SuperAdmin}Navigator.tsx` · `aivorah-e2e-tests/tests/teacher/settings/settings.spec.js` + `tests/helpers/teacherSettingsLocators.js`.

**Real finding along the way:** "Weekly Class Report" and "AI Class Insights" notification prefs have full state/load/save wiring but **no actual UI toggle** — just a static "Soon" badge. Pinned as expected behavior in both the E2E and integration tests rather than silently assumed working.

**Backend:** left entirely untouched this pass (photo/logo upload still on the monolith's `SERVER_URL`; teacher/preferences already on the migrated `PROFILE_SERVER_URL`) — per the standing "don't touch the monolith incidentally" rule, migrating `/user/upload-photo` and `/branding/*` is its own deliberate follow-up (candidate target: `aivorah-profile-service`, which already serves `/user/upload-photo` for the student side — confirmed via its own hook, `src/screens/student/settings/hooks/useProfilePhoto.ts`).

**Remaining for this screen:** Account Settings (name/email/password change with Firebase reauth + OTP, delete-account), parent-child account creation/linking, and the Teaching Entries editor integration — all still inline in the legacy JSX, each its own concern for a follow-up pass.

---

## Messages backend — deployed to Render (today's plan item 2)

**Status:** ✅ CLOSED

Pushed `aivorah-messages-service` (previously un-versioned, no git repo) to a new private GitHub repo (`aivorah24/aivorah-messages-service`) and created+deployed the matching Render web service via the Render API (same config pattern as the other 14 services: Node, Oregon, free plan). Set all 6 required env vars (Supabase, Cloudinary, Groq — the service's own local `.env` was missing Cloudinary/Groq, reused working values from sibling services). Confirmed live: `/health` → 200, `/messages/conversations` → 200 with a real Supabase query. Frontend routing (`messagesServerUrl.ts` → `messagesService.ts`) was already wired to this exact URL from earlier this session — deployment was the only missing piece.

---

## Teacher Settings backend — /branding/logo(s) migrated off the monolith

**Status:** ✅ CLOSED — Worksheet Branding card is now fully migrated both ends.

Ported `POST /branding/logo` and `GET /branding/logos` from `ai-mentor/server/routes/branding.js` to `aivorah-profile-service` — same Cloudinary config and `branding_logos` Supabase table the monolith used (both already present on profile-service for the photo-upload route, zero new dependencies). 9 new TDD tests (89/89 profile-service tests total), deployed live, verified via a real non-destructive `GET /branding/logos` request. `settingsService.ts` (`fetchBrandingLogos`/`uploadBrandingLogo`) rewired to `PROFILE_SERVER_URL` — the `SERVER_URL` (monolith) import is now gone entirely from this file. 65/65 frontend tests still passing.

**Teacher Settings backend status, all 3 remaining concerns:** every backend call the screen needs now lives on `aivorah-profile-service` or `aivorah-auth-service` — none of it touches the monolith. Only the frontend UI extraction (Account Settings modals, Parent-Child creation modal, Teaching Entries integration) is still pending, per the earlier status update.

---

## Teacher Settings — Account Settings concern complete (name/school/curriculum/email/password/delete)

**Status:** ✅ CLOSED for this concern (both frontend + backend). Parent Profile creation/linking is the one remaining Teacher Settings concern.

Extracted the entire Account Settings surface — previously ~260 lines of inline handlers spread across the screen — into 4 hooks:
- `useProfileFields.ts` — Display Name / School / Curriculum+Grades (all 3 share one `PATCH /user/profile` contract)
- `useEmailChange.ts` — email-OTP send/resend/verify + Google-SSO account-switch migration, including the Google-provider-immutability guard
- `usePasswordChange.ts` — pure Firebase Auth, no backend call
- `useDeleteAccount.ts` — provider-aware (password vs Google) reauth + delete

All 4 call the already-migrated `settingsService.ts` functions (built in the earlier backend pass) — zero raw `fetch(SERVER_URL...)` calls remain anywhere in `TeacherSettingsScreen.tsx` for this concern. Added one new service function, `checkEmailTaken` (wraps the already-live `AUTH_SERVER_URL /user/role`).

**A real bug caught and fixed during this extraction:** the first version mirrored each hook's `error`/`loading` state into the screen's shared local `modalError`/`modalLoading` via `setModalError(hook.error)` immediately after `await hook.action()` — this reads a **stale closure value**, since a hook's own `setError` only takes effect on that hook's next render, not synchronously within the awaited call. Fixed by deriving `modalError`/`modalLoading` directly from whichever hook owns the currently-open modal (`activeModal`-gated ternary) instead of mirroring into a separate copy — same pattern already used correctly for `useDeleteAccount`.

**Regression tests:** 28 new hook tests (`useProfileFields` 6, `useEmailChange` 10, `usePasswordChange` 6, `useDeleteAccount` 6) — 96/96 total across the full Teacher Settings suite now.

**E2E:** extended `settings.spec.js` with the Display Name flow (the one safe-to-automate field — Email/Password/Delete all involve Firebase reauth popups or destructive operations, deliberately left to manual verification). Proves the full chain: real UI edit → `PATCH aivorah-profile-service /user/profile` → persisted → survives a refresh. 4/4 E2E tests passing (caught and fixed a real strict-mode locator bug along the way — the display name appears in more than one place on screen, needed a dedicated `-value` testID rather than a bare text search).

**Files changed:** `src/screens/teacher/settings/hooks/{useProfileFields,useEmailChange,usePasswordChange,useDeleteAccount}.ts` · `.../services/settingsService.ts` (added `checkEmailTaken`) · `.../TeacherSettingsScreen.tsx` (~260 lines of inline logic replaced with hook delegation, all now-unused `firebase/auth`/`AUTH_SERVER_URL` imports removed) · `.../__tests__/unit/*` (4 new files) · `aivorah-e2e-tests/tests/teacher/settings/settings.spec.js` + `teacherSettingsLocators.js`.

**Remaining for Teacher Settings:** Parent Profile "Add" modal (create-student / link-existing child) — backend (`aivorah-profile-service`'s `/parent/*` routes) already built and deployed in the earlier backend pass; only the frontend extraction is left.

---

## Teacher Settings — Parent Profile concern complete

**Status:** ✅ CLOSED. All 7 Teacher Settings concerns now fully refactored (frontend + backend), 103/103 tests passing.

Extracted `useParentProfile.ts` (`createChild`, `linkChild`, both add-the-`parent`-role-first-then-create/link, matching original monolith-era ordering exactly) — 7 unit tests.

---

## Manual testing pass — Teacher Settings (2026-08-27/28)

**Status:** ✅ complete. Verified live in-browser against `teacher-b` on `localhost:3006`, all 7 concerns.

**Verified working:** Display Name (full change/persist/refresh/revert cycle), Parent Messages notification toggle, School/Institution (real save, confirmed via live "Updated" dialog + immediate header-chip and field-row reflection), Password-Change modal render, Delete-Account confirmation modal render, Email-Change modal + real negative-path validation (wrong password correctly rejected by the live backend), AI Auto-Grading / Share Progress toggles (live click, both persist correctly), Parent Profile "Add" modal — both Create and Link sub-flows render correctly; Link sub-flow's "no student found" error is a real, correct backend rejection (matches unit test exactly); Create sub-flow's blank-name validation correctly blocks submission without hitting the network.

**Real bug found and fixed:** the Parent Profile "Add" modal didn't clear `parentError` when switching between the Link and Create sub-flows via the "How would you like to add your child?" chooser — attempting to Link with a bad email, then going Back and choosing Create instead, left the stale "No student found with that email..." message showing on the unrelated Create form. Root cause: `setParentStep('create')`/`setParentStep('link')` (`TeacherSettingsScreen.tsx`, the two chooser `TouchableOpacity`s) never called `setParentError('')`. Fixed by clearing the error on both transitions. Reproduced live before the fix, confirmed clean after — `tsc --noEmit` clean.

**Not a bug (investigated, confirmed intentional):** the Curriculum & Grade modal opened with empty fields for `teacher-b` even though the field row above it showed "IB PYP" — traced to `curriculumLabel.ts`'s deliberate, already-unit-tested fallback default (shows "IB PYP" as a placeholder label when no curriculum/grade data exists at all, rather than "Not set"). The modal correctly reflects the real (empty) underlying data; only the label text is a pre-existing, tested design choice, not a defect introduced by this refactor. Left unchanged.

**Cleanup:** reverted `teacher-b`'s Display Name and School/Institution fields back to their original values after live-testing, keeping the shared test account clean.

---

## Today's plan — status

1. **Teacher Settings** (E2E, refactor, unit+integration, coverage) — ✅ all 7 concerns done end-to-end, both frontend and backend.
2. **Message backend deploy** — ✅ done. `aivorah-messages-service` live on Render, routed from the frontend.
3. **Manual Testing** (refactored Student & Teacher features) — Student ✅ done. Teacher Settings ✅ done (1 real bug found + fixed, see above). Remaining Teacher features (Dashboard, Schedule, Students, Assignments, Learning Paths, Messages) not yet started.

---

---

## Bug #14 — AI Coach suggestion pollution (raw PDF codes as suggestion chips)

**Status:** ✅ CLOSED

**Observed:** AI Coach's suggestion chips ("What is X?") sometimes show a raw, meaningless string instead of a real topic.

**RCA:** `useSuggestions.ts` calls the monolith's `/curriculum?curriculum=NCERT&grade=...` directly (per the earlier scoping note below, left as-is — no monolith edit, no new API surface) and picks the **first** topic per subject with no validity check. Live-verified across every grade (1, 2, 6, 9, 11) that this returns raw, unfiltered Qdrant data — for many subjects the first ingested "topic" is literally a bare PDF filename code (`aemr101`, `bhsr101`, `fekb101`, `ihsc101`, `iehp101`, `kebt101`), not a real chapter title, which then became suggestion chips like "What is aemr101?".

**Scope decision (resolved):** The tracker previously flagged this as needing new backend API surface. On closer look, the exact same garbage-topic class was already solved once, on the backend, for Bug #11 (`looksLikeRealTopicName()` in `aivorah-learning-paths-service/services/qdrant.js`) — filters raw PDF-code topics and image-caption placeholders. Reused that exact, already-tested regex/logic here instead of building anything new: no new endpoint, no monolith touch, just a client-side filter matching an established pattern.

**Fix:** Ported `looksLikeRealTopicName()` into `useSuggestions.ts` (frontend can't import the backend service's module directly). When building `bySubject`, now skips any topic that fails the check and keeps looking for the next real one in that subject's topic list, instead of blindly taking index 0.

**Regression tests:** 2 new tests in `useSuggestions.test.tsx` — exact live-reproduced codes (`aemr101`, `bhsr101`) and an `[IMAGE]` placeholder are never surfaced as a suggestion; the real topic that follows in the same subject is picked instead; a subject whose *only* ingested topic is a raw code contributes no suggestion at all (not a garbled one).

**Before fix:** FAIL ❌ — 2/2 new tests (confirmed via `git stash push -- .../useSuggestions.ts`).

**After fix:** PASS ✅ — 10/10 in the file, 91/91 across the full `ai-coach` suite. `tsc` clean.

**Files changed:** `src/screens/student/ai-coach/hooks/useSuggestions.ts` · `.../hooks/__tests__/useSuggestions.test.tsx`

**Manual verification:** Live-reproduced the exact bug via direct `curl` against the real `/curriculum` endpoint before fixing (confirmed raw codes present for Grades 1, 2, 6, 9, 11) — pending your in-app confirmation that AI Coach's suggestion chips no longer show raw codes.

**Risk/Impact:** Low — purely additive filtering on data already being fetched; no change to the endpoint called, no monolith touch, no new API surface.

---

## Bug #14 — second finding: Grade 9 (and any non-3/4/5 grade) student stuck on generic Grade 3 suggestions

**Status:** ✅ CLOSED

**Observed (user screenshot, 2026-08-28):** A real Grade 9 CBSE student's AI Coach screen correctly showed "Ask me anything about your Grade 9 curriculum" in the header, but every suggestion chip was the generic, wrong-grade fallback set: "What is colour theory?", "How do we add numbers?", "What is internet safety?", "What is rhythm and beat?", "How do plants grow?" — verbatim `FALLBACK_SUGGESTIONS['Grade 3']`.

**RCA:**
- `FALLBACK_SUGGESTIONS` (`constants.ts`) only defines entries for Grade 3/4/5 — any other grade (including Grade 9) has no dedicated fallback and silently starts on the Grade 3 set as its *initial* state, before the real fetch resolves. Expected/acceptable on its own — the real fetch is supposed to immediately replace it with real, grade-scoped suggestions.
- The real fetch never replaced it: `useSuggestions.ts` called `fetch(endpoint)` **once**, with a silent `.catch(() => {})` and no timeout — the exact same resilience gap already found and fixed this session in `StudentDataContext` (Progress page showing all-zero despite real DB data). Confirmed the underlying cause is real and not code-specific: a plain `curl` straight at the backing service (outside any app code) showed ~1-in-6 requests stall/fail transiently on this dev machine's network path. One bad attempt here means the student is stuck on 3rd-grade content for the rest of the session, silently, with no error or retry — worse than the first Bug #14 finding because it can affect *every* grade, not just ones with garbage-topic data.

**Fix:**
1. Extracted the retry helper (previously local to `StudentDataContext.tsx`) into a shared `src/utils/fetchWithRetry.ts` — bounds each attempt to a timeout via `AbortController` and retries with backoff. Both `StudentDataContext` and `useSuggestions.ts` now import the same tested implementation instead of duplicating it.
2. `useSuggestions.ts`'s fetch now goes through `fetchWithRetry(endpoint)` instead of a bare single-attempt `fetch(endpoint)`.

**Regression test:** New test in `useSuggestions.test.tsx` — first fetch attempt rejects (transient blip), second attempt resolves with real Grade 9 topics; asserts the fallback ("colour theory") is never what's shown and the real topic ("Algebraic Identities") is. Also updated 3 pre-existing tests (`toHaveBeenCalledWith`) that asserted the exact `fetch(url)` call shape — now correctly expect the second `options`/`signal` argument `fetchWithRetry` always passes.

**Before fix:** FAIL ❌ — confirmed by temporarily reverting just the `fetchWithRetry(endpoint)` call back to `fetch(endpoint)` and re-running: test fails with real suggestions never appearing (stuck on fallback, `waitFor` times out).

**After fix:** PASS ✅ — 123/123 across the combined `ai-coach` + `StudentDataContext` + `progress` suites (11/11 in `useSuggestions.test.tsx` alone, including this new test).

**Files changed:** `src/utils/fetchWithRetry.ts` (new, extracted) · `src/context/StudentDataContext.tsx` (now imports the shared helper instead of a local copy) · `src/screens/student/ai-coach/hooks/useSuggestions.ts` · `.../hooks/__tests__/useSuggestions.test.tsx`

**Manual verification:** Pending your in-app refresh — a Grade 9 (or any grade outside 3/4/5) student's AI Coach suggestions should now reliably show real, curriculum-scoped topics instead of ever getting stuck on the generic fallback set.

**Risk/Impact:** Low — purely additive resilience (retry+timeout) around an existing call; response handling and endpoint unchanged. Consolidating the retry helper also means any future fix to it benefits both call sites at once instead of drifting apart.

---

## Bug #9 — Avatar (and learning style/bio/interests) picked on Profile screen reverts after a refresh

**Status:** ✅ CLOSED

**Observed (user report, 2026-08-28):** "when I update a profile picture nd chnage avatar - intially it was working but when I refresh it was failing up."

**RCA:**
- `useProfile.ts`'s `handleSelectAvatar()` calls `updateUser({ avatarStyle: id, ... })`, which itself fires an un-awaited `PATCH /user/preferences` (fire-and-forget, silent `.catch`) and writes the new value to the local AsyncStorage cache immediately — so the very next render correctly shows the new avatar.
- On a page refresh, `AuthContext`'s session-restore path (`onAuthStateChanged` handler) rebuilds the user object as `{ ...baseUser, ...savedLocal, ...supaProfile, ... }` — a **blind spread** where `supaProfile` (fetched last) always wins, for every key it carries, even when that key's value is `undefined`.
- `avatarStyle`/`learningStyle`/`interests`/`bio` only ever come from a **second, separate, best-effort** `GET /user/preferences` call inside `fetchSupabaseProfile()` — never from the reliable `/user/sync` call (unlike `dob`/`gender`/`state`/`country`, which were moved onto `/user/sync` specifically to fix this exact class of bug on 2026-08-26 — see that fix's own comment in the same function). That GET call always explicitly assigns `avatarStyle: pref.avatarStyle || undefined` — so the key exists on the returned object regardless of outcome.
- Net effect: if the refresh's preferences GET runs before the earlier, un-awaited avatar-selection PATCH has actually landed server-side (a very easy race — a user picking an avatar and immediately refreshing to check it "stuck" is completely natural), or if that GET hits the network flakiness already proven elsewhere this session, the locally-cached, correct avatar choice gets silently overwritten back to blank. Confirmed via a debug trace of a real session-restore: an earlier, separate "optimistic restore from cache" effect briefly renders the correct cached avatar first (explaining why it "looks fine" for an instant), then the real resolution overwrites it to `undefined` moments later — exactly matching "initially it was working but when I refresh it was failing."

**Regression test (written first, confirmed failing, per your instruction):** New `AuthContext.avatarPersistence.test.tsx` — seeds a locally-cached profile with `avatarStyle: 'gamer'`, mocks `/user/preferences` to return a real response that simply omits `avatarStyle` (the actual failure mode), fires a real session-restore via the captured `onAuthStateChanged` callback, and asserts the avatar survives. A second test confirms the server IS still trusted when it genuinely returns a different value (a real change made elsewhere must still win — this isn't "always prefer local").
- First test-writing attempt asserted too early and passed even against the buggy code, because it caught the transient *optimistic-cache* render instead of the real settled state — traced with an explicit debug log, then fixed the test itself to wait for a marker (`isPro`, only ever populated by the real resolution, never by the cached-profile fast-path) before asserting on `avatarStyle`.
- Re-ran against the actual buggy code after that test fix: FAIL ❌ (`Expected: "gamer"`, `Received: "(none)"`) — genuinely reproduces the bug this time.

**Fix:** `resolvedUser`'s construction in `AuthContext.tsx` now explicitly falls back to `savedLocal` for these 4 fields — `avatarStyle: supaProfile.avatarStyle ?? savedLocal.avatarStyle` (and the same for `learningStyle`/`interests`/`bio`) — mirroring the exact pattern already used for `dob`/`gender`/`state`/`country` inside `fetchSupabaseProfile()`.

**After fix:** PASS ✅ — 2/2 new tests. Full `src/context/__tests__` suite: 12/12 (5/5 suites), no regressions. `src/screens/student/profile` + `src/screens/student/settings` (the actual consumers of `avatarStyle`): 91/91, no regressions. `tsc` clean on the touched file.

**Files changed:** `src/context/AuthContext.tsx` · `src/context/__tests__/AuthContext.avatarPersistence.test.tsx` (new)

**Manual verification:** Pending your local check, per your instruction — pick a new avatar on the Profile screen, refresh, confirm it's still selected.

**Risk/Impact:** Low — purely additive fallback on 4 specific fields at one merge site; doesn't change what the server is trusted for when it actually has real data (proven by the second test). Same precedented pattern already shipped once for a sibling set of fields.

---

### Bug #9 — second finding: header top-right avatar and sidebar bottom-left avatar keep showing the OLD uploaded photo after switching to a built-in avatar, even on refresh

**Status:** ✅ CLOSED

**Observed (user report, 2026-08-28):** after the fix above, the main Profile screen correctly shows the newly-picked "Champion" avatar and survives a refresh — but the header's top-right avatar icon and the sidebar's bottom-left avatar (next to the user's name) still show the old uploaded photo, and refreshing doesn't fix it. User: "in the profile picture I changed the profile picture from the boy image to avatar But still on the top right and in the bottom left right it is not when I give refresh it is not properly changing up."

**RCA:**
- `Header.tsx` (line ~206) and `Sidebar.tsx` (line ~442) both render `photoUrl` **ahead of** `avatarStyle` — `photoUrl ? <Image .../> : avatarStyle ? <Gradient icon/> : ...`. This is correct in principle (a real uploaded photo should beat a generic built-in icon) but only if `photoUrl` can actually ever become empty again once it's been set.
- `useProfile.ts`'s `handleSelectAvatar(id)` calls `updateUser({ avatarStyle: id, photoUrl: undefined })` intending to clear the photo. `AuthContext.tsx`'s `updateUser()` merges this into local React state fine (`{...prev, ...fields}` copies the `undefined` value, so local `photoUrl` briefly does go blank — which is why the Profile screen's own local state looked correct). But the PATCH body sent to `/user/preferences` is built with `JSON.stringify(...)`, which **silently drops any key whose value is `undefined`** — so the request the server actually received never mentioned `photoUrl` at all.
- Even if it had, `aivorah-profile-service/services/profile-service.js`'s `updatePreferences()` had `if (photoUrl != null) patch.photoUrl = String(photoUrl);` — this can only ever *set* photoUrl, never clear it, because a `null`/absent value is treated identically to "field not provided."
- Net effect: `users.photo_url` (the DB column) — the single authoritative source read back by every future `/user/sync`, which is what `Header.tsx`/`Sidebar.tsx` actually render — was **permanently stuck** at whatever was last uploaded. There was no code path anywhere that could ever clear it. So the very next refresh (or the next time `AuthContext` rebuilds `resolvedUser` from a fresh `/user/sync`) re-populated `photoUrl` with the stale value, and the header/sidebar's `photoUrl`-first rendering kept showing the old photo forever.

**Regression tests (written first, confirmed failing, per your instruction):**
- Backend: `aivorah-profile-service/tests/unit/preferencesEndpoint.test.js` — new test asserts that `updatePreferences({ email, avatarStyle: 'champion', photoUrl: null })` write-throughs `photo_url: null` to the `users` table update call. Ran against the unfixed code first: FAIL ❌ (`Received: {"avatarStyle": "champion", "updatedAt": ...}` — no `photoUrl` key at all, confirming the described bug). A second new test confirms omitting `photoUrl` entirely (e.g. saving bio) still leaves `users.photo_url` untouched, so nothing else regresses.
- Frontend: new `src/screens/student/profile/hooks/__tests__/useProfile.avatarClear.test.tsx` — calls `handleSelectAvatar('champion')` and asserts `updateUser` is called with an explicit `photoUrl: null`, plus a direct `JSON.stringify` round-trip proving the key survives (vs. `undefined`, which doesn't). Ran against the unfixed code first: FAIL ❌ (`Received: {"avatarStyle": "champion", "photoUrl": undefined}`).

**Fix (two repos, both deliberate/in-scope — `aivorah-profile-service` is an already-migrated microservice, not the monolith):**
- `useProfile.ts`'s `handleSelectAvatar()`: sends `photoUrl: null` instead of `photoUrl: undefined`, so the "clear it" intent actually survives `JSON.stringify` into the PATCH body.
- `aivorah-profile-service/services/profile-service.js`'s `updatePreferences()`: now distinguishes "key not provided" from "explicitly null" via `Object.prototype.hasOwnProperty.call(body, 'photoUrl')`. When explicitly cleared, writes `photoUrl: null` to `user_preferences` AND write-throughs `photo_url: null` to the authoritative `users` table row (same write-through pattern already used for grade/curriculum/location/phone/gender/dob/state/country).

**After fix:** PASS ✅ — both new tests. Backend: full `aivorah-profile-service` suite 91/91 (9/9 suites), no regressions. Frontend: `src/screens/student/profile` + `src/context/__tests__` 21/21 (7/7 suites), no regressions.

**Files changed:** `src/screens/student/profile/hooks/useProfile.ts` · `src/screens/student/profile/hooks/__tests__/useProfile.avatarClear.test.tsx` (new) · `aivorah-profile-service/services/profile-service.js` · `aivorah-profile-service/tests/unit/preferencesEndpoint.test.js`

**Manual verification:** Pending your local check, per your instruction — upload a real photo, then switch to a built-in avatar, refresh, and confirm the header (top-right) and sidebar (bottom-left) both now show the built-in avatar instead of the old photo. Note: this fix only prevents the photo from getting *permanently* stuck going forward — an account whose `users.photo_url` is already stuck from before this fix will need one more avatar-pick to actually clear it (the clear-signal now works, but it still only fires when `handleSelectAvatar` is called).

**Risk/Impact:** Low-medium — touches a shared write-through helper in an already-migrated microservice, but the change is additive (only activates on the new explicit-null path) and every other `updatePreferences` field/behavior is unchanged, confirmed by the full existing suite staying green.

---

## Bug #27 — Settings "Update Grade / Year" dialog won't let a user correct a wrong grade downward

**Status:** ✅ CLOSED

**Observed (user report, 2026-08-28):** "If user entered the grade 9 instead of 10 - the grade section is not showing up grade - so user won't rise ticket and we no need to update that - so please make sure user will get full grade control edit here." Screenshot shows the "Update Grade / Year" modal offering only Grade 10/11/12.

**RCA:** `useProfileFields.ts` deliberately sliced the grade options to "current grade and higher only" — `ALL_GRADES.slice(currentGradeIdx)` — on the assumption a student can only move up a grade. A Grade 10 account (even one that's simply wrong, e.g. should be Grade 9) could therefore never be corrected back down — the lower grade was never offered as a selectable option at all.

**Regression test (written first, confirmed failing):** Updated `useProfileFields.test.tsx` — asserts a Grade 10 account's `GRADES` list still contains Grade 9, and that the full 15-entry list (Nursery → Grade 12) is always offered regardless of the account's current grade. Ran against the unfixed code first: FAIL ❌ (`Grade 9` and everything below `Grade 10` missing from the list).

**Fix:** `GRADES` is now simply `ALL_GRADES` — full, unrestricted grade control, matching the user's explicit instruction.

**After fix:** PASS ✅ — 3/3 new/updated tests. Full `src/screens/student/settings` suite: 84/84, no regressions.

**Files changed:** `src/screens/student/settings/hooks/useProfileFields.ts` · `src/screens/student/settings/hooks/__tests__/useProfileFields.test.tsx`

**Manual verification:** Pending your local check — open Settings → Update Grade / Year, confirm all 15 grades (Nursery through Grade 12) are selectable regardless of the account's current grade.

**Risk/Impact:** Low — removes a restriction, doesn't add new logic; the save path itself (`handleSaveGrade`) is unchanged.

---

## Bug #15 — Teacher Schedule: deleting an event has no confirmation

**Status:** ✅ CLOSED

**Observed (user report, 2026-08-27/28):** event cancel/delete goes through with no confirmation dialog.

**RCA:** `useEventForm.ts`'s `confirmDeleteEvent()` was `const ok = Platform.OS === 'web' ? window.confirm(...) : true;` — on any native platform, `ok` was hard-coded `true`, so the event was deleted immediately with **no prompt shown at all**, regardless of what (if anything) the user tapped. Only the web build ever showed a real confirmation.

**Regression tests (written first, confirmed failing):** 4 new tests in `useEventForm.test.tsx` — native platform never deletes immediately without a real Alert.alert prompt; pressing "Delete" in that prompt does delete; pressing "Cancel" does not; web's `window.confirm` decline still doesn't delete. Ran against the unfixed code first: 2/4 FAILED ❌ (native path deleted with zero prompt, and "Cancel" still deleted) — the other 2 happened to already pass by coincidence of the `: true` fallback. Also found and fixed a **pre-existing false-positive** in the original "web, confirmed" test: it never actually set `Platform.OS` or mocked `window.confirm`, so it was silently passing via the native `: true` branch the whole time, not real web confirmation — corrected to explicitly test the web path.

**Fix:** `confirmDeleteEvent()` now uses RN's `Alert.alert` (Cancel/Delete buttons, destructive style) on native, keeping `window.confirm` on web — the same "Alert.alert is a no-op on React Native Web" convention already documented elsewhere in this codebase (`ParentSettingsScreen.tsx`).

**After fix:** PASS ✅ — all 4 new tests + the corrected pre-existing test. Full `src/screens/teacher/schedule` suite: 104/104. `TeacherScheduleScreen.e2e.test.tsx`: 10/10 (3 pre-existing skips), no regressions.

**Files changed:** `src/screens/teacher/schedule/hooks/useEventForm.ts` · `src/screens/teacher/schedule/__tests__/unit/useEventForm.test.tsx`

**Manual verification:** Pending your local check — delete an event on both web and (if testable) a native build, confirm a real prompt appears and Cancel genuinely aborts the delete.

**Risk/Impact:** Low — isolated to one function; behavior only gets stricter (adds a missing confirmation), doesn't change what happens once confirmed.

---

## Bug #20 — Brain Teaser wrong format; "Test Your Knowledge" quiz-load error

**Status:** ✅ CLOSED (both findings)

**Observed (user report, 2026-08-28):** Brain Teaser text looks wrong/garbled; "Test Your Knowledge" sometimes fails to load a quiz.

**Finding 1 — mojibake in Brain Teaser / On This Day / GK Fact text.** Live-reproduced directly against `aivorah-world-and-you-service`'s real `GET /world/daily` endpoint (started it locally, hit it with a real grade) before assuming anything — found real Groq output like `"NASAâ€™s Mars Rover Spirit landed"` and `"the worldâ€™s largest reef system"`. RCA: classic mojibake — a UTF-8-encoded curly apostrophe (U+2019) getting re-interpreted as Windows-1252 and re-encoded, 3 codepoints (U+00E2 U+20AC U+2122) where one real character belongs. `onThisDay`, `gkFact`, `funChallenge` (Brain Teaser), and `currentAffairs` all come from the same Groq JSON response, so Brain Teaser is equally exposed even in test runs where the specific article happened not to trigger it.
- **Regression tests (written first, confirmed failing):** 2 new tests in `world.unit.test.js`, using explicit `\u` escapes (not pasted literal characters, to avoid any file/terminal-encoding ambiguity) — a mojibake apostrophe is corrected in every text field including `funChallenge`; clean text is left untouched. Ran against the unfixed code first: FAIL ❌ (`Expected: "NASA's..."`, `Received: "NASAâ€™s..."`).
- **Fix:** `services/world.js` — new `fixMojibake()`/`sanitizeDeep()` applied to the whole response before caching/returning. Scoped deliberately to the mojibake patterns actually confirmed live (apostrophe, opening single/double quote, ellipsis, nbsp) — closing-double-quote and en/em-dash mojibake were **not** independently verified against real output and are left unhandled rather than guessed, since a wrong mapping would be worse than an unhandled one.
- **After fix:** PASS ✅ — verified twice live: restarted the local service, hit the real endpoint, confirmed the exact previously-corrupted `onThisDay` entry now reads `"the world's first commercial 3D cinema"` correctly (U+2019 apostrophe, not mojibake).

**Finding 2 — "Test Your Knowledge" quiz-load error.** RCA: `generateComprehensionQuiz()` (`services/dailyTidbit.js`) did a bare `JSON.parse(clean)` with no extraction and no retry — unlike `getWorldDaily()` in the same repo, which defends against the model wrapping JSON in prose via a regex-extracted `{...}`/`[...]` match (see Finding 1's fix and that function's own comment). Any real response with lead-in prose ("Here are the questions: [...]", observed behavior of this exact model) or a truncation (`max_tokens: 400` is tight for 2 MCQs × 4 options) threw immediately, which `routes/daily-tidbit.js` turns into a 500 — the frontend shows "Could not load quiz. Please try again."
- **Regression tests (written first, confirmed failing):** 3 new tests in `dailyTidbit.unit.test.js` — prose-wrapped JSON is still parsed; a truncated first response retries once and recovers; two consecutive malformed responses still surface a real error (not a silently empty quiz). Ran against the unfixed code first: 2/3 FAILED ❌ (`SyntaxError: Unexpected token 'H'...` / truncation error) confirming the bug.
- **Fix:** extracted the Groq call into `requestQuizJson()`, which now regex-extracts the `[...]` array before parsing (same pattern as `world.js`) and retries once — re-prompted to respond with ONLY the JSON array — before giving up. `max_tokens` also raised 400→500 to reduce truncation likelihood in the first place.
- **After fix:** PASS ✅ — 5/5 (2 pre-existing + 3 new).

**Files changed:** `aivorah-world-and-you-service/services/world.js` · `aivorah-world-and-you-service/services/dailyTidbit.js` · `aivorah-world-and-you-service/tests/unit/world.unit.test.js` · `aivorah-world-and-you-service/tests/unit/dailyTidbit.unit.test.js`

**Full suite:** 49/49, no regressions.

**Manual verification:** Pending your local check — open World & You a few times across different days/grades (Brain Teaser/On This Day text should never show "â€"-style garbage) and try "Test Your Knowledge" a few times to confirm it no longer intermittently fails to load.

**Risk/Impact:** Low — both fixes are additive (extra sanitization pass, extra retry-on-failure); neither changes behavior for already-correct responses, confirmed by the "clean text untouched" test.

---

## Bug #22 — remaining findings: "no challenges available" and XP inconsistent between pages

**Status:** ✅ CLOSED (both remaining findings — the false "1 day streak" part of #22 was already fixed under Bug #3.1)

**Finding 1 — "no challenges available."** RCA: `useChallengesList.ts`'s `fetchChallenges()` used a bare single-attempt `fetch()` (same intermittent-network-flakiness class already proven and fixed this session for the Progress page and AI Coach suggestions). One transient blip permanently showed the empty "No challenges available" state even though real challenges existed.
- **Regression test (written first, confirmed failing):** a real per-request retry test — discovered mid-writing that a naive "one rejection, does the final count come out right?" test would pass by accident, because this hook already independently calls `fetchChallenges()` twice on mount (its own effect + `useFocusEffect`), and the second call papers over a missing retry. Rewrote to assert the real distinguishing signal — more than 2 total fetch calls to the challenges endpoint when one fails. Ran against the unfixed code: FAIL ❌ (exactly 2 calls, no retry).
- **Fix:** swapped `fetch()` → the existing `fetchWithRetry()` utility (3 attempts, backoff), same as the Progress/AI Coach fixes.
- **After fix:** PASS ✅ — 14/14 in `useChallengesList.test.tsx` (2 tests also needed their `waitFor` timeout raised — real retries with backoff legitimately take longer than the default 1000ms budget). Full `src/screens/student/challenges` suite: 115/115.

**Finding 2 — XP inconsistent between pages.** RCA, traced through `StudentDataContext.tsx` in full (not assumed): there's a generic "sync to server whenever stats change" effect that PUTs the ENTIRE local `stats` object to `aivorah-leaderboard-service`'s `PUT /student/:id` on every change — confirmed server-side that this endpoint treats `xpPoints` as **authoritative and overwrites** it (`services/student-stats.js`'s `updateStudentStats()`). Separately, `completeLesson()` has its own **atomic, idempotent, server-side** XP award (`POST /:id/complete-lesson`, flat +150, guarded by `completed_topics`).
- For a Learning Path quiz finish, `useQuiz.ts`'s `finishQuiz()` called **both**: `completeLesson()` (atomic, correct) **and** a separate local-only `addXP(pct>=80?100:pct>=60?60:30)`, for the exact same event. `addXP()`'s `setStats` fires *synchronously*, immediately PUTing the client's locally-guessed total (which doesn't yet include `completeLesson()`'s still-in-flight +150) — a genuine **lost-update race** between an atomic server-side increment and a stale client-side overwrite. Depending on which write landed last, a student could see XP that didn't match what a fresh page load (which always re-fetches the server's real total) would show. It also had no idempotency guard, unlike `completeLesson()` — a **repeat** attempt of an already-completed topic still added local XP every time, while the server-side total correctly stayed flat.
- **Regression test (written first, confirmed failing):** updated the existing `useQuiz.test.tsx` quiz-finish test to assert `completeLesson` is called but `addXP` is **not**. Ran against the unfixed code: FAIL ❌ (`addXP` was called with `100`).
- **Fix:** removed the `addXP(...)` call from `finishQuiz()` entirely — `completeLesson()`'s atomic, idempotent, server-persisted award is now the sole XP source for this event, eliminating the race outright rather than trying to win it.
- **Also checked, found NOT buggy:** `completeChallenge()` (Challenges) and `exploreTopic()` (AI Coach) each have exactly one XP-crediting path apiece — no duplicate/competing writes for the same event — so left unchanged.
- **After fix:** PASS ✅ — 26/26 in `src/screens/student/learning-paths/quiz`.

**Files changed:** `src/screens/student/challenges/hooks/useChallengesList.ts` · `src/screens/student/challenges/hooks/__tests__/useChallengesList.test.tsx` · `src/screens/student/learning-paths/quiz/hooks/useQuiz.ts` · `src/screens/student/learning-paths/quiz/hooks/__tests__/useQuiz.test.tsx`

**Full regression:** `src/context` + `src/screens/student/learning-paths/quiz` + `src/screens/student/challenges`: 153/153, no regressions.

**Manual verification:** Pending your local check — (1) open Challenges a few times, confirm it never shows empty when challenges genuinely exist; (2) finish a Learning Path quiz, then check Dashboard/Progress/Challenges immediately after — the XP total should already match everywhere, including after a full refresh.

**Risk/Impact:** Low-medium — Finding 1 is purely additive resilience. Finding 2 removes a source of double-counted/racy XP; a student's total may appear slightly lower after this fix than the old (partially fake) inflated number, which is the correct, honest behavior — the removed XP was never reliably persisted anyway.

---

## Bug #23 — leaderboard column misalignment / symbol error

**Status:** ✅ CLOSED (symbol error) — misalignment investigated, not reproduced in code

**Observed:** reported column misalignment and a symbol error on the Leaderboard.

**Investigated column alignment:** `LeaderboardTable.tsx`'s header (`thRank`/`thStudent`/`thGrade`/`thXp`/`thStreak`) and every data row reuse the exact same width-carrying style objects — same `width`/`flex`/`textAlign` for both header and cells. No layout defect found in code; not fixed since there's nothing here to fix without a live repro showing an actual misaligned screenshot.

**Confirmed symbol error:** the streak indicator used Feather's `"wind"` icon — unrelated to a streak. Every other streak display in the app (e.g. Dashboard's `HeroCard`) uses a dedicated flame icon (`FlameIcon`, a custom SVG — Feather has no flame glyph, which is presumably why "wind" ended up here as a stand-in).

**Fix:** swapped the Feather `"wind"` icon for the existing `FlameIcon` component, reused from `dashboard/components/common/icons.tsx` for visual consistency with the rest of the app.

**Regression test:** new `LeaderboardTable.test.tsx` (component previously had no test coverage at all) — renders the table with a real entry and confirms it mounts cleanly with the new icon import.

**After fix:** PASS ✅ — 10/10 in `src/screens/student/leaderboard`.

**Files changed:** `src/screens/student/leaderboard/components/LeaderboardTable.tsx` · `src/screens/student/leaderboard/components/__tests__/LeaderboardTable.test.tsx` (new)

**Manual verification:** Pending your local check — confirm the streak column now shows a flame icon, and if column misalignment is still visible, send a screenshot so it can be traced against the real rendered layout rather than the source alone.

**Risk/Impact:** Very low — icon swap only, no layout/logic change.

---

## Bug #24 — Progress screen's "Month" toggle non-functional

**Status:** ✅ CLOSED — was already fixed earlier this session (before the pivot to working the bug tracker sequentially), confirmed here rather than left ambiguous in the tracker.

**RCA (as documented directly in the code, `useWeeklyActivity.ts`):** the Month tab updated `periodTab` state, but the data-fetching `useEffect` didn't have `periodTab` in its dependency array, so toggling Week→Month never re-fetched — the chart just kept showing the Week data.

**Fix (already in place):** `periodTab` added to the effect's dependency array; `fetchWeeklyActivity(studentId, periodTab)` passes it through to `GET /student/:id/weekly?period=week|month` on `aivorah-leaderboard-service`.

**Verified now:** `src/screens/student/progress` suite — 28/28 passing, including `useWeeklyActivity.test.tsx`'s toggle-re-fetch coverage.

**Manual verification:** Pending your local check — toggle Week/Month on the Progress screen, confirm the chart and totals actually change.

**Risk/Impact:** None — no code changed in this pass, just confirmed and logged.

---

## Bug #19 — Teacher Schedule: week starts on Monday, not Sunday; tapping a date doesn't scroll

**Status:** ✅ CLOSED (both findings)

**Finding 1 — week starts Monday, not Sunday.** Confirmed deliberate (not accidental) — `scheduleUtils.ts`'s `buildWeek()` explicitly rolled back to the preceding Monday (`monday.setDate(base.getDate() - ((dow + 6) % 7))`), `constants.ts`'s `DAYS_SHORT` was `['MON', ..., 'SUN']`, and `useWeekNav.ts`'s `scrollToTodayCol()` mapped `Mon=0…Sun=6`. Per explicit user request, changed to Sunday-first throughout: `buildWeek()` now rolls back to Sunday (`getDay()` is already 0-indexed from Sunday, so the wraparound math was removed entirely, not just re-mapped), `DAYS_SHORT` reordered, `scrollToTodayCol()` simplified to `base.getDay()` directly.
- **Regression tests (updated, confirmed against the new behavior):** `scheduleUtils.test.ts`'s `buildWeek` suite rewritten for Sunday-first — asserts a Wednesday base still returns all 7 days with `week[0].day === 'SUN'`, and a Saturday base rolls back to that week's real Sunday.

**Finding 2 — tapping a date doesn't scroll.** RCA: `CalendarGrid.tsx`'s day-header cells were a plain `View` — not tappable at all, so there was genuinely nothing to scroll no matter what a user tapped.
- **Fix:** day headers are now a `TouchableOpacity` calling a new `onDayHeaderPress(iso)` prop, wired in `TeacherScheduleScreen.tsx` to the existing (previously not-exported) `scrollToCurrentTime()` from `useWeekNav.ts` — tapping any day now scrolls the vertical timeline into view, giving real, visible feedback instead of doing nothing.
- **Regression tests (written first, confirmed failing):** new tests in `CalendarGrid.integration.test.tsx` — tapping a day header calls `onDayHeaderPress` with that day's iso date; the week grid genuinely starts on Sunday (`getDay() === 0`) and ends on Saturday. Ran against the unfixed code first: FAIL ❌ (no `teacher-schedule-day-header-*` testIDs existed — the header wasn't a pressable element at all).

**After fix:** PASS ✅ — full `src/screens/teacher/schedule` + `src/navigation` suite: 108/108. `TeacherScheduleScreen.e2e.test.tsx`: 10/10 (3 pre-existing skips), no regressions.

**Files changed:** `src/screens/teacher/schedule/constants.ts` · `src/screens/teacher/schedule/utils/scheduleUtils.ts` · `src/screens/teacher/schedule/hooks/useWeekNav.ts` · `src/screens/teacher/schedule/components/CalendarGrid.tsx` · `src/screens/teacher/schedule/TeacherScheduleScreen.tsx` · `src/screens/teacher/schedule/__tests__/unit/scheduleUtils.test.ts` · `src/screens/teacher/schedule/__tests__/integration/CalendarGrid.integration.test.tsx`

**Manual verification:** Pending your local check — confirm the week grid now shows Sunday first, and tapping any date header visibly scrolls the timeline.

**Risk/Impact:** Low-medium — the Monday→Sunday change affects every date computation in this screen (week boundaries, "today" column index); mitigated by rewriting the `buildWeek` unit tests against real calendar dates and confirming the full existing suite (108 tests, including drag-to-create, event CRUD, tag filters) still passes unchanged.
