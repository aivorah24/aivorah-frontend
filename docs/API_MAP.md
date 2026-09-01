# API Map

## Status: no formal API documentation exists
No Swagger/OpenAPI spec files were found in any of the 19 repos audited this session (frontend, monolith, 15 microservices, E2E repo, db repo). This is a genuine documentation gap, not an oversight in this pass — confirmed absent, not assumed absent.

## How to find real endpoints for a given feature
There is no central spec to consult. To find a feature's actual endpoints:
1. Identify the owning backend from `SERVICE_MAP.md` (microservice) or `DATA_FLOW.md` (monolith/legacy).
2. Read that repo's route files directly (e.g. `routes/*.js` in a microservice, or `ai-mentor/server/routes/*.js` for monolith features) — use targeted `Read`/`Grep`, not a full-repo dump.
3. Cross-check against the frontend's matching `src/*Service.ts` for the actual `fetch()` calls in use (a route existing in the backend doesn't mean the frontend calls it).

## Recommendation (not actioned this session)
If per-service API documentation becomes a priority, generating OpenAPI specs would be a dedicated, scoped task per repo — not part of this documentation-only pass, and not to be started without explicit request.
