# Aivorah Frontend

Expo (React Native + web) app for all Aivorah personas: student, parent, teacher, school admin and platform admin. The web build is what's deployed today.

Architecture, the repo list and deployment maps live in the private `aivorah24/aivorah-handover` repo (`01-overview/architecture/`).

## Tech
- Expo SDK 55, React Native 0.83, TypeScript
- Firebase Auth (`src/config/firebase.ts`)
- Jest + Testing Library for unit/integration tests
- E2E tests live in the separate `aivorah-e2e-tests` repo

## Run locally
```bash
npm ci
npm run web          # Expo web dev server
```
By default web dev calls the **live** backend services. To call services on localhost instead:
```bash
EXPO_PUBLIC_USE_LOCAL_SERVICES=1 npm run web
```
Each `src/config/*ServerUrl.ts` file holds that service's live URL and local port.

## Environment variables
All optional; none are secrets (they are bundled into the client).

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_USE_LOCAL_SERVICES` | `1` = point every service URL at localhost (web dev only) |
| `EXPO_PUBLIC_ASSIGNMENTS_URL` | Override the assignments service URL |
| `EXPO_PUBLIC_STUDENTS_URL` | Override the students service URL |
| `EXPO_PUBLIC_SCHOOL_ADMIN_URL` | Override the school-admin service URL |
| `EXPO_PUBLIC_PARENTAL_CONTROLS_URL` | Override the parental-controls service URL |
| `EXPO_PUBLIC_PLATFORM_ADMIN_URL` | Override the platform-admin service URL |
| `EXPO_PUBLIC_NOTIFICATIONS_V2` | `false` turns off the v2 notifications feed (on by default) |

## Tests
```bash
npm run lint
npm run test:unit
npm run test:integration
npm run test:ci      # what CI runs: lint + unit + integration + web build
```

## Deploy
- **Vercel** builds every push (`vercel.json`, `npm run vercel-build` → `dist/`). `master` = live site, branches get preview URLs.
- **CircleCI** (`.circleci/config.yml`): `build_and_test` runs `test:ci`, then `trigger-e2e` asks `aivorah-e2e-tests` to run its smoke suite against the Vercel preview and report a commit status back.
- Vercel only deploys commits whose author is a member of the Vercel team.

## Folder layout
| Path | Why it exists |
|---|---|
| `App.tsx`, `index.ts` | App entry: providers and root navigator |
| `src/navigation/` | One navigator per persona plus `AppNavigator` (picks the navigator by role) |
| `src/screens/<persona>/<feature>/` | Screens grouped by persona, then feature. Each feature keeps its `components/`, `hooks/` and `__tests__/` next to it |
| `src/screens/shared/` | Screens used by more than one persona (account, messages, announcements, timetable, resources, help) |
| `src/features/` | Feature modules shared across personas (channels, classes, class portfolio) |
| `src/components/` | Reusable UI: `common/` (header, sidebar, drawer) and `schedule/` (shared timetable grid) |
| `src/context/` | React contexts: auth, theme, student data, notifications |
| `src/services/` | API clients and helpers (`authFetch` adds the Firebase token) |
| `src/config/` | One file per backend service URL, plus Firebase and local-service switch |
| `src/hooks/`, `src/utils/`, `src/constants/`, `src/theme/`, `src/data/` | Shared hooks, pure helpers, constants, design tokens and static data |
| `src/.legacy-screens/` | Older screen versions. Navigators no longer use them; a few modules/tests still import from here. Delete once those imports are moved |
| `public/` | Static web files: `landing.html` and offline Vosk speech models |
| `assets/` | App icons, images, audio, sounds and lesson videos |
