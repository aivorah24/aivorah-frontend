// Single source of truth for interpreting the PATCH /user/profile response
// when an onboarding screen sends `complete: true`. The server (see
// aivorah-profile-service/services/profile-service.js) is the only writer of
// `users.onboarding_complete`, so the client must trust its response instead
// of assuming success from a 200 status alone — see BUGS_AND_FIXES.md Bug #1.

export interface OnboardingSaveResponse {
  onboardingComplete?: boolean;
  [key: string]: unknown;
}

export interface OnboardingSaveResult {
  ok: boolean;
  onboardingComplete: boolean;
  error?: string;
}

export function resolveOnboardingSaveResult(saved: OnboardingSaveResponse): OnboardingSaveResult {
  const onboardingComplete = saved?.onboardingComplete === true;
  if (!onboardingComplete) {
    return {
      ok: false,
      onboardingComplete: false,
      error: 'Your profile was saved, but we could not confirm setup as complete. Please try again.',
    };
  }
  return { ok: true, onboardingComplete: true };
}
