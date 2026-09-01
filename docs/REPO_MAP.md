# Repository Map

**19 repositories total** (corrected — an earlier audit pass miscounted as 17; `aivorah-db` was initially missed). All live as sibling directories on Desktop, each its own git repo with its own GitHub remote (`github.com/aivorah24/...`).

## Frontend
**`aivorah-frontend`** — React Native/Expo app (web + native). Deployed on Vercel (`vercel.json` confirmed). Owns all UI, `src/config/*ServerUrl.ts` files that route each feature to its backend. Has its own repo-level `CLAUDE.md` (this file's parent).

## E2E testing — canonical vs legacy (read this carefully)
- **`aivorah-e2e-tests` — CANONICAL.** Standalone Playwright E2E repo. Real, ongoing commit history (Teacher Schedule E2E, Assignments E2E, CI infra fixes) through 2026-08-26. Has its own `.github/workflows/e2e.yml`, `README.md`, `playwright.config.js`. **This is where new E2E work belongs.**
- **`aivorah-frontend/e2e/` — NOT a repository, NOT canonical.** A directory inside `aivorah-frontend`, embedded on 2026-08-29 when a prior git-submodule reference (pointing at `aivorah-e2e-tests`) was converted into a plain copied-in directory (commit `a89487c`, "fix: add e2e files properly instead of submodule"). `aivorah-frontend`'s live CI (`ci.yml`) currently runs E2E out of this embedded copy — that's an artifact of the migration, not a design decision. **This copy is a pending cleanup item**: it must eventually be reconciled with `aivorah-e2e-tests` and removed. Do not add new tests here. Do not describe it as canonical.

## The monolith (2 halves, 1 repo)
**`ai-mentor`** — the original single backend, being migrated feature-by-feature into microservices.
- `ai-mentor/server` — Node/Express, the actual monolith API. Deployed on GCP Cloud Run (`Dockerfile` + `cloudbuild.yaml` confirmed present).
- `ai-mentor/backend` — separate Python/FastAPI service (RAG/content-ingestion, uses Qdrant). Unrelated codebase to `server/`, don't confuse them. Only a `docker-compose.yml` found (local-dev orchestration) — **deployment target unconfirmed**, not guessed.

## Database/schema
**`aivorah-db`** — Supabase schema/migrations management (has `supabase/` dir, comparison/migration scripts). Manages schema for the Dev/Test/Prod Supabase projects used across the microservices and monolith. Not a running service — a tooling repo.

## 15 backend microservices
All Render-deployed (`*.onrender.com`), one repo each, each with its own frontend config file (`src/config/*ServerUrl.ts` in `aivorah-frontend`):

| Repo | Frontend config | Local port |
|---|---|---|
| `aivorah-auth-service` | `authServerUrl.ts` | 4001 |
| `aivorah-profile-service` | `profileServerUrl.ts` | 4002 |
| `aivorah-leaderboard-service` | `leaderboardServiceUrl.ts` | 4003 |
| `aivorah-challenges-service` | `challengesServerUrl.ts` | 3008 |
| `aivorah-world-and-you-service` | `worldAndYouServerUrl.ts` | 3010 |
| `aivorah-bedtime-stories-service` | `bedtimeStoriesServerUrl.ts` | 3011 |
| `aivorah-daily-habits-service` | `dailyHabitsServerUrl.ts` | 3012 |
| `aivorah-help-center-service` | `helpServiceUrl.ts` | 3013 |
| `aivorah-learning-paths-service` | `learningPathsServerUrl.ts` | 3014 |
| `aivorah-assignments-service` | `assignmentsServerUrl.ts` | 3015 |
| `aivorah-teacher-dashboard-service` | `teacherDashboardServerUrl.ts` | 3016 |
| `aivorah-students-service` | `studentsServerUrl.ts` | 3017 |
| `aivorah-messages-service` | `messagesServerUrl.ts` | 3020 |
| `aivorah-schedule-service` | `scheduleServerUrl.ts` | 3009 |
| `aivorah-ai-coach-service` | `aiCoachServerUrl.ts` | 3007 ⚠️ collides with monolith's local port |

Details (responsibility, dependencies, consumers) per service → `SERVICE_MAP.md`.

## Count reconciliation
1 frontend + 1 E2E (canonical) + 1 monolith (2 halves, 1 repo) + 1 db-schema + 15 microservices = **19**.
