# Parent Persona — Profile: E2E → refactor → unit/integration tests → coverage

**Written by Claude (Sonnet), 2026-08-31. Intended for Antigravity. Investigated live against the actual code — most of this feature turns out to already be further along than expected. Read §0 first.**

---

## 0. Good news — this is much closer to done than the other Parent Persona items

Unlike most of the Parent persona (which is 100% untouched monolith, see `ARCHITECTURE_MAP.md`), **Parent Profile has already been split into a proper `components/hooks/services` structure** (`src/screens/parent/profile/` — `ParentProfileScreen.tsx`, `hooks/useParentProfileData.ts`, `hooks/useChangePassword.ts`, `services/parentProfileService.ts`, `components/ProfileHeroCard.tsx`, `ProfileInfoCard.tsx`, `ActivityOverviewCard.tsx`, `SecurityAccountCard.tsx`, `components/modals/EditProfileModal.tsx`, `ChangePasswordModal.tsx`). No `.legacy-screens` version of this exists at all.

**An E2E test already exists too** — `e2e/tests/parent/profile/profile.spec.js`, 348 lines, 8 tests, and it's thorough: profile info + activity overview display, avatar photo change, Edit Profile modal (name/contact/city editable, email correctly read-only), "Personal Information" tile reopening the same modal, Subscription navigation, Notification Settings → Settings screen, Privacy & Security → Settings screen, and **Change Password verified by actually logging in through the real form with the new password** (not just checking a success toast). This already matches essentially everything in the user's described persona flow (edit profile, name/email/contact/city, activity overview, notification/privacy/security → Settings tab, working password change).

**What's actually missing, per the standard work order (E2E → refactor → unit/integration → coverage):**
1. E2E test exists but **has not been confirmed passing recently** — needs an actual run (currently blocked, see §1).
2. Refactor is mostly done structurally, but has 2 files with monolith calls that need the same "verify before migrating" treatment as `MONOLITH_MOP_UP_PLAN.md` — see §2.
3. **Unit + integration tests: zero exist.** This is the real gap — `find src/screens/parent/profile -ipath "*test*"` returns nothing.
4. Coverage: unmeasured (no tests to measure).

---

## 1. Blocker — same one as everything else right now

The Supabase Test project (`vgqrrseziwnljkencqpy`) is still over its storage quota and returning HTTP 402 on all API calls (see `SUPABASE_STORAGE_MIGRATION_PLAN.md`). The E2E test above cannot actually be run/verified until that's resolved. **Do not skip straight to refactor/unit-tests assuming the E2E test passes — confirm it first**, per this repo's own work-order rule (E2E is the safety net; refactoring before confirming the safety net works risks refactoring against a test that was already broken, and not knowing which regressions are new).

If the Supabase blocker is still unresolved when this plan is picked up: run the E2E test anyway and see whether it fails at the Supabase-dependent step specifically (expected) or somewhere else entirely (a real problem, unrelated to quota) — that distinction matters, don't just assume "quota blocked = can't test anything."

---

## 2. Refactor — 2 files need the "verify before migrating" treatment

`src/screens/parent/profile/services/parentProfileService.ts` imports all three of `serverUrl.ts` (monolith), `profileServerUrl.ts`, and `authServerUrl.ts`. Confirmed exact monolith calls:

| Line | Call | Feeds | Notes |
|---|---|---|---|
| 27 | `GET ${SERVER_URL}/parent/${email}/children` | `ActivityOverviewCard`'s children list | **Cross-cutting with "My Kids" (today's plan item #2)** — this is literally "fetch the parent's children," which My Kids will also need. Don't extract this in isolation without checking what My Kids' own plan does for the same data — ideally one shared backend route, used by both features, not two separate migrations of the same underlying data. |
| 35 | `GET ${SERVER_URL}/student/${childId}/weekly` | Activity Overview's weekly stats per child | Same cross-cutting concern — "this week's activity" is exactly what My Kids will likely also show. Check for overlap before porting. |

**Recommendation:** do NOT migrate these 2 calls as part of Profile's refactor step in isolation. Flag them, and either (a) coordinate with whoever picks up "My Kids" so the same backend work covers both, or (b) if My Kids hasn't been scoped yet, do this migration as a small shared piece before both features' refactors, extracting `/parent/:email/children` and `/student/:id/weekly` into whichever service makes sense (likely `aivorah-students-service`, given it already owns teacher-side roster data — check its existing routes first, same pattern as `MONOLITH_MOP_UP_PLAN.md`, before assuming a new service is needed).

Everything else in this feature (profile fetch/save via `/user/sync` and `/user/profile`, both already on `authServerUrl`/`profileServerUrl`) is **already correctly migrated** — no work needed there.

---

## 3. Unit + integration tests — the real work for this task

Zero tests exist. Follow this repo's established colocated convention: `src/screens/parent/profile/__tests__/unit/*.test.ts(x)` and `__tests__/integration/*.integration.test.tsx` (see `src/screens/parent/dashboard/__tests__/` from this same session for the exact pattern/mocking style to copy — `AuthContext`/`ThemeContext`/`NotificationContext` mocks, `await render(...)` gotcha already documented in `switch_profile_e2e_blocker.md` memory — **remember `render()` returns a Promise in this repo's RNTL version, always `await` it**).

**What to actually unit-test** (derived from the E2E spec's own code-read comments, which already did the hard work of understanding the real logic):
- `hooks/useParentProfileData.ts` — the data-fetching/state hook. Test loading states, the children/weekly-activity aggregation feeding `ActivityOverviewCard`, error handling.
- `hooks/useChangePassword.ts` — the actual password-change logic (re-authentication against Firebase before allowing the change — this is real security-relevant logic per the E2E spec's own comment about `handleChangePassword()`'s re-auth step, worth unit-testing the validation/error paths directly rather than only through the slow E2E path).
- `services/parentProfileService.ts` — the fetch functions themselves (mock `fetch`, verify correct URLs/payloads/error handling) — standard service-layer test pattern already used elsewhere in this repo (see `parentDashboardService.test.ts` from this session).
- Components: `ProfileInfoCard`, `ActivityOverviewCard`, `EditProfileModal` (email genuinely non-editable — same thing the E2E test asserts, but worth a fast unit-level assertion too), `ChangePasswordModal`.

**Integration test:** one `ParentProfileScreen.integration.test.tsx` exercising the screen as a whole with mocked services — same pattern as `ParentDashboardScreen.integration.test.tsx` from this session (mock `AuthContext`/`ThemeContext`/`NotificationContext`, mock the service module, render the real screen, assert real rendered behavior). This is the RNTL-level safety net that runs in the normal Jest suite (fast, no browser), complementing the slower Playwright E2E test — not a replacement for it.

---

## 4. Coverage

After the tests above exist: `npx jest src/screens/parent/profile --coverage --collectCoverageFrom="src/screens/parent/profile/**/*.{ts,tsx}"`. Triage gaps the same way this session's Teacher Dashboard coverage pass did (documented in `CLAUDE.md`'s "Teacher Dashboard frontend coverage" section) — real behavior gets a test, dead code gets flagged/removed, genuinely-hard-to-cover gets documented and accepted, not blindly chased to 100%.

---

## 5. Acceptance criteria

- [ ] `e2e/tests/parent/profile/profile.spec.js` confirmed passing (all 8 tests), once the Supabase blocker is cleared.
- [ ] The 2 cross-cutting monolith calls (§2) either coordinated with My Kids' own migration, or explicitly deferred with a written reason — not silently left on the monolith without a note.
- [ ] Unit tests for `useParentProfileData`, `useChangePassword`, `parentProfileService`, and the key components listed in §3 — all passing.
- [ ] One integration test for `ParentProfileScreen.tsx` covering the same real flows the E2E test covers, at the faster RNTL level.
- [ ] Coverage report generated and gaps triaged (not just run once and ignored).
- [ ] Full `npx jest` suite still green — no regressions.

## 6. Out of scope for this task

- "My Kids" and "Daily Tasks" (today's plan items #2 and #3) — separate, not started here. §2 flags where Profile and My Kids overlap; don't scope-creep into building My Kids itself while doing Profile.
- The Supabase storage migration, Switch Profile bug, CI plan, and monolith mop-up plan — separate documents, this one just depends on the Supabase one being resolved first (§1).
