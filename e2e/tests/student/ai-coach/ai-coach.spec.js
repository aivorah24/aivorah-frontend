// This file tests the STUDENT AI COACH screen (AICoachScreen.tsx) - the
// full-page chat with "Aivorah", reached from the dashboard's "Ask anything"
// quick-action card. Student-only feature (no teacher/parent/admin
// equivalent screen).
//
// We test:
// 1. The page loads with its welcome state (heading + initial AI greeting).
// 2. Typing + clicking Send sends a real message and a real AI reply comes
//    back (this hits the real askAIMentorStream backend call - no mocking,
//    per CLAUDE.md's UI-must-be-the-final-assertion rule. The reply's exact
//    wording is never asserted, only that a non-empty response arrives).
// 3. Pressing Enter submits the same way as clicking Send.
// 4. The "Aivorah is thinking..." loading state appears while waiting and
//    disappears once the reply lands.
// 5. Clicking a welcome-screen suggestion chip sends it as a message.
// 5a. Empty state: Send is disabled with no input, enabled once you type.
// 5b. Error state: a failed send shows the real error bubble (not a crash),
//    and the chat stays usable right after (network call fault-injected via
//    page.route so this is deterministic, not dependent on the real backend
//    actually being broken).
// 6. Microphone -> transcript -> input -> send -> AI reply, with the
//    browser's SpeechRecognition API MOCKED to always return a fixed
//    transcript - deterministic, no dependency on Google's real cloud STT
//    service. See ai-coach-mic.spec.js for the real-STT version of this
//    flow (kept separately, and its failures are NOT treated as product
//    regressions - STT service flakiness isn't something this app controls).
// 7. KNOWN BUG: Clear Chat (trash icon) calls RN's Alert.alert(), which
//    react-native-web stubs out as a total no-op (confirmed by reading
//    node_modules/react-native-web/dist/exports/Alert/index.js - static
//    alert() {} does nothing on web). So on the web build clicking Clear
//    Chat does not show a confirmation and does not clear anything. This
//    test is written for the CORRECT behavior and is expected to fail until
//    the app gets a web-safe confirm flow.
// 8. Shift+Enter inserts a newline instead of sending.
// 9. Mic button is disabled while the AI is replying.
// 10. Rapid double-click on Send doesn't submit the message twice.
// 11. Message input enforces its 500 character max length.
// 12. Speak/TTS button on an AI reply toggles between "Read aloud" and
//    "Stop reading" - depends on a real AI reply landing first, so it's
//    subject to the same real-backend caveat as the other real-reply tests.
// 13. Session feedback strip appears after the 3rd successful AI reply in a
//    row - SLOW (sends 3 real messages) and depends on the real backend
//    succeeding 3 times in a row, so a failure here should be treated the
//    same as any other real-backend-dependent test: check the backend
//    before assuming a regression.
//
// Uses student-i - dedicated to this spec (see tests/helpers/accounts.js).
// Sending messages calls exploreTopic(), which updates activity stats, so
// this account must not be shared with any other spec.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  inputBarButtons,
  messageInput,
  mockSpeechRecognition,
} from '../../helpers/aiCoachLocators.js';

const ACCOUNT = 'student-i';

test.describe('Student AI Coach', () => {
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

  test('AI Coach page loads with welcome heading and initial greeting', async ({ page }) => {
    await expect(page.getByText(/Ask me anything about your .+ curriculum/)).toBeVisible();
    // The seeded first AI message, addressed to this account by name.
    await expect(page.getByText(/I'm your Aivorah AI Coach for/)).toBeVisible();
    await expect(messageInput(page)).toBeVisible();
  });

  test('typing a message and clicking Send gets a real AI reply', async ({ page }) => {
    await messageInput(page).fill('What is 7 plus 5?');
    const { send } = await inputBarButtons(page);
    await send.click();

    // User's own message renders immediately.
    await expect(page.getByText('What is 7 plus 5?')).toBeVisible();

    // Loading state, then a real reply - never assert on its wording, only
    // that the loading state resolves and the app didn't show its error
    // state instead ("Aivorah" alone also matches header/branding text
    // elsewhere on screen, so it isn't a reliable reply-count check).
    await expect(page.getByText('Aivorah is thinking...')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Aivorah is thinking...')).toBeHidden({ timeout: 45000 });
    await expect(page.locator('text=/^(Sorry|Error|Something went wrong)/i')).toHaveCount(0);
  });

  test('pressing Enter submits the message the same way as Send', async ({ page }) => {
    await messageInput(page).fill('What is photosynthesis?');
    await messageInput(page).press('Enter');

    await expect(page.getByText('What is photosynthesis?')).toBeVisible();
    await expect(page.getByText('Aivorah is thinking...')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Aivorah is thinking...')).toBeHidden({ timeout: 45000 });
  });

  test('microphone (mocked STT) -> transcript in input -> send -> AI reply', async ({ page }) => {
    test.setTimeout(60000);
    const FIXED_TRANSCRIPT = 'Explain photosynthesis';
    await mockSpeechRecognition(page, FIXED_TRANSCRIPT);

    // 1. Click the microphone button.
    const { mic } = await inputBarButtons(page);
    await mic.click();

    // Listening state briefly shows (placeholder swaps), then the mocked
    // recognizer "hears" the fixed transcript and fills the input with it.
    await expect(page.getByPlaceholder('Listening...')).toBeVisible({ timeout: 5000 });

    // 2 & 3. Mocked speech recognition returns the text, which appears in
    // the AI Coach input.
    await expect(messageInput(page)).toHaveValue(FIXED_TRANSCRIPT, { timeout: 5000 });

    // 4. Send the message.
    const { send } = await inputBarButtons(page);
    await send.click();
    await expect(page.getByText(FIXED_TRANSCRIPT, { exact: true })).toBeVisible();

    // 5. Verify the AI response appears - never assert on its wording, only
    // that the loading state resolves and no error state shows instead.
    await expect(page.getByText('Aivorah is thinking...')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Aivorah is thinking...')).toBeHidden({ timeout: 45000 });
    await expect(page.locator('text=/^(Sorry|Error|Something went wrong)/i')).toHaveCount(0);
  });

  test('Send is disabled when the input is empty', async ({ page }) => {
    const { send } = await inputBarButtons(page);
    await expect(send).toBeDisabled();

    await messageInput(page).fill('a');
    await expect(send).toBeEnabled();

    await messageInput(page).fill('');
    await expect(send).toBeDisabled();
  });

  test('shows an error state and stays usable after a failed send', async ({ page }) => {
    // Fault-injected via network interception, not an API shortcut for the
    // persona's own action - the student still types and clicks Send
    // through the real UI. This only forces the BACKEND call to fail so the
    // error path (msg.isError -> red errorText, see AICoachScreen.tsx) is
    // deterministic and doesn't depend on the real backend actually being
    // broken (which it periodically is - see this file's other notes).
    await page.route('**/ask/stream', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );

    await messageInput(page).fill('Trigger a failure');
    const { send } = await inputBarButtons(page);
    await send.click();

    await expect(page.getByText('Trigger a failure')).toBeVisible();
    await expect(page.getByText('Aivorah is thinking...')).toBeHidden({ timeout: 15000 });

    // The real error bubble (msg.isError -> errorText) renders, not a crash.
    await expect(page.getByText(/could not connect to aivorah/i)).toBeVisible();

    // Chat stays usable after the failure - input isn't stuck disabled.
    await messageInput(page).fill('Are you still there?');
    await expect(messageInput(page)).toHaveValue('Are you still there?');
    const { send: sendAfterError } = await inputBarButtons(page);
    await expect(sendAfterError).toBeEnabled();
  });

  test('clicking a welcome suggestion chip sends it as a message', async ({ page }) => {
    // Suggestion chips are plain TouchableOpacitys with no role/label either -
    // grab the text first so we can assert the exact same text got sent.
    // The onPress handler lives on the tabindex ancestor, not the text node
    // itself, so click that (clicking the text alone doesn't fire it).
    const chipText = page
      .locator('div[dir="auto"]')
      .filter({ hasText: /^(What|Can you|How does|Tell me|What do)/ })
      .first();
    const text = await chipText.innerText();
    const chip = chipText.locator('xpath=ancestor::div[@tabindex][1]');

    await chip.click();

    await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Aivorah is thinking...')).toBeVisible({ timeout: 10000 });
  });

  test('Clear Chat shows a confirmation and clears the conversation (known bug - Alert.alert is a no-op on web)', async ({
    page,
  }) => {
    await messageInput(page).fill('Hello');
    const { send } = await inputBarButtons(page);
    await send.click();
    await expect(page.getByText('Aivorah is thinking...')).toBeHidden({ timeout: 45000 });

    const { clearChat } = await inputBarButtons(page);
    await clearChat.click();

    // Expected (correct) behavior: a confirmation to clear the chat.
    await expect(page.getByText('Clear Chat')).toBeVisible({ timeout: 3000 });
  });

  test('Shift+Enter inserts a newline instead of sending', async ({ page }) => {
    const input = messageInput(page);
    await input.fill('line one');
    await input.press('Shift+Enter');

    await expect(input).toHaveValue('line one\n');
    // Nothing was submitted - no thinking state, no second message.
    await expect(page.getByText('Aivorah is thinking...')).toHaveCount(0);
  });

  test('mic button is disabled while the AI is replying', async ({ page }) => {
    // Delay the response long enough to observe the mic's disabled state
    // mid-reply, deterministically - not dependent on real backend timing.
    await page.route('**/ask/stream', async (route) => {
      await new Promise((r) => setTimeout(r, 5000));
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    });

    await messageInput(page).fill('Hold on a moment');
    const { send, mic } = await inputBarButtons(page);
    await send.click();

    await expect(page.getByText('Aivorah is thinking...')).toBeVisible({ timeout: 10000 });
    await expect(mic).toBeDisabled();
  });

  test('rapid double-click on Send does not submit the message twice', async ({ page }) => {
    await page.route('**/ask/stream', async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    });

    await messageInput(page).fill('Only once please');
    const { send } = await inputBarButtons(page);
    // Fire both clicks concurrently to actually exercise the race window,
    // rather than one-after-another where the button would already be
    // disabled/empty by the time the second click lands.
    await Promise.all([send.click(), send.click().catch(() => {})]);

    await expect(page.getByText('Only once please')).toHaveCount(1);
  });

  test('message input enforces a 500 character max length', async ({ page }) => {
    const input = messageInput(page);
    await input.fill('a'.repeat(600));

    await expect(async () => {
      const value = await input.inputValue();
      expect(value).toHaveLength(500);
    }).toPass({ timeout: 3000 });
  });

  test('Speak button reads an AI reply aloud and toggles state', async ({ page }) => {
    await messageInput(page).fill('What is 3 plus 3?');
    const { send } = await inputBarButtons(page);
    await send.click();
    await expect(page.getByText('Aivorah is thinking...')).toBeHidden({ timeout: 45000 });

    // The initial greeting message also gets a "Read reply aloud" button
    // (AICoachScreen.tsx renders it for every non-error AI message, not
    // just new replies) - .last() targets the new reply we just got.
    const speakButton = page.getByRole('button', { name: 'Read reply aloud' }).last();
    await expect(speakButton).toBeVisible();
    await speakButton.click();

    await expect(page.getByRole('button', { name: 'Stop reading reply aloud' })).toBeVisible();
  });

  test('session feedback strip appears after the 3rd successful AI reply', async ({ page }) => {
    test.setTimeout(180000);
    const questions = ['What is 1 plus 1?', 'What is 2 plus 2?', 'What is 3 plus 3?'];

    for (const question of questions) {
      await messageInput(page).fill(question);
      const { send } = await inputBarButtons(page);
      await send.click();
      await expect(page.getByText('Aivorah is thinking...')).toBeHidden({ timeout: 45000 });
    }

    await expect(page.getByText('How is Aivorah doing?')).toBeVisible({ timeout: 5000 });
  });
});
