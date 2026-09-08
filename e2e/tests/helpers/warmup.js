// Warms up every backend this suite depends on BEFORE global-setup.js starts
// logging test accounts in.
//
// Why this exists: all 14 Render microservices behind the testing
// environment run on Render's FREE plan - confirmed via the Render API
// (services?limit=100 -> serviceDetails.plan === 'free' for all 14).
// Free-tier services spin down after ~15 minutes idle and take 30-60+
// seconds to wake on their next request. Without a warm-up step, that
// wake-up delay lands on whichever test account's login happens to be the
// first real request in - which is exactly what happened to student-d9/
// student-d10 in the 2026-08-26 investigation (see that session's report):
// not a broken account, not a slow one specifically - just unlucky timing
// against a cold or momentarily-saturated free instance.
//
// This fires one lightweight, parallel, retried request at every service
// (plus the frontend itself) up front, on a step that's designed to
// tolerate a 60s+ cold start, so the actual login phase starts against
// already-warm services instead of gambling on a 30s per-login timeout.
//
// A non-2xx/3xx response (404, 401, etc.) still counts as "warm" - we only
// care that the service answered at all, not that this specific path is a
// real route. Every one of these services returns SOMETHING once awake
// (Express's default 404 handler included), so any HTTP response (as
// opposed to a connection error/timeout) is proof of life.

const DEFAULT_TIMEOUT_MS = 20000;
const MAX_ATTEMPTS = 4; // ~ handles a 60-90s cold start via backoff below
const BACKOFF_MS = [0, 3000, 8000, 15000];

// name -> [envVarName, fallback] - same override convention already
// used by tests/helpers/api.js (BACKEND_URL, SCHEDULE_SERVICE_URL, etc.),
// extended here to cover every Render service the app talks to, not just
// the ones api.js calls directly (specs also reach these indirectly, by
// loading real screens through the UI).
//
// The fallback is the real production onrender.com URL, not a local dev
// port. CircleCI's E2E_ENV_FILE is one giant multi-line paste into its UI,
// which has silently truncated before (see .circleci/config.yml's own
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY fallback comment) - if any of
// these *_SERVICE_URL keys get dropped the same way, falling back to a
// dead localhost port means THIS warm-up step silently no-ops for that
// service, the real Render instance never gets woken, and the first real
// request against it (inside the actual test) eats the 30-60s cold-start
// penalty instead - exactly the student-a Learning Paths timeout and the
// parent-a setup-login failure this fallback is meant to prevent. These
// URLs aren't secrets (they're the same public hosts baked into the app's
// own src/config/*.ts), so defaulting to production here is safe - a
// developer running local services still overrides via the env var.
const SERVICES = {
  monolith:         ['BACKEND_URL',                  'https://aivorah.ai'],
  schedule:         ['SCHEDULE_SERVICE_URL',          'https://aivorah-schedule-service.onrender.com'],
  challenges:       ['CHALLENGES_SERVICE_URL',        'https://aivorah-challenges-service.onrender.com'],
  leaderboard:      ['LEADERBOARD_SERVICE_URL',       'https://aivorah-leaderboard-service.onrender.com'],
  assignments:      ['ASSIGNMENTS_SERVICE_URL',       'https://aivorah-assignments-service.onrender.com'],
  profile:          ['PROFILE_SERVICE_URL',           'https://aivorah-profile-service.onrender.com'],
  teacherDashboard: ['TEACHER_DASHBOARD_SERVICE_URL', 'https://aivorah-teacher-dashboard-service.onrender.com'],
  learningPaths:    ['LEARNING_PATHS_SERVICE_URL',    'https://aivorah-learning-paths-service.onrender.com'],
  students:         ['STUDENTS_SERVICE_URL',          'https://aivorah-students-service.onrender.com'],
  dailyHabits:      ['DAILY_HABITS_SERVICE_URL',      'https://aivorah-daily-habits-service.onrender.com'],
  worldAndYou:      ['WORLD_AND_YOU_SERVICE_URL',     'https://aivorah-world-and-you-service.onrender.com'],
  aiCoach:          ['AI_COACH_SERVICE_URL',          'https://aivorah-ai-coach-service.onrender.com'],
  bedtimeStories:   ['BEDTIME_STORIES_SERVICE_URL',   'https://aivorah-bedtime-stories-service.onrender.com'],
  helpCenter:       ['HELP_SERVICE_URL',               'https://aivorah-help-center-service.onrender.com'],
  auth:             ['AUTH_SERVICE_URL',               'https://aivorah-auth-service.onrender.com'],
};

function resolveServiceUrls() {
  return Object.fromEntries(
    Object.entries(SERVICES).map(([name, [envVar, fallback]]) => [
      name,
      process.env[envVar] || fallback,
    ]),
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pingOnce(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // HEAD first (cheapest); some Express apps 404/405 HEAD without a route
    // - GET is the safe universal fallback in that case.
    let res;
    try {
      res = await fetch(url, { method: 'GET', signal: controller.signal });
    } catch (e) {
      throw e;
    }
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}

async function warmOne(name, url) {
  const start = Date.now();
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt]) await sleep(BACKOFF_MS[attempt]);
    try {
      const status = await pingOnce(url, DEFAULT_TIMEOUT_MS);
      return { name, url, ok: true, status, attempts: attempt + 1, ms: Date.now() - start };
    } catch (err) {
      lastError = err;
    }
  }
  return {
    name, url, ok: false, attempts: MAX_ATTEMPTS, ms: Date.now() - start,
    error: lastError?.message || 'unknown error',
  };
}

// Warms every configured backend service AND the frontend baseURL itself,
// all in parallel (there's no shared-resource reason to do this
// sequentially - unlike login, nothing here writes state or shares a
// browser). Returns per-service timing/status; never throws - a warm-up
// failure is logged and surfaced to the caller to decide on, not fatal by
// itself (the login phase's own retry/backoff is the real safety net if a
// service is still cold by the time its account tries to log in).
export async function warmupServices(baseURL) {
  const urls = resolveServiceUrls();
  const targets = [
    ...Object.entries(urls).map(([name, url]) => [name, url]),
    ['frontend', baseURL],
  ];

  const results = await Promise.all(targets.map(([name, url]) => warmOne(name, url)));

  const slow = results.filter((r) => r.ok && r.attempts > 1);
  const failed = results.filter((r) => !r.ok);

  return { results, slow, failed };
}
