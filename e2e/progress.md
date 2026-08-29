# E2E Suite Progress

Running log of what's tested and passing, updated after each test run.

## Student

| File | Tests | Status |
|---|---|---|
| b2b-login.spec.js | 3 | passing |
| email-signup.spec.js | 4 | passing |
| age-validation.spec.js | 2 | passing |
| onboarding.spec.js | 9 | 8 passing, 1 known bug (grade/DOB mismatch not validated) — see note below on the account-collision fix |
| dashboard.spec.js | 11 | 10 passing, 1 known bug (subject lists don't match). Display name test is FLAKY — app race, see below |
| dashboard-photo.spec.js | 1 | passing (headed) |
| profile.spec.js | 26 | 25 passing, 1 known app gap (Cambridge missing Grade 11/12 — intentionally red) |
| learning-paths.spec.js | 10 | passing |

## Learning flow — covered in layers, one file per layer
The learning feature is a flow, not a screen, so it's split by step:

| Layer | File | State |
|---|---|---|
| 1. Learning Paths | `learning-paths.spec.js` | **⚠ status uncertain** — claims 10 passing, but relies on `page.getByTestId('subject-card-name')`, which no longer exists anywhere in the app source as of 2026-08-12 (confirmed by repo-wide grep). Either a regression or a branch/build mismatch — needs re-running/checking before trusting this row. |
| 2-4. Subject Syllabus / Lesson / Quiz (combined) | `tests/student/learning-path/learning-path.spec.js` | **written 2026-08-12, NOT YET RUN** (explicit instruction for this task). Covers chapter→topic navigation, reference textbook panel, simplified content, Listen/audio, Ask Aivorah (in-topic + off-topic guardrail), Practice, and progress — one file instead of three, since one lesson screen owns all of these tabs. Uses new dedicated account `student-m` (CBSE/Grade 6 — no other suite account is Grade 6). Several locators (chat send button, all Practice-quiz controls) are unverified against a live DOM (no testIDs exist on any of these screens, and adding them was out of scope for this task) — flagged inline in the spec and owed a first real run before merging. |
| 5. Math engine (different flow) | `math-learning.spec.js` | not started |

Useful facts found while writing Layer 1:
- These screens have real URLs — `page.goto('/learning-paths')` works, and so does
  `page.goBack()`. No need for the two-overlapping-sidebars click trick.
- `/subject-syllabus?subject=…&curriculum=…&grade=…` carries its state in the URL.
- Subjects come from `GET /curriculum/subjects` — loading, empty and error are all
  reachable with `page.route`, no special accounts needed.
- The card's size label is `chapters` (CBSE), `units` (IB PYP) or `topics`
  (fallback), decided per subject — assert the pattern, never a fixed word.
- After navigating, the screen you left stays in the DOM as hidden. `.first()` will
  happily match the old screen — use `.filter({ visible: true })`.
- **`.count()` does not wait.** It reads once and answers straight away. The screen
  title is drawn before the subjects arrive from the server, so counting cards right
  after the title appears can legitimately count zero — and the test then fails or
  passes depending on how quick the server was that run. This passed three runs in a
  row before failing. Wait for `expect(cards.first()).toBeVisible()` first, or use an
  assertion that retries (`toHaveCount`). Same applies to `allTextContents()`.
- A single green run proves nothing for timing bugs — re-run a new spec a few times
  before calling it done.

## Two things to check with the team (not yet asserted anywhere)
Both spotted on student-a (CBSE, Grade 3):
1. The header says **CBSE - Grade 3** but the hero chip right below says **NCERT** —
   two different names for the same curriculum on one screen. Code does this on
   purpose (`isCBSE ? 'CBSE' : curriculum` for the subtitle, raw `curriculum` for
   the chip), so it needs a product decision, not a fix.
2. The English card says **12 chapters**, but opening it shows **11 chapters**
   ("0 of 11 chapters started"). The count comes from a different source on each
   screen. Looks like a real bug — worth confirming before Layer 2 asserts on it.

## Photo upload — how it actually works (learned the hard way)
Expo's image picker builds a hidden `<input type="file">`, asks the browser for a
file, and **deletes the input as soon as it gets an answer**. If no Playwright
listener is attached, Playwright answers "no file" immediately, so the input is
already gone by the time `setInputFiles` looks for it — the test times out.

Use `page.waitForEvent('filechooser')` + `fileChooser.setFiles(...)`. Verified
headless. `headless: false` is NOT required for photo upload.
`dashboard-photo.spec.js` still uses the old headed workaround and can be
simplified the same way (not done yet).

## Display name — the save is fine, the refresh is racy (real app bug)
Pressing the tick **always** saves: `PATCH /user/profile` returns 200 and the new
name is there after a reload. What's unreliable is the popup — sometimes it shows
the new name immediately, sometimes it keeps the old one until you reload. Same
steps, same account, both outcomes seen in one session. So the display name test
is flaky until the app is fixed.

Worth knowing because it looks exactly like "the save button doesn't work", and
it looks exactly like a wrong selector (clicking the cross instead of the tick).
It's neither. Ways to tell them apart:
- the tick's icon colour is `rgb(11,11,11)` (`#0B0B0B`); the cross is `rgb(74,74,72)`
- only the tick fires a network call — cancel makes none
- if the name is there after `page.reload()`, the save ran

`updateUser()` in AuthContext does call `setUser`, so the fix belongs in the app,
not the test. Likely a profile refetch landing after the save and putting the old
name back.

Also: the tick and cross are plain boxes with an icon and **no button role**, so
`getByRole('button')` finds nothing there — that selector times out. Position
(`following-sibling::*[1]`) is what works today.

## Forms save the WHOLE form — check before splitting tests by field
The Edit Profile popup sends every field on Save, not just the one that changed
(`handleSaveProfile`, ProfileScreen.tsx). So "one test per field, sharing one
account" is NOT safe in parallel: each test sends the values it read when it
opened, and the last save silently undoes the others. It looks like a real app
bug — fields reverting to their old values — but it's the tests fighting.

Fix used here: one test that fills the whole form and saves once. Check how the
screen actually saves before writing per-field tests for teacher/parent/admin.

## Onboarding tests need one account each, not one shared account (real collision, not flakiness)
onboarding.spec.js originally shared a single account (student-d) across all 9
tests. Once login stopped driving the UI form (session reuse instead), the 9
tests started running close enough together that one test's `resetOnboarding()`
or completed-onboarding state would land while another test was still mid-fill
on the same account — the page changed out from under it and selectors like
"Your name" stopped matching, timing out.

Fix: each test now gets its own dedicated account (**student-d1** through
**student-d9**, one per test), added to `tests/helpers/accounts.js` and seeded
via `seed-e2e-suite.js` in the Aivorah app repo (that script's `ACCOUNTS` map
needed the same 9 entries added before seeding would create them). The old
`student-d` env var/account is left in place, unused, rather than deleted.

## PR #4 merged (2026-08-05)
"Student email signup, age validation, onboarding tests + session-reuse infra" —
covers b2b-login, email-signup, age-validation, onboarding, plus the
global-setup/teardown + session/auth/account helper infra every other spec
depends on. Still uncommitted, waiting on separate PRs: `profile.spec.js`,
`dashboard.spec.js`, `dashboard-photo.spec.js`, `learning-paths.spec.js`,
`tests/fixtures/`.

## Suite setup
- All tests run in parallel, each fully independent (see CLAUDE.md).
- `tests/global-setup.js` logs every account in once and saves the session to
  `.auth/`; tests reuse it via `tests/helpers/session.js` instead of logging in
  themselves (~0.3s vs ~9s per test).
- Accounts and which spec owns which are listed in `tests/helpers/accounts.js`.
  Read-only tests share **student-a**. profile.spec.js owns three, split by what
  they write: **student-c** (edit popup), **student-g** (avatar/learning
  style/subjects), **student-h** (photo — the avatar test deletes the photo, so
  it can't share with student-g).
- Mutable accounts are snapshotted before the run and restored by
  `tests/global-teardown.js`.
- Logins run 2 at a time (`BATCH_SIZE` in `global-setup.js`). Four at a time ran
  the 8GB dev machine out of RAM — Windows killed the browser and setup died with
  a misleading `Failed to find browser context` error. Raise it again on a bigger
  machine.
- That batch loop uses `Promise.allSettled`, not `Promise.all`. With `all`, the
  first failed login closed the browser under the others still running, and their
  crashes hid the real reason. Now failures are reported per account.

## Assignments (2026-08-13)
`tests/student/assignments/assignments.spec.js` — 12 tests, **all passing**.
Covers page load (title/subtitle/summary cards/tabs), Pending/Completed/Ready
counts against a real API read, tab filtering, empty state (Completed tab),
a genuinely overdue assignment's "Ready to submit" + auto-`Closed` status,
a full create → open → answer → submit flow through the real UI (score
100%, moves to Completed), loading state, API-failure fallback, refresh,
navigate-away-and-back, and responsive/mobile-viewport layout (no horizontal
scroll at 390×844).

**Cross-persona test (real teacher → real student, not API-simulated):**
a real teacher (**teacher-d**, linked only to student-r) assigns a quiz
through the actual Teacher Assignments UI (Quiz Library → Assign → Specific
student → Publish), and student-r receives, opens, answers, and submits it
through their own real UI (the interactive-quiz iframe). Only the quiz's
existence in the Library is seeded via API (`POST /quiz/save`, setup only,
same shape a real "Generate Interactive Quiz" run produces) — the AI
question-generation wizard was intentionally NOT driven end-to-end, since
that involves real, non-deterministic AI calls that would make the test
slow and flaky. The Quiz Library "Assign" quick-path is itself a real,
fully deterministic supported teacher journey.

This test found and fixed **two real product bugs**:
1. `TeacherAssignmentsScreen.tsx`'s Library "Assign" button read
   `q.quiz_data` from the **list** endpoint response, which never includes
   `quiz_data` (`GET /quiz/list` omits it for listing performance) — so
   clicking "Assign" directly on any Quiz Library card always failed to
   publish with *"This quiz has no tasks. Please re-generate before
   publishing."* The entire Quiz Library reuse feature was non-functional.
   Fixed to fetch the full quiz via `GET /quiz/:id` first, same as tapping
   the card itself already did.
2. (Test bug, not product) the test itself navigated away immediately after
   clicking Submit, before the async `PUT /assignments/:id/complete` had
   resolved — the click only dispatches the DOM event, not the async work
   it triggers. Fixed by waiting for the interactive-quiz modal to actually
   close (server-confirmed completion signal) before navigating.

New dedicated account **teacher-d** (linked to student-r only, via
`teacher_student`), seeded via `server/scripts/seed-teacher-d.js`.

New dedicated account **student-r** (CBSE/Grade 3), seeded via
`server/scripts/seed-student-assignments-r.js` — its `created_at` is
deliberately backdated to 2020-01-01 so a real overdue assignment can be
created without tripping the app's `joinedAfterDue` suppression (a
freshly-created account can never show a genuine overdue item otherwise).

Added `testID`s to `AssignmentsScreen.tsx` (stat cards, filter tabs, empty
state, loading state, assignment cards, Start button) — the screen had zero
stable selectors before this, same gap Schedule/Challenges had.

**Local run note (not a product bug):** at this repo's default worker count
(6, one per CPU core — `workers: undefined` in `playwright.config.js`), this
spec is flaky under this local single-instance dev server (`node index.js`
serving both API and the static web build) — screens get stuck on their
loading spinner for 15s+ under the combined load of 6 concurrent browser
contexts hammering one Node process. Reliably green at `--workers=2`. Other
suites may not show this because they're lighter-weight; worth checking
before assuming they're immune. Recommend either running this spec with
`--workers=2` locally or verifying it under CI hardware with more headroom.

**Bug fixed (2026-08-13):** `GET /assignments` failing used to silently fall
back to the normal empty state ("No assignments yet...") — indistinguishable
from a real empty account. Fixed in `AssignmentsScreen.tsx`: `load()` now
tracks a separate `loadError` flag, and the screen renders a distinct error
state ("Couldn't load your assignments. Check your connection and try
again.") with a "Try again" button that retries `load()`. Only shown when
there's no already-loaded list to preserve (a transient failure during the
30s background poll doesn't wipe assignments already on screen). Covered by
the "when the assignments API fails..." test, which also verifies Try again
recovers once the API is healthy again. Web bundle (`dist2`) rebuilt via
`expo export --platform web` to ship the fix.

## Teacher
Not started yet.

## Parent
Not started yet.

## School Admin
Not started yet.
