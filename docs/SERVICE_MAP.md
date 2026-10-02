# Service Map

Each service = 1 repo, Render-deployed. "Consumers" = frontend feature areas that call it (verified via `grep` of `src/config/*ServerUrl.ts` imports across `aivorah-frontend`). "Dependencies" = other services/external systems it calls — **only sampled, not exhaustively checked for all 15** (see note at bottom).

| Service | Responsibility | Port | Consumers (frontend) | Dependencies |
|---|---|---|---|---|
| `aivorah-auth-service` | Login, signup, email verify, password reset, `/user/sync` (role/onboarding resolution) | 4001 | Auth/Onboarding, Settings/Profile | Firebase Admin SDK, Supabase, Resend (email), SMTP fallback (`EMAIL_USER`/`EMAIL_PASS`). **No calls to other microservices found.** |
| `aivorah-profile-service` | Profile CRUD, `/user/preferences`, notification settings | 4002 | Profile, Settings, Header, Notifications, Onboarding, Teacher Students/Assignments (partial) | Supabase |
| `aivorah-leaderboard-service` | Rankings, XP, student dashboard stats | 4003 | Student Dashboard, Leaderboard, Learning Paths, Progress | Supabase |
| `aivorah-challenges-service` | Challenges, quiz sessions | 3008 | Student Challenges | Supabase |
| `aivorah-world-and-you-service` | Daily tidbits, tidbit quiz | 3010 | World & You | Supabase |
| `aivorah-bedtime-stories-service` | Story content, reader | 3011 | Bedtime Stories | Supabase |
| `aivorah-daily-habits-service` | Habit tracking; **has `/parent-tasks` routes matching Parent Daily Tasks' needs** (unmigrated frontend feature, monolith calls `/habits/parent-tasks` — likely same logical routes under a different path prefix, payload compatibility unverified) | 3012 | Student Daily Habits | Supabase |
| `aivorah-help-center-service` | Student help chat, support tickets | 3013 | Help Center | Supabase, likely an LLM provider (unconfirmed) |
| `aivorah-learning-paths-service` | Curriculum/syllabus, lesson content, quiz (content side); student Read Aloud (`/read-aloud/*`, Firebase-token auth) | 3014 | Learning Paths, Subject Syllabus, Lesson screen, Quiz, Read Aloud | Supabase, Qdrant (likely, unconfirmed) |
| `aivorah-assignments-service` | Assignment CRUD; has `generate-quiz` but **not** the full worksheet-upload/AI pipeline (docx-to-pdf, pdf-to-quiz, extract-questions-async, etc. — still monolith) | 3015 | Student + Teacher Assignments (mixed backend — largest remaining monolith dependency of any migrated feature) | Supabase |
| `aivorah-teacher-dashboard-service` | Teacher dashboard, student-progress heatmap; extracted from monolith 2026-08-24 | 3016 | Teacher Dashboard, Student Progress, Teacher Schedule (partial) | Supabase, Qdrant (syllabus topic lookups) |
| `aivorah-students-service` | Teacher-side roster (create/link/bulk-import/remove/promote). **Does not yet have parent-side child-management routes** (credentials, resend, reset-password, init-auth) — those remain monolith-only | 3017 | Teacher Students | Supabase |
| `aivorah-messages-service` | DMs + channels, all personas | 3020 | Messages (shared) | Supabase |
| `aivorah-schedule-service` | Scheduling/calendar | 3009 | Student + Teacher Schedule | Supabase |
| `aivorah-ai-coach-service` | AI coach chat | 3007 ⚠️ | Student AI Coach | Likely an LLM provider (unconfirmed) |

## Dependency graph verification status
**Sampled, not exhaustive.** Only `aivorah-auth-service` was directly grepped for outbound calls to other services' hosts/ports — zero found (its only URL reference is to itself, in a smoke test). This is *consistent with* a frontend-hub architecture (frontend calls each service directly, services don't call each other), but the other 14 services were **not individually re-checked** in this pass due to context budget. Treat "no service-to-service calls" as a working hypothesis with one data point, not a verified fact for all 15 — re-check the specific service in question before relying on this for a real task.

## External systems (verified for `aivorah-auth-service` only, this session)
Firebase (Admin SDK), Supabase, Resend, SMTP fallback. **Not yet verified for the other 14 services** — each likely has its own subset (Cloudinary, Groq, Gemini, ElevenLabs, Qdrant were named in a user-drawn diagram as candidates but not individually confirmed per-service here).
