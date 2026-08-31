# Data Flow

## 1. Frontend → microservice (current/target pattern, verified for migrated features)
```
User action → aivorah-frontend screen/hook → src/config/<feature>ServerUrl.ts → aivorah-<feature>-service (Render) → Supabase
```
Applies to every feature listed as a "Consumer" in `SERVICE_MAP.md`. Each migrated feature has its own dedicated config file — check `REPO_MAP.md`'s port table to find which service backs a given feature before assuming monolith.

## 2. Legacy frontend → monolith (still real, still running)
```
User action → aivorah-frontend screen/hook → src/config/serverUrl.ts (generic) → ai-mentor/server (GCP Cloud Run) → Supabase
```
**100% monolith-backed, no dedicated service exists yet:**
- Entire **Parent persona**
- Entire **School Admin persona**
- Teacher: Challenges, Syllabus Import, Attendance, Help
- Most `.legacy-*` screens (AI Storyteller, Drawing Buddy, Math Helper/Lesson, NCERT Chapters, Video Lesson/Player, Word Wizard, etc.)
- Announcements, Channels, Classes, Class Portfolio, Resources, Timetable

**Mixed-backend (migrated but with residual monolith calls)** — a feature can call BOTH its own microservice AND the monolith for different endpoints within the same feature. Confirmed cases, file counts from a grep-based audit (not endpoint-level):
- Teacher Assignments — 15 files still monolith-backed (largest gap)
- Student Learning Paths — 5 files
- Student Settings — 4 files (account deletion/password/email change — possibly intentional, security-sensitive, not necessarily a migration gap)
- Student Assignments — 2 files
- Student Challenges — 2 files
- Student Dashboard, Student Schedule, Student AI Coach, Teacher Students — 1 file each

Do not assume a feature is fully migrated just because it has a dedicated service — check for residual `serverUrl.ts` (monolith) imports in that feature's folder first.

## 3. E2E testing flow
```
aivorah-e2e-tests (canonical, Playwright) → real UI interaction → aivorah-frontend (served locally or preview-deployed) → whichever backend that feature actually uses (microservice or monolith, per flows 1/2 above)
```
`aivorah-frontend/e2e/` currently ALSO runs a copy of this suite (embedded, non-canonical — see `REPO_MAP.md`). Both currently exist; only `aivorah-e2e-tests` is the intended long-term source.

## 4. Database/schema management
```
aivorah-db (Supabase migration/comparison tooling) → Supabase projects (Dev/Test/Prod) ← read/written by both microservices and the monolith directly
```
Not a request-time flow — a schema-management/tooling flow, run separately from the running application.

## Not documented here
Full per-endpoint request/response shapes are not captured in this file (would require reading every route handler — out of scope for an architecture-level doc). See `API_MAP.md` for the current state of API documentation (there is none, no OpenAPI specs exist).
