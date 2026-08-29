// Microphone / voice-input coverage for the STUDENT AI COACH screen, using
// the REAL browser Web Speech API + Chromium's real fake-audio-capture
// device (not mocked). For the deterministic, mocked-SpeechRecognition
// version of the full mic -> text -> send -> reply flow, see
// ai-coach.spec.js's "microphone (mocked STT)" test instead - that one runs
// under the plain `chromium` project with no external dependency and is
// the one whose failures should be treated as real regressions.
//
// This file exists to prove the real integration still works end-to-end
// (real permission prompts, real SpeechRecognition object, real Google STT
// call) - genuinely valuable when it passes, but its STT-dependent test can
// fail for reasons outside the app's control (see that test's own comment),
// so treat a failure there as "investigate audio fixture / STT service",
// never as an automatic product regression.
//
// AICoachScreen.tsx's mic button (toggleVoice, web-only) uses the browser's
// native Web Speech API (SpeechRecognition/webkitSpeechRecognition) directly
// - there is no server-side STT call to intercept. This ONLY works under the
// `chromium-mic` Playwright project (see playwright.config.js), which
// launches real Chrome (channel: 'chrome') with:
//   --use-fake-device-for-media-stream
//   --use-fake-ui-for-media-stream (auto-grants the mic permission prompt)
//   --use-file-for-fake-audio-capture=tests/fixtures/audio/Recording-6.wav
// Chrome's fake audio capture only accepts WAV, not the original .m4a, so
// Recording-6.m4a was converted (mono, 16kHz, 16-bit PCM) - both files live
// in tests/fixtures/audio/.
//
// This file OWNS running under chromium-mic only (testMatch in
// playwright.config.js) - do not add non-mic tests here, they'd run twice.
//
// Uses student-i (see tests/helpers/accounts.js) - same account as
// ai-coach.spec.js. Both files touch the AI Coach chat, but Playwright
// projects run as separate browser processes/workers, so there's no
// same-account race within a single spec's own test.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import { inputBarButtons, messageInput } from '../../helpers/aiCoachLocators.js';

const ACCOUNT = 'student-i';

test.describe('Student AI Coach - Microphone', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });
    await dismissAnnouncementIfPresent(page);
    await page.getByText('Ask anything', { exact: true }).first().click();
    await expect(page.getByText(/Ask me anything about your .+ curriculum/)).toBeVisible({
      timeout: 15000,
    });
  });

  test('mic button is visible and toggles listening state', async ({ page }) => {
    const { mic } = await inputBarButtons(page);
    await expect(mic).toBeVisible();
    await mic.click();
    // Listening state swaps the placeholder to "Listening..." (see
    // AICoachScreen.tsx's isListening ? 'Listening...' : 'Message Aivorah...').
    await expect(page.getByPlaceholder('Listening...')).toBeVisible({ timeout: 5000 });
  });

  test('microphone -> fake audio capture -> speech-to-text -> message submitted -> AI response', async ({
    page,
    context,
  }) => {
    // The fake-ui-for-media-stream flag auto-grants this, but requesting it
    // explicitly documents the expectation and fails loudly if that flag is
    // ever dropped from the project config.
    await context.grantPermissions(['microphone']);

    const { mic } = await inputBarButtons(page);
    await mic.click();
    await expect(page.getByPlaceholder('Listening...')).toBeVisible({ timeout: 5000 });

    // Web Speech API needs the whole fake audio file to play out and
    // finalize a transcript - recognition.onend() only then copies
    // finalTranscript into the input (see toggleVoice in AICoachScreen.tsx).
    // Recording-6.wav is ~24s; give it real room instead of a fixed guess.
    await expect(page.getByPlaceholder('Listening...')).toBeHidden({ timeout: 40000 });

    // Speech-to-text produced *some* transcript into the input.
    //
    // NOTE: this genuinely calls Google's real cloud speech-recognition
    // service (confirmed separately: recognition.start() only fires
    // onstart/onresult/onerror/onend at all under real Chrome - channel:
    // 'chrome' above - not Playwright's bundled Chromium, which lacks the
    // private API key that endpoint requires). That means this assertion
    // depends on external network service availability and on Google's
    // STT actually recognizing Recording-6.wav's speech content - it is
    // NOT fully deterministic the way the rest of this suite is. Treat a
    // failure here as "investigate audio fixture / STT service", not
    // automatically as a product regression.
    const transcribed = await messageInput(page).inputValue();
    expect(
      transcribed.trim().length,
      'expected a non-empty transcript from the fake audio',
    ).toBeGreaterThan(0);

    const { send } = await inputBarButtons(page);
    await send.click();

    // The transcript became a real sent message, and a real AI reply came
    // back - never assert on either message's exact wording.
    await expect(page.getByText(transcribed.trim(), { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Aivorah is thinking...')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Aivorah is thinking...')).toBeHidden({ timeout: 45000 });
  });

  test('microphone permission denied is handled without crashing the page (known bug - Alert.alert is a no-op on web)', async ({
    page,
    context,
  }) => {
    // Revoke the permission this project's launch args auto-grant, so
    // getUserMedia() rejects and toggleVoice's onerror('not-allowed') path
    // runs (AICoachScreen.tsx lines 316-322).
    await context.clearPermissions();
    await context.grantPermissions([]);

    const { mic } = await inputBarButtons(page);
    await mic.click();

    // Expected (correct) behavior: a visible, on-page message asking the
    // student to allow microphone access. The real code path calls RN's
    // Alert.alert(), which react-native-web stubs to a no-op on web
    // (confirmed via node_modules/react-native-web/dist/exports/Alert),
    // so nothing is shown today - this assertion is expected to fail.
    await expect(page.getByText(/allow microphone access/i)).toBeVisible({ timeout: 5000 });

    // Whatever happens, the rest of the screen must still be usable.
    await expect(messageInput(page)).toBeEditable();
  });
});
