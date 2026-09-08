# Switch Profile — child-account-creation bug: investigation + fix plan

**Written by Claude (Sonnet) after a full overnight debugging session (2026-08-29/30). Intended to be executed by another agent/session (Antigravity). Every claim below was verified live against the real app and real Firebase project — do not re-derive from scratch, start from "0. What is already ruled out."**

---

## 0a. Repos & services involved — read this first if unfamiliar with the codebase

This project is mid-migration from one old monolith to many small microservices. Know which is which before touching anything:

| Repo (on Desktop) | What it is | Involved in this bug? |
|---|---|---|
| `aivorah-frontend` | The React Native/Expo app (this repo). All frontend code, including `OnboardingParentBoxes.tsx` and the E2E suite (`e2e/`). | **Yes — primary suspect, see §1-2.** |
| `ai-mentor/server` | **The OLD monolith** (Node/Express). Being migrated feature-by-feature into microservices. Still hosts `/parent/*` routes (`routes/parent.js`), including `POST /parent/children/init-auth` used by this flow. Run locally on port 3007 for dev (`node index.js` inside `ai-mentor/server`). | Confirmed NOT the cause (see §0) — generates the correct email/password every time, verified via direct `curl`. **Do not edit this repo** unless steps 1-4 prove the bug is server-side, which current evidence contradicts. |
| `aivorah-auth-service` | New microservice — `/user/sync`, login/role resolution. Runs on port 4001 locally. | Not involved in child creation. Only relevant if login itself breaks (unrelated symptom). |
| `aivorah-profile-service` | New microservice — `/user/preferences` GET/PATCH (roles, teaches, etc). Runs on port 4002 locally. | Not involved in child creation. Relevant later for the (separate, out-of-scope-for-now) backend refactor task. |
| `aivorah-teacher-dashboard-service` | New microservice — Teacher Dashboard + Student Progress heatmap. Unrelated to this bug. | No. |
| Other `aivorah-*-service` repos on Desktop | Various already-migrated features (assignments, challenges, schedule, etc). | No, unrelated to Switch Profile. |

**The actual account-creation call happens 100% client-side**, straight from the React Native Web app to Firebase's own servers (`identitytoolkit.googleapis.com`) — no backend repo is in the request path for that specific call. The backend (`ai-mentor/server`) is only involved one step earlier, to hand back a candidate `email`/`password` pair (`POST /parent/children/init-auth`), which has already been verified correct. This is why §0's evidence points at the frontend, not any backend repo.

**The E2E test suite** lives inside THIS repo at `aivorah-frontend/e2e/` — it is not a separate repo. It's a Playwright suite with its own `package.json`, `.env`, and `tests/helpers/` (account management, session injection, etc). Relevant files for this bug:
- `e2e/tests/teacher/switch-profile/switch-profile.spec.js` — the actual test.
- `e2e/tests/helpers/accounts.js` — registers the test accounts (`teacher-g` is what this spec currently uses; `teacher-f` also registered but currently unused, see memory file).
- `e2e/tests/helpers/auth.js` — `applySession()`/`harvestSession()`, the session-injection mechanism named as hypothesis #2 in §2.
- Full architecture/gotchas already learned this session: see `switch_profile_e2e_blocker.md` in this session's memory (if Antigravity has access to it) — otherwise this plan document is self-contained and supersedes it for this specific bug.

For servers to be running locally during any manual reproduction/testing:
```bash
# Terminal 1 — the old monolith (needed for init-auth)
cd C:/Users/Asus/Desktop/ai-mentor/server && node index.js       # port 3007

# Terminal 2 — auth microservice (needed for login)
cd C:/Users/Asus/Desktop/aivorah-auth-service && node index.js  # port 4001

# Terminal 3 — profile microservice (needed for role/preferences)
cd C:/Users/Asus/Desktop/aivorah-profile-service && node index.js  # port 4002

# Terminal 4 — the frontend itself
cd C:/Users/Asus/Desktop/aivorah-frontend && npx expo start --web --port 3006
```

---

## 0. What is already ruled out (do not re-investigate these)

The Switch Profile E2E test (`e2e/tests/teacher/switch-profile/switch-profile.spec.js`) reliably gets through: login → sidebar "Also a parent?" hint → full parent onboarding form (personal info, DOB picker, child info, curriculum/grade) → clicking "Complete Setup". It then fails with the UI error:

> `<Child name>'s email already exists. Use another email or leave it blank for auto-generated login.`

This message comes from exactly one place — `src/.legacy-screens/onboarding/OnboardingParentBoxes.tsx`, in the `catch` block around the child-account-creation `createUserWithEmailAndPassword` call (see §1 below), triggered only when `fbErr?.code === 'auth/email-already-in-use'`.

**Ruled out — NOT a stale/orphaned Firebase account:**
- Confirmed via the Firebase Identity Toolkit REST API (`accounts:createAuthUri` and, more authoritatively, `accounts:signUp`) directly, multiple times, **immediately before and immediately after** a failing test run: the exact candidate email (e.g. `e2eteacherg_ch1@aivorah.student`) is genuinely NOT registered. A raw `accounts:signUp` REST call for that exact email succeeds instantly and cleanly, every single time — right after the app's own attempt just failed with "already in use" for the same email.
- Confirmed via Supabase: `users` table has zero rows matching `%teacherg_ch%` at every check. No leftover data anywhere.
- Confirmed the monolith server (`ai-mentor/server`, local port 3007) generates the candidate email correctly and consistently: `POST /parent/children/init-auth` returns `{"success":true,"childEmail":"e2eteacherg_ch1@aivorah.student", ...}` on direct `curl` testing, matching what the browser should be using.
- Confirmed `aivorah-auth-service` (port 4001) and `aivorah-profile-service` (port 4002) are both correctly pointed at the Test Supabase project (`vgqrrseziwnljkencqpy`), not Dev. Not the cause.
- Ruled out double-submission: instrumented a live browser run (`page.on('request', ...)`) and observed exactly **one** call to `/parent/children/init-auth` per "Complete Setup" click — not two.
- Ruled out account/test-state pollution: reset both the `users` table row AND the `user_preferences` row (a gap found this session — the E2E suite's own snapshot/restore only reliably clears things when the FULL Playwright test lifecycle runs; manual/partial runs can leave `user_preferences.data.role`/`data.roles` dirty even when `users.role` looks clean) before every retry. Same failure every time regardless.

**Conclusion: this is a real, reproducible bug in the app's own child-account-creation code**, not a test-environment or stale-data problem. It would very likely also affect a real parent going through this exact flow in production.

---

## 1. The exact code in question

`src/.legacy-screens/onboarding/OnboardingParentBoxes.tsx`, inside `handleFinish()`'s child-creation loop (age < 14, auto-create path):

```ts
// ~line 454-492 (line numbers approximate, re-locate by content if the file has moved)
const secondaryName = `onboarding-child-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const childApp = initializeApp((firebaseApp as any).options, secondaryName);
const childAuth = getAuth(childApp);
let firebaseUid = '';
try {
  const childCred = await createUserWithEmailAndPassword(childAuth, finalEmail, finalPassword);
  firebaseUid = childCred.user.uid;
  await updateProfile(childCred.user, { displayName: `${cleanName}|student` }).catch(() => {});
} catch (fbErr: any) {
  if (fbErr?.code === 'auth/email-already-in-use') {
    throw new Error(`${cleanName}'s email already exists. Use another email or leave it blank for auto-generated login.`);
  }
  throw new Error(fbErr?.message || `Could not create ${cleanName}'s account.`);
} finally {
  await signOut(childAuth).catch(() => {});
  await deleteApp(childApp).catch(() => {});
}
```

`finalEmail` / `finalPassword` come from the earlier `POST /parent/children/init-auth` call's response (`init.email`, `init.password`) — already confirmed correct and unique via direct curl testing (see §0).

This pattern creates a **secondary Firebase App instance** (`initializeApp(options, secondaryName)`) purely so that creating the child's account doesn't sign the PARENT out of their own session (Firebase JS SDK's default app instance signs in as whoever you just created/signed-in). `firebaseApp` (the primary instance) is imported from `src/config/firebase.ts`.

---

## 2. Working hypothesis (not yet confirmed — this is the actual investigation)

Firebase is genuinely telling the app `auth/email-already-in-use` for an email that is genuinely free per direct REST verification. The most likely explanations, roughly in order of likelihood:

1. **Secondary-app + persistence interaction.** `getAuth(childApp)` on web defaults to `browserLocalPersistence`, which is backed by `localStorage`/`IndexedDB` **keyed by API key + auth domain, not by app name.** If the PRIMARY app (the parent's own already-authenticated session) and the SECONDARY app share the same underlying persistence key namespace, `createUserWithEmailAndPassword` on the secondary auth instance might be interacting with — or getting confused by — the primary app's already-signed-in state in a way that surfaces a misleading `auth/email-already-in-use`. Worth testing: does explicitly setting `inMemoryPersistence` (or `browserSessionPersistence`) on `childAuth` before the create call change the outcome? (`import { setPersistence, inMemoryPersistence } from 'firebase/auth'`, call `await setPersistence(childAuth, inMemoryPersistence)` right after `getAuth(childApp)`, before `createUserWithEmailAndPassword`.)

2. **`applySession()`'s manually-seeded IndexedDB rows leaking into the secondary app.** The E2E suite's `e2e/tests/helpers/auth.js` `applySession()` helper manually injects rows into `firebaseLocalStorageDb` / `firebaseLocalStorage` IndexedDB stores (to fake the teacher's own login without going through the real UI). If Firebase's IndexedDB store is genuinely shared across app instances by design (see #1), this manual seeding could be the direct cause — worth testing whether this bug ALSO reproduces via a fully real, non-`applySession` login (a plain manual click-through in a real browser, teacher logs in normally through the UI, no E2E test harness involved at all). If it does NOT reproduce that way, the bug is in `applySession()`/the E2E suite, not the app — though the current failure mode (a real REST call disagreeing with the real client SDK) makes this less likely, since `applySession` only touches Firebase's own local persistence, not the identitytoolkit API itself.

3. **A raw Firebase Auth JS SDK bug/edge-case** for this specific project's configuration (e.g. Email Enumeration Protection settings on the Firebase project — check Firebase Console → Authentication → Settings → User actions — "Email enumeration protection" can change how `EMAIL_EXISTS` is reported in some SDK versions/configurations). Check the installed `firebase` package version in `package.json` (currently `"firebase": "^12.11.0"`) against Firebase's own changelog/known-issues for `createUserWithEmailAndPassword` + secondary app instances.

4. **Something entirely different reusing `finalEmail`** — re-verify, don't assume: add a temporary `console.log('[DEBUG] creating child with email:', finalEmail)` immediately before the `createUserWithEmailAndPassword` call, and confirm in the browser console during a real failing run that the logged email EXACTLY matches (byte for byte, no invisible whitespace/case difference) what `/parent/children/init-auth` returned and what was verified as free via REST. This has NOT been done yet — it was the planned next step when this session ended.

---

## 3. Concrete steps to execute (in order)

1. **Add temporary raw-error logging.** In the `catch (fbErr: any)` block above, before the `if` check, add:
   ```ts
   console.log('[DEBUG child-create error]', JSON.stringify({ code: fbErr?.code, message: fbErr?.message, email: finalEmail }, null, 2));
   ```
   Run the E2E test (or a manual click-through) once, capture the browser console output. Confirm `code` really is `auth/email-already-in-use` (not something else being miscategorized) and confirm `email` is exactly what's expected.

2. **Test hypothesis #1** (persistence). Add `setPersistence(childAuth, inMemoryPersistence)` right after `getAuth(childApp)`, before the create call. Re-run. If this fixes it, that's the root cause and the fix — done, write a regression test, remove the debug log, ship it.

3. **If step 2 did NOT fix it, test hypothesis #2** (E2E-harness-specific). Do a fully manual test: start the dev server, log in as a real teacher account through the actual UI (no `applySession`, no Playwright), click "Also a parent?", fill the form, click "Complete Setup". Does the SAME bug reproduce? This isolates whether it's an app bug or an E2E-suite-only artifact.
   - If it reproduces manually too → confirmed real app bug, keep investigating (try hypothesis #3, #4 below).
   - If it does NOT reproduce manually → the bug is specific to `applySession()`'s IndexedDB seeding technique in `e2e/tests/helpers/auth.js`, not the app itself. In that case the E2E test's approach needs rethinking (e.g., a real UI login instead of `applySession` for this specific spec, accepting the ~9s cost), and this is a test-infra fix, not a product fix — update `switch_profile_e2e_blocker.md` memory accordingly and de-prioritize as a "real bug."

4. **If still unresolved after steps 2-3**, check the Firebase Console (Authentication → Settings) for Email Enumeration Protection or any other project-level auth setting that might explain client-vs-REST inconsistency (hypothesis #3), and check `firebase` package version changelogs for any known secondary-app-instance issues around `createUserWithEmailAndPassword`.

5. **Once root-caused and fixed:** remove all temporary debug logging, run the full E2E test (`npx playwright test tests/teacher/switch-profile/switch-profile.spec.js --project=chromium --reporter=line` from `e2e/`) and confirm it passes cleanly end to end (all 3 acts: hint → onboarding → dual-role pills → switch back to Teacher → switch back to Parent). Run it **twice** in a row (fresh `.auth` each time — `rm -rf e2e/.auth` between runs) to rule out flakiness before declaring victory.

---

## 4. Acceptance criteria (what "done" means — used for validation)

- [ ] `e2e/tests/teacher/switch-profile/switch-profile.spec.js` passes cleanly, twice in a row, with no manual account resets needed in between (i.e. the account's own teardown/restore is sufficient — no more silent `user_preferences` leakage).
- [ ] No new `console.log`/debug scaffolding left in `OnboardingParentBoxes.tsx` or anywhere else in `src/`.
- [ ] If the root cause was a real product bug (hypothesis #1, #3, or #4): a short code comment at the fix site explaining WHY (not just what), same standard as the rest of this codebase's comments.
- [ ] If the root cause turned out to be E2E-harness-specific (hypothesis #2): `e2e/tests/helpers/auth.js`'s `applySession()` header comment updated to document the limitation, and `switch-profile.spec.js` adjusted to work around it (real UI login for this one spec, or whatever the actual fix ends up being).
- [ ] `switch_profile_e2e_blocker.md` memory file (or its successor) updated with the real root cause and fix — so this exact multi-day debugging loop never has to happen again for anyone (human or agent).
- [ ] Full frontend test suite (`npx jest` from repo root) still 100% green — no regressions from whatever change fixes this.

## 5. Out of scope for this task (do not do these as part of this bug fix)

- Do not touch `ai-mentor/server` (the monolith) unless steps 1-4 above definitively prove the bug is server-side (current evidence points entirely client-side, since the SAME server-generated email/password work fine via direct `curl`/REST testing).
- Do not start the backend refactor for Switch Profile (`/user/preferences` PATCH consolidation etc.) — that's a separate, later task, gated on this bug being fixed and the E2E test passing.
- Do not write the Switch Profile integration test yet — same reason, do the unit-level bug fix first.
- Do not redesign the onboarding form UI/UX. This is a targeted bug fix, not a refactor.
