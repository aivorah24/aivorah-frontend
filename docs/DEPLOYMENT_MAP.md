# Deployment Map

| Component | Platform | Evidence |
|---|---|---|
| `aivorah-frontend` | **Vercel** | `vercel.json` present at repo root |
| All 15 microservices | **Render** | Each has a `*.onrender.com` `LIVE_SERVICE` URL in its matching `src/config/*ServerUrl.ts` (frontend) |
| `ai-mentor/server` (monolith, Node) | **GCP Cloud Run** | `Dockerfile` + `cloudbuild.yaml` present at repo root |
| `ai-mentor/backend` (Python/FastAPI) | **UNKNOWN / UNCONFIRMED** | Only a `docker-compose.yml` found (local-dev orchestration) — no `Dockerfile`, no cloud deploy config. Do not assume a deployment target; this is a genuine gap. |
| `aivorah-e2e-tests` | N/A (test repo) | Has its own dormant `.github/workflows/e2e.yml` (no commits since 2026-08-26) |
| `aivorah-db` | N/A (tooling repo) | Manages Supabase schema across Dev/Test/Prod projects, not itself deployed |

## Supabase projects (referenced across services, per this session's work)
Multiple Supabase projects exist (Dev, Test, Prod-adjacent) — exact full mapping of which service/environment points at which project was not re-verified in this documentation pass. Known from prior session work: a Test project (`vgqrrseziwnljkencqpy`) and a Dev project (`ernsrofvmszhmfhxeehx`) are distinct, both confirmed via the Supabase dashboard. Production's Supabase project was not directly identified.
