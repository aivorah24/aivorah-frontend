# Teacher → Student Progress: remaining work plan

**Written by Opus after full codebase analysis (2026-08-29). Intended to be executed by a Sonnet session.**
Follow this exactly. Every file path, line number, and gotcha below was verified against the real code, not assumed.

---

## 0. Current state — what is ALREADY DONE (do not redo)

- Filter bar: Curriculum → Grade → Section → Subject dropdowns + Export report. Cascading, real-data-driven, defaults to the teacher's first real class (never "All"). **Working. Do not redesign.**
- `ActivityTable` Today/Overall toggle, Best Quiz Score ("No quiz attempts" empty state), pagination, hours formatting (`minutesLabel()` already returns `1.5h` past 60m). **Working.**
- Backend `aivorah-teacher-dashboard-service` routes: `/heatmap`, `/subject-summary`, `/:studentId/topic/:topic/attempts`, roster `by-teacher/:id`. All real.
- `users.class` column was added to both Supabase projects earlier and is returned by the backend, but the UI no longer uses it (grade + section *is* the class). **Leave it alone.** Harmless, nullable.
- Tests: **66/66 frontend** (`src/screens/teacher/student-progress`), **60/60 backend**. TypeScript clean.

### Config fix already applied (2026-08-29)
`aivorah-teacher-dashboard-service/.env` had `QDRANT_URL=` **empty** and a Qdrant key that returned `Forbidden`. Every syllabus lookup silently returned `0`, which is why the UI showed *"No topic data for Mathematics"* and `0%`. Fixed by copying `QDRANT_URL` + `QDRANT_API_KEY` from `aivorah-learning-paths-service/.env`. A timestamped backup exists at `.env.bak.<epoch>`.

> ⚠️ **PRODUCTION ACTION (not code):** the deployed Render instance of `aivorah-teacher-dashboard-service` very likely has the same blank `QDRANT_URL`. Check its env vars before any demo or it will show "No topic data" in production. This cannot be fixed from the repo.

Verified working after the fix:
```
Seed Student 1 | grade 3 | CBSE   | totalTopics=38 | completed=1 | 3%
Seed Student 4 | grade 4 | IB PYP | totalTopics=22 | completed=1 | 5%
```

---

## 1. THE ONE REAL REMAINING GAP

**Topic Exploration columns are not the real curriculum.**

`routes/student.js` builds the heatmap's topic columns from `topic_attempts` + `student_stats.completed_topics` — i.e. **only topics a student has already touched**. It never consults the syllabus.

| | |
|---|---|
| Real CBSE Grade 3 Maths (verified live from Qdrant) | *Time Goes On, Double Century, House of Hundreds — I, Give and Take, Filling and Lifting …* (38 topics) |
| What the screen currently shows | *Fractions, Long Division, Place Value, Multiplication Tables* — seeded demo rows, **not in the real CBSE syllabus at all** |

Consequences:
1. Topics shown are not the teacher's actual curriculum.
2. **"Not started" is nearly unreachable** — a topic nobody has touched never becomes a column, so that legend colour barely ever appears.

**Why this is tractable:** `fetchTotalTopicsFromQdrant()` (`routes/student.js:36-70`) *already* scrolls every real topic and collects `${p.subject}|${p.topic}` into a Set — then discards the names and returns `.size`. We only need to return the names.

---

## TASK A — Real syllabus topics in Topic Exploration

### A1. Backend: `aivorah-teacher-dashboard-service/routes/student.js`

**Refactor the existing helper so the count is derived from the names** (this keeps `totalTopics` semantics byte-identical — same unique `subject|topic` pair set — so the roster route cannot regress).

Replace the cache at **line 33** and the helper at **lines 36-70**:

```js
// Module-level cache for real syllabus topics — avoids repeated Qdrant
// pagination on every page load. Stores the NAMES; the count used by the
// roster route is derived from these, so both stay in sync by construction.
const _topicCache = new Map(); // key → { topics: [{subject, topic}], expiresAt }
const TOPIC_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function fetchSyllabusTopicsFromQdrant(curriculum, grade, subject) {
  const cacheKey = `${curriculum}|${grade}|${subject || ''}`;
  const cached = _topicCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.topics;

  try {
    const normCurr = normalizeCurriculum(curriculum, 'IB PYP');
    const { collection, qdrantCurriculum, qdrantGrade } = resolveCollection(normCurr, grade);
    const mustFilters = [
      { key: 'curriculum', match: { value: qdrantCurriculum } },
      { key: 'grade',      match: { value: qdrantGrade } },
    ];
    if (isRealSubject(subject)) mustFilters.push({ key: 'subject', match: { value: subject } });
    const seen = new Map(); // "subject|topic" → { subject, topic }
    let offset = null;
    do {
      const result = await qdrant.scroll(collection, {
        filter: { must: mustFilters },
        limit: 100,
        offset: offset ?? undefined,
        with_payload: true,
        with_vector: false,
      });
      for (const point of result.points) {
        const p = point.payload;
        const key = `${p.subject}|${p.topic}`;
        if (!seen.has(key)) seen.set(key, { subject: p.subject ?? null, topic: p.topic });
      }
      offset = result.next_page_offset ?? null;
    } while (offset !== null);
    const topics = [...seen.values()];
    _topicCache.set(cacheKey, { topics, expiresAt: Date.now() + TOPIC_CACHE_TTL_MS });
    return topics;
  } catch {
    return [];
  }
}

// Kept for the roster route — same unique subject|topic pair semantics as before.
async function fetchTotalTopicsFromQdrant(curriculum, grade, subject) {
  return (await fetchSyllabusTopicsFromQdrant(curriculum, grade, subject)).length;
}
```

> **Gotcha (already documented in CLAUDE.md, still applies):** the cache persists across ALL tests in a file. Reusing a `curriculum|grade|subject` combo across tests can silently serve a stale cached value instead of calling Qdrant. **Give each test a distinct combo** when asserting on topic counts or Qdrant call behaviour.

**Then, in the heatmap route (`router.get('/by-teacher/:teacherId/heatmap'`, starts line 705):**

Insert *after* `uniqueLinks` / `studentIds` are built and after `teacherSubjectsByStudent` exists, but *before* the `const students = uniqueLinks.map(...)` at line ~790:

```js
// Real syllabus topics per student's (curriculum, grade, subject) — so the
// heatmap's columns are the teacher's ACTUAL curriculum, not just whatever
// topics happen to have activity. Without this, "Not started" is unreachable:
// a topic nobody has touched never becomes a column at all.
const syllabusByStudent = {};
const syllabusCombos = new Map(); // "curr|grade|subj" → Promise
for (const link of uniqueLinks) {
  const u = link.users ?? {};
  const scoped = teacherSubjectsByStudent[link.student_id]
    ? [...teacherSubjectsByStudent[link.student_id]] : [];
  const subjects = subjectFilter ? [subjectFilter] : (scoped.length > 0 ? scoped : [null]);
  const perStudent = [];
  for (const subj of subjects) {
    const key = `${u.curriculum}|${u.grade}|${subj || ''}`;
    if (!syllabusCombos.has(key)) {
      syllabusCombos.set(key, fetchSyllabusTopicsFromQdrant(u.curriculum, u.grade, subj || undefined));
    }
    perStudent.push(syllabusCombos.get(key));
  }
  syllabusByStudent[link.student_id] = (await Promise.all(perStudent)).flat();
}
```

Then **inside** the `uniqueLinks.map(link => { ... })` student loop, change **line 798**:

```js
// BEFORE
const topicNames = new Set([...Object.keys(topicMap), ...completed]);

// AFTER — union real syllabus with anything the student has touched, so no
// real attempt data is ever dropped just because a topic isn't in Qdrant.
const syllabus = syllabusByStudent[link.student_id] ?? [];
syllabus.forEach(s => { if (s.subject && !topicSubject[s.topic]) topicSubject[s.topic] = s.subject; });
const topicNames = new Set([
  ...Object.keys(topicMap),
  ...completed,
  ...syllabus.map(s => s.topic),
]);
```

Nothing else in the loop changes. `computeTopicStatus([], { completedViaPath: false })` already returns `not_started` (verified at `utils/topicStatus.js:24-28`), so untouched syllabus topics correctly render grey.

> **Important:** the `students` map callback must become `async` (it now awaits nothing internally — the awaits are hoisted above — so it does **not** need to change). Confirm you did NOT put an `await` inside `.map()`. The `Promise.all` above is deliberately outside the map for this reason.

### A2. Frontend

Almost nothing changes — topics come from the API. Two small items:

1. `src/screens/teacher/student-progress/components/HeatmapGrid.tsx:32` — the empty message *"No topic activity recorded yet."* should become *"No syllabus topics found for this class."* since the column source is now the syllabus, not activity.

2. **Free side benefit, verify it:** `utils/masteryDisplay.ts:22-28` `summarizeStudentMastery()` computes `masteredPct` over `Object.keys(topicStatus).length`. Once every syllabus topic has a status entry, that per-student "% mastered" under each name automatically becomes **% of the real syllabus** instead of "% of what they touched". This is a correctness improvement — confirm the number drops to a realistic value (Seed Student 1 should go from `67%` to roughly `3%`).

### A3. UX check
38 columns is wide. `HeatmapGrid` already wraps in `<ScrollView horizontal>` (line 38), so it scrolls. Just verify it doesn't break the desktop layout. Do **not** add pagination unless it visibly breaks.

---

## TASK B — Make "Class average mastery" honest

`utils/subjectSummary.ts` currently computes **`mastered cells ÷ cells that have any real data`**. The 50% in the screenshot = Seed Student 1 had 2 topics with data (1 mastered, 1 stuck).

**The problem:** the denominator is only what's been *attempted*. A class that touched 2 of 38 topics and mastered 1 reads as "50%", which a teacher/parent will read as *half the year done*.

**After Task A this fixes itself** — every syllabus topic gets a `topicStatus` entry, so `totalCells` becomes `students × real syllabus topics` and the percentage becomes true syllabus coverage. So Task B is mostly verification plus two adjustments:

1. In `computeSubjectSummary()` (`utils/subjectSummary.ts`), `studentCount` currently counts `studentsWithData` (students with ≥1 topic entry). After Task A that becomes "all students", which is what we want — but **verify** it reads correctly and rename the local if it's now misleading.

2. `components/SummaryCards.tsx` label — change `"Class average mastery"` to something unambiguous now that the denominator is the syllabus, e.g. **`"of syllabus mastered · N students"`**. Consider showing both numbers: `3% of syllabus · 50% of attempted`.

Expected after Task A+B: Seed Student 1's Mathematics card should show roughly **3%**, not 50%.

---

## TASK C — (Optional, only if time) Today/Overall

**Current honest state:**
- **Overall** = true cumulative all-time. Fully real. ✅
- **Today** = real **only** for Learning Path (`learning_path_minutes` resets daily). Assignments and Challenges have **no per-day column anywhere in the schema**, so they render `—` (never a fake `0m`). This is deliberate — do not "fix" it by showing zeros.

**Recommendation (from the user's own question about whether the toggle is right):** "Today" is the weak half — a teacher checking on Tuesday about a Monday class sees an empty screen and assumes the tool is broken. **`This week | This month | Overall`** is what an IB/CBSE teacher actually plans against, and it survives a day off. This requires the same backend work as making "Today" fully real: a per-day activity log, or timestamping assignment/challenge time. **Do not start this without explicit approval — it is a schema change.**

---

## Verification checklist (run ALL of these)

```bash
# Backend
cd C:/Users/Asus/Desktop/aivorah-teacher-dashboard-service
npx jest --silent                 # expect 60/60 (plus any new tests)

# Frontend
cd C:/Users/Asus/Desktop/aivorah-frontend
npx jest src/screens/teacher/student-progress --silent   # expect 66/66 + new
npx tsc --noEmit -p . 2>&1 | grep -i "student-progress"  # expect no output
```

Then **live check** (both servers must be running):
```bash
# backend on 3016
cd C:/Users/Asus/Desktop/aivorah-teacher-dashboard-service && node index.js
# frontend on 3006
cd C:/Users/Asus/Desktop/aivorah-frontend && npx expo start --web --port 3006
```
Load `localhost:3006/teacher/progress` and confirm:
- [ ] Topic Exploration columns show **real CBSE topics** (Time Goes On, Double Century, …) — **not** Fractions/Long Division
- [ ] Grey "Not started" cells now actually appear
- [ ] Activity table shows `Grade 3 · 1 / 38 topics · 3%`, not "No topic data"
- [ ] Subject Progress % is syllabus-based and no longer reads 50%

---

## Known gotchas (all previously hit in this codebase — do not rediscover)

1. **Stale backend process.** After ANY backend edit you must kill and restart node, or you'll debug code that isn't running:
   `netstat -ano | grep ":3016.*LISTENING"` → `powershell -Command "Stop-Process -Id <PID> -Force"` → `node index.js`
2. **`_topicCache` persists across all tests in a file.** Use a distinct `curriculum|grade|subject` per test.
3. **Backend tests already mock Qdrant** (`tests/integration/heatmap.test.js:5-8`) with `points: []`. Empty syllabus = union is a no-op, so **existing heatmap tests should still pass unchanged**. Add NEW tests that mock non-empty `points` to cover the syllabus path.
4. **Test fixtures need every field.** `HeatmapStudent` / `RosterStudent` now include `section` and `class`. Missing fields cause confusing failures.
5. **RNTL `rerender` must be awaited** in this version (`await rerender(...)`), or the update silently doesn't apply.
6. **Two Supabase projects.** The teacher-dashboard service's local `.env` points at the **TEST** project (`vgqrrseziwnljkencqpy`), NOT Dev (`ernsrofvmszhmfhxeehx`). Seeding the wrong one produces confusing "empty data" symptoms.
7. **`TeacherProgress` route keeps getting reverted.** Commit `1d2bfd6` ("completely remove all references to TeacherStudentProgressScreen to fix bundler") commented out the import + `Drawer.Screen` in BOTH `src/navigation/TeacherNavigator.tsx` and `src/navigation/SuperAdminNavigator.tsx`. They are currently re-enabled as uncommitted changes. **If the page 404s or throws `TeacherProgressScreen is not defined`, check these two files first.** That commit's stated reason was a *production export* failure — before deploying, run `npx expo export --platform web` locally to confirm it doesn't reproduce.

## Do NOT do

- Do not redesign the filter bar, the page layout, or the Today/Overall toggle UI.
- Do not touch `ai-mentor/server` (the monolith).
- Do not remove the `users.class` column or its backend field.
- Do not invent data for fields with no real backing (no fake `0m` for today's assignment time, no fabricated topics).
- Do not add new dependencies.
