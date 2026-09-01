# Parent Persona — My Kids + Daily Tasks: investigation + plan

**Written by Claude (Sonnet), 2026-08-31. Intended for Antigravity. Both features investigated live — very different starting states from each other and from Profile, read carefully.**

---

## 0. Summary — these two are NOT the same size of task

| | My Kids | Daily Tasks |
|---|---|---|
| Current state | 100% monolith, single 1490-line file, zero refactor | 100% monolith, single 464-line file, zero refactor |
| E2E test | None exists | None exists |
| Unit/integration tests | None exist | None exist |
| Backend work needed | **Real, substantial** — target service has none of the needed routes yet | **Almost none** — target service already has matching routes |
| Shares data with Profile? | **Yes — significant overlap, see §1** | No overlap found |

Files: `src/.legacy-screens/parent/ParentMyKidsScreen.tsx` (1490 lines), `src/.legacy-screens/parent/ParentDailyTasksScreen.tsx` (464 lines). Both still single monolithic screen files — no `components/hooks/services` split has been started for either, unlike Profile.

---

## 1. My Kids — the bigger task, and directly overlaps with Profile

### 1a. Confirmed overlap with Profile (see `PARENT_PROFILE_PLAN.md` §2)
My Kids calls `GET /parent/${email}/children` (line 352, 620) — **the exact same endpoint** `ParentProfileScreen`'s Activity Overview card uses. This confirms what Profile's plan flagged as a hypothesis: **do not migrate this endpoint twice.** One shared backend fix (likely landing in `aivorah-students-service`, extending its existing parent-facing patterns — see §1c) should serve both Profile's Activity Overview AND My Kids' full roster view.

### 1b. ⚠️ Same Firebase bug risk as the Switch Profile investigation
My Kids calls `POST /parent/children/init-auth` (line 414) — **this is the exact same endpoint** at the center of `SWITCH_PROFILE_CHILD_CREATE_BUG_PLAN.md`'s `auth/email-already-in-use` bug (the child-account-creation flow that's been unreproducible-but-real all session). My Kids' "Add Another Child" flow almost certainly goes through the same `createUserWithEmailAndPassword` + secondary-Firebase-app pattern. **Do not treat these as two separate bugs** — whatever root-causes and fixes the Switch Profile bug should be verified against My Kids' own "add child" flow too, since they likely share the same underlying broken code path (check whether `ParentMyKidsScreen.tsx`'s child-creation code duplicates `OnboardingParentBoxes.tsx`'s pattern, or whether it's already factored into a shared helper — if duplicated, this is itself worth fixing as part of the eventual refactor, not just patching twice).

### 1c. Full list of monolith endpoints this feature needs migrated
| Endpoint | Purpose | Target service | Already exists there? |
|---|---|---|---|
| `GET /parent/:email/children` | List children (shared w/ Profile) | `aivorah-students-service` (best fit — mirrors its existing teacher-side roster patterns) | No — only teacher-side roster routes exist currently |
| `GET /parent/:email/children/:id/credentials` | View a child's login credentials | same | No |
| `POST /parent/:email/children/:id/resend-credentials` | Resend login info | same | No |
| `POST /parent/:email/children/:id/reset-password` | Reset a child's password | same | No |
| `POST /parent/children/init-auth` | Prepare new child's Firebase account (see §1b bug) | same | No |
| `POST /parent/:email/children/link-created` | Finalize a newly-created child link | same | No |
| `PUT /parent/:email/children/:id` (edit) | Edit child details | same | No |
| `DELETE /parent/:email/children/:id` (remove) | Remove a linked child | same | No |
| `POST /user/email-otp/send`, `POST /user/email-otp/verify` | OTP verification for the 14+/link-existing-account child path | Likely `aivorah-auth-service` (owns other OTP/verification flows) — check its existing routes first | Unconfirmed — check before assuming new work |

**This is a real, multi-route backend extraction** — closer in size to the Teacher Assignments work in `MONOLITH_MOP_UP_PLAN.md` than to Profile's "mostly just repoint 2 calls" situation. Budget accordingly; this will take longer than Profile or Daily Tasks.

### 1d. Recommended approach
1. **Do the shared `/parent/:email/children` (list) + weekly-activity migration ONCE**, coordinated with Profile (per `PARENT_PROFILE_PLAN.md` §2), before doing My Kids' OTHER routes.
2. Then extend `aivorah-students-service` with the remaining child-management routes (§1c table), mirroring its existing teacher-roster route patterns/style (`grep -rhoE "router\.(get|post|put|delete)\('[^']*'" routes/` in that repo shows the established style — e.g. `:teacherEmail/students/...` — the parent equivalent would naturally be `:parentEmail/children/...`, keep naming consistent).
3. Resolve the Switch Profile Firebase bug FIRST (separate plan, already in progress) before spending time on My Kids' identical "add child" flow — fixing it once, in the right place, benefits both.
4. THEN do the standard refactor (split into `components/hooks/services`, following Profile's structure as the template) + write E2E test + unit/integration tests + coverage, same work order as every other feature this session.

---

## 2. Daily Tasks — much smaller, mostly a repoint job

**Confirmed: `aivorah-daily-habits-service` already has matching routes** — `GET /parent-tasks`, `POST /parent-tasks`, `DELETE /parent-tasks/:taskId` (confirmed via direct route listing in that repo). `ParentDailyTasksScreen.tsx` calls `GET/POST ${SERVER_URL}/habits/parent-tasks` and a DELETE variant — the `/habits` prefix suggests the monolith mounts the same logical routes under a different path than the microservice does.

**Before assuming this is purely cosmetic:** verify request/response payload shape actually matches between the monolith's `/habits/parent-tasks` handler and the microservice's `/parent-tasks` handler — same caution as every other "looks like it already exists" case in this session's other plans. If they match, this is a same-day repoint (swap `serverUrl.ts` for `dailyHabitsServerUrl.ts`, test, done) — genuinely the cheapest of all the Parent persona work.

Also uses `GET /parent/:email/children` (same shared dependency as My Kids/Profile, §1a) — likely just to populate a per-child task filter/selector. Once that shared endpoint is migrated (§1d step 1), Daily Tasks benefits for free.

### Recommended approach
1. Confirm payload compatibility between monolith `/habits/parent-tasks` and service `/parent-tasks`.
2. Repoint, test.
3. Standard refactor + E2E + unit/integration + coverage — should be the fastest of the three Parent persona items today given how little backend work is needed.

---

## 3. Suggested execution order for today's 3-item Parent Persona plan

Given the investigation above, this order minimizes wasted/duplicate work:
1. **Shared children-list + weekly-activity migration** (serves Profile + My Kids + Daily Tasks' filter) — do once, first.
2. **Daily Tasks** — cheapest remaining work, get it done and fully tested while momentum/context is fresh.
3. **Profile** — unit/integration tests (per `PARENT_PROFILE_PLAN.md`), now unblocked on the shared migration.
4. **My Kids** — the big one, do last, and only after the Switch Profile Firebase bug (§1b) is actually resolved, since My Kids' own "add child" E2E test would hit the identical bug otherwise and waste another full debugging cycle.

---

## 4. Acceptance criteria

- [ ] Shared `/parent/:email/children` (+ weekly-activity) migrated once, used by Profile, My Kids, and Daily Tasks — not migrated 2-3 separate times.
- [ ] My Kids: all §1c routes ported to `aivorah-students-service` (or `aivorah-auth-service` for OTP, if confirmed that's the right home), frontend repointed, refactored into `components/hooks/services`, E2E test written, unit/integration tests written, coverage measured.
- [ ] My Kids' "add child" flow specifically verified against whatever fix resolves `SWITCH_PROFILE_CHILD_CREATE_BUG_PLAN.md` — not assumed fixed by association.
- [ ] Daily Tasks: payload compatibility confirmed (not assumed) between monolith and existing service routes, repointed, refactored, E2E + unit/integration tests + coverage.
- [ ] `ARCHITECTURE_MAP.md` updated once both are done (new services referenced, monolith calls removed from the audit table).

## 5. Out of scope

- Anything not listed in §1c/§2's endpoint tables — don't discover-and-migrate unrelated monolith routes encountered along the way; note them for a future pass instead.
- The Switch Profile bug fix itself — that's `SWITCH_PROFILE_CHILD_CREATE_BUG_PLAN.md`'s job; this document only says "verify My Kids against it once fixed," not "fix it here too."
