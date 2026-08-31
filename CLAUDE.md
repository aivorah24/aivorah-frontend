# Aivorah Frontend — Context Router

This file is an INDEX, not the architecture. Read the relevant `docs/*.md` file on demand — do not read all of them for every task, and do not treat this file as a substitute for them.

## Where things live
- Full repo list + purpose/tech/deploy per repo → `docs/REPO_MAP.md`
- Backend service details (routes, deps, consumers) → `docs/SERVICE_MAP.md`
- High-level diagram + current vs legacy architecture → `docs/SYSTEM_ARCHITECTURE.md`
- What's deployed where (Vercel/Render/GCP/unknown) → `docs/DEPLOYMENT_MAP.md`
- Frontend→service and legacy→monolith request flows → `docs/DATA_FLOW.md`
- API documentation status (no OpenAPI specs exist) → `docs/API_MAP.md`

## Hard architectural rules — do not violate these
1. **E2E tests belong in `aivorah-e2e-tests`.** That is the canonical E2E repo. `aivorah-frontend/e2e/` is an embedded legacy copy from a 2026-08-29 submodule-to-directory conversion — it is NOT canonical, NOT the source of truth, and is a pending cleanup/migration item. Do not add new E2E tests there. Do not describe it as canonical in any future work.
2. **The monolith is `ai-mentor/server`** (Node/Express) + a separate Python half `ai-mentor/backend` (RAG/Qdrant). Never edit the monolith incidentally — only as a deliberate, scoped task. Never add NEW dependencies on it. Check `docs/SERVICE_MAP.md` for whether a feature already has a dedicated microservice before assuming monolith use.
3. **15 microservices, 1 frontend, 1 E2E repo, 1 monolith, 1 db-schema repo = 19 repos total.** Full list in `REPO_MAP.md`.

## Task-scoping rules
- Identify the OWNING repository for a task first (see `REPO_MAP.md`/`SERVICE_MAP.md`) before touching anything.
- Inspect direct dependencies only when the task requires it — do not scan all 19 repos for a single-service task.
- Some items in the architecture docs are marked "sampled/not exhaustively verified" or "unconfirmed" — treat those as genuinely unknown, not as facts, until re-verified.

## Token-efficiency rules (this session and all future ones)
- Prefer targeted `grep`/glob searches over broad directory scans.
- Use `Read` with offset/limit on large files instead of dumping whole files.
- Never `cat` large files or dump full build/test logs — summarize results instead.
- Don't re-read a file already read this session unless it changed.
- Don't run Desktop-wide or repo-wide searches when a targeted path is known.
