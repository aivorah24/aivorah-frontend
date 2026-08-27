// Regression test for Bug #1 (BUGS_AND_FIXES.md): teacher onboarding showed
// "Complete Setup" as successful and let the user through even when the
// server did not actually persist onboarding_complete=true — the client
// hardcoded `onboardingComplete: true` locally instead of trusting the
// PATCH /user/profile response. Next login re-fetched the real (still false)
// server value and bounced the teacher back into onboarding.
//
// This util is the single source of truth both OnboardingTeacherBoxes and
// (per the same defect class) OnboardingStudentBoxes/OnboardingParentBoxes
// should use to decide what to do with a /user/profile "complete" response.

import { resolveOnboardingSaveResult } from '../resolveOnboardingSaveResult';

describe('resolveOnboardingSaveResult', () => {
  test('server confirms onboardingComplete: true -> ok, safe to proceed', () => {
    const result = resolveOnboardingSaveResult({ onboardingComplete: true, curriculum: 'IB MYP' });
    expect(result.ok).toBe(true);
    expect(result.onboardingComplete).toBe(true);
  });

  test('server returns onboardingComplete: false on a 200 -> must NOT proceed as complete', () => {
    const result = resolveOnboardingSaveResult({ onboardingComplete: false, curriculum: 'IB MYP' });
    expect(result.ok).toBe(false);
    expect(result.onboardingComplete).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('server response omits onboardingComplete entirely -> treated as not confirmed', () => {
    const result = resolveOnboardingSaveResult({ curriculum: 'IB MYP' });
    expect(result.ok).toBe(false);
    expect(result.onboardingComplete).toBe(false);
  });

  test('malformed/empty response (e.g. json() fallback {}) -> not confirmed', () => {
    const result = resolveOnboardingSaveResult({});
    expect(result.ok).toBe(false);
  });
});
