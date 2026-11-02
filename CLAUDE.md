# Aivorah Frontend — guide for AI assistants

Expo (React Native + web) app for every Aivorah persona. Start with `README.md` for run, test, deploy and folder layout.

## Where the docs live
Architecture docs are in the private `aivorah24/aivorah-handover` repo (clone it next to this one):
- Repo list, purpose, deploy target → `01-overview/architecture/REPO_MAP.md`
- Backend services, routes, callers → `01-overview/architecture/SERVICE_MAP.md`
- Diagram, current vs legacy → `01-overview/architecture/SYSTEM_ARCHITECTURE.md`
- What runs where → `01-overview/architecture/DEPLOYMENT_MAP.md`
- Request flows → `01-overview/architecture/DATA_FLOW.md`

Read the one you need, not all of them. Items marked "unconfirmed" or "sampled" are not verified facts.

## Hard rules
1. **E2E tests live only in `aivorah-e2e-tests`.** Do not add Playwright/E2E code here. CircleCI's `trigger-e2e` job asks that repo to test this commit's Vercel preview.
2. **`ai-mentor` is the legacy monolith.** Don't edit it as a side effect of another task, and never add new dependencies on it. Check `SERVICE_MAP.md` for the dedicated `aivorah-*-service` first.
3. **Find the owning repo first** (`REPO_MAP.md`), then change only that repo and the direct dependencies the task needs.
4. **Service URLs** come from `src/config/*ServerUrl.ts`. Don't hardcode service URLs elsewhere.
5. **Tests sit next to the feature** in its `__tests__/` folder. Run `npm run test:ci` before opening a PR.
6. **Never commit secrets.** `EXPO_PUBLIC_*` values are bundled into the client, so they must not be secret.

## Environments
The current Render services + Test Supabase project are the testing environment that users see today. A separate production setup (GCP + production database) is planned; check `DEPLOYMENT_MAP.md` before assuming which one a change affects.

## Personal notes
Put personal preferences in `CLAUDE.local.md` (gitignored), not in this file.
