// This file tests the STUDENT HELP CENTER screen
// (screens/student/helpCenter/HelpCenterScreen.tsx + its hooks/components) -
// search, the "Chat with Aivorah 24/7" AI support modal, the "Submit a
// Ticket" support-ticket modal, Browse Topics (topic detail modal + article
// expand/collapse + "Go to X" navigation), and the FAQ accordion.
//
// ── Business rules confirmed by reading the source ──────────────────────
// - Search (HelpCenterScreen.tsx's filteredTopics/filteredFaqs) filters
//   BOTH topics and FAQs from a single input, case-insensitively, matching
//   topic label/desc/article titles OR FAQ question/answer text. The counter
//   text ("N topics · M FAQs") only renders once search.length > 0.
// - The AI chat (useHelpChat.ts) POSTs to /help/chat and renders
//   `data.reply || data.error || 'Something went wrong.'` on success, or a
//   fixed "Could not reach support. Please try again." on a network-level
//   throw (fetch rejection / abort) - two DIFFERENT failure copy paths for
//   two different failure modes, confirmed from source.
// - Chat and ticket form state live in the parent screen's hooks, not the
//   modal components - closing and reopening either modal does NOT reset
//   the conversation history or the typed ticket fields (only a successful
//   ticket submit clears the ticket fields). Confirmed from useHelpChat.ts /
//   useSupportTicket.ts holding this state outside the Modal's visible prop.
// - Ticket validation (useSupportTicket.ts's handleSubmitTicket): empty
//   subject or empty message calls Alert.alert(...) and returns before any
//   network call - see KNOWN APPLICATION BUG below for why this produces no
//   visible feedback on web.
// - Ticket success (200 + {success:true}): ticketVisible is set to false
//   and the subject/message fields are cleared BEFORE Alert.alert() runs -
//   so the modal closing is real, observable, and independent of the (web
//   no-op) confirmation alert.
// - Ticket failure (non-200, or {success:false}): the catch block does NOT
//   touch ticketVisible or the field values - the modal stays open with
//   whatever the student had typed, only ticketLoading resets. Confirmed
//   from source (no setTicketVisible/setTicketSubject/setTicketMessage
//   calls in the catch branch).
// - FAQ accordion (openFaq: number | null in HelpCenterScreen.tsx) allows
//   only ONE open FAQ at a time - opening a second closes the first.
// - Topic modal articles come from a static per-topic array (constants.ts's
//   buildTopics()); "Go to {label}" navigates via
//   navigation.navigate(topic.screen) using a per-topic `screen` field, then
//   closes the modal - confirmed each of the 8 topics maps to a real
//   registered screen name (AppNavigator.tsx).
//
// ── KNOWN APPLICATION BUGS (found while reading the source, reported not
// worked around) ──────────────────────────────────────────────────────────
// 1. Ticket validation/success/failure all go through RN's Alert.alert(),
//    which react-native-web stubs as a total no-op (same confirmed root
//    cause as AI Coach's Clear Chat bug - see ai-coach.spec.js). On the web
//    build: submitting an empty ticket shows NO error at all (silently does
//    nothing, no network call, no visible feedback); a successful submit
//    closes the modal but shows no "Ticket Submitted" confirmation; a failed
//    submit leaves the modal open with no visible error message either.
//    Tests below are written for the CORRECT behavior where applicable and
//    marked as expected to fail until the app gets a web-safe alert/confirm
//    flow, same convention as ai-coach.spec.js's Clear Chat test.
// 2. (Fixed as part of this same change, documented here for traceability)
//    The "Billing & Plans" topic previously listed the AI Coach topic's 4
//    articles verbatim (copy-paste bug in the old TOPICS array) - a student
//    opening Billing & Plans saw "What the AI Coach can do" / "AI Coach
//    limitations" instead of anything about billing. Fixed by clearing the
//    article list rather than inventing unauthored billing copy (no billing
//    content exists anywhere in ARTICLE_CONTENT). The "no articles" empty
//    state is a real, correct, testable state as of this change.
//
// ── Test data strategy ──────────────────────────────────────────────────
// Two kinds of tests, per this task's own instructions (deterministic data,
// not hardcoded production values, not one test per article/FAQ):
//   1. MOCKED /help/chat and /help/ticket responses (page.route) for
//      anything about validation, loading states, error handling, and
//      state-persistence rules - full determinism, no dependency on the
//      real Groq LLM's wording or on sending real email every run.
//   2. ONE real-network test for AI chat (proves the UI is wired to the
//      real backend, per this project's AI-features convention - see
//      ai-coach.spec.js - never asserting on the AI's exact wording, only
//      that a non-empty reply lands with no error class) and ONE real
//      end-to-end ticket submission (proves the real POST /help/ticket path
//      works and really emails support - subject is tagged
//      "[E2E TEST - ignore]" so a human skimming the support inbox can tell
//      it's not a real student issue).
//
// Uses student-a - the shared, explicitly read-only account (mutable:
// false in accounts.js). Nothing in this spec writes to student_stats,
// habits, challenges, or any other feature's data - the chat endpoint is
// stateless and the ticket endpoint only sends an email - so this spec
// never needs exclusive ownership of a mutable account.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  searchInput,
  clearSearchButton,
  chatCard,
  ticketCard,
  chatModalHeading,
  closeChatButton,
  chatInput,
  sendChatButton,
  chatSuggestionChip,
  chatBubbleText,
  topicRow,
  topicModalHeading,
  closeTopicModalButton,
  goToTopicButton,
  articleRow,
  noArticlesMessage,
  ticketModalHeading,
  closeTicketModalButton,
  ticketSubjectInput,
  ticketMessageInput,
  cancelTicketButton,
  submitTicketButton,
  faqQuestion,
  faqAnswer,
  noTopicsMessage,
  noFaqsMessage,
  searchCount,
} from '../../helpers/helpCenterLocators.js';

const ACCOUNT = 'student-a';

async function openHelpCenter(page) {
  // '/help-center' does not collide with any backend REST route (the real
  // API is at '/help/chat' and '/help/ticket', different paths - confirmed
  // by reading server/index.js) - direct goto is safe, same reasoning as
  // Leaderboard/Daily Habits' own open*() helpers.
  await page.goto('/help-center');
  await expect(page.getByText('How can we', { exact: false }).first()).toBeVisible({ timeout: 15000 });
  await dismissAnnouncementIfPresent(page);
}

async function mockChat(page, body, { status = 200 } = {}) {
  await page.route('**/help/chat', (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

async function mockTicket(page, body, { status = 200 } = {}) {
  await page.route('**/help/ticket', (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

test.describe('Student Help Center - page load, search', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('page loads with header, hero, search, support cards, all topics, and all FAQs', async ({ page }) => {
    await openHelpCenter(page);

    await expect(page.getByText('Help Center', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/We're here to support you, .+\./)).toBeVisible();
    await expect(page.getByText('How can we', { exact: false })).toBeVisible();
    await expect(searchInput(page)).toBeVisible();

    await expect(page.getByText('Still need help?', { exact: true })).toBeVisible();
    await expect(chatCard(page)).toBeVisible();
    await expect(ticketCard(page)).toBeVisible();

    await expect(page.getByText('Browse Topics', { exact: true })).toBeVisible();
    for (const label of [
      'Account & Profile', 'XP & Streaks', 'Badges', 'Learning Paths',
      'Billing & Plans', 'Technical Support', 'Assignments', 'AI Coach',
    ]) {
      await expect(topicRow(page, label)).toBeVisible();
    }

    await expect(page.getByText('Frequently Asked Questions', { exact: true })).toBeVisible();
    await expect(faqQuestion(page, 'How do I start a new learning path?')).toBeVisible();
    await expect(faqQuestion(page, 'How do I contact a human support agent?')).toBeVisible();
  });

  test('sidebar "Help Center" link navigates to the real screen', async ({ page }) => {
    await page.goto('/dashboard');
    await dismissAnnouncementIfPresent(page);
    // Two copies of the sidebar exist at once (mobile + desktop layout) -
    // same duplicate-layout situation dashboard.spec.js/leaderboard.spec.js
    // document for this app.
    await page.getByText('Help Center', { exact: true }).filter({ visible: true }).last().click();

    await expect(page.getByText('How can we', { exact: false })).toBeVisible({ timeout: 15000 });
  });

  test('search filters both Browse Topics and FAQs together, with a live count', async ({ page }) => {
    await openHelpCenter(page);

    await searchInput(page).fill('XP');

    await expect(searchCount(page)).toBeVisible();
    // "XP" matches XP & Streaks (label), Badges (article: "How XP points are
    // calculated"), and Billing & Plans should NOT match (its articles are
    // now empty - proves the bug-fix removed the old mismatched content
    // that used to make it match "XP" via "How XP points are calculated").
    await expect(topicRow(page, 'XP & Streaks')).toBeVisible();
    await expect(topicRow(page, 'Badges')).toBeVisible();
    await expect(topicRow(page, 'Billing & Plans')).toHaveCount(0);
    await expect(topicRow(page, 'Learning Paths')).toHaveCount(0);

    // FAQ #2's question text itself contains "XP".
    await expect(faqQuestion(page, 'How are XP points and levels calculated?')).toBeVisible();
    await expect(faqQuestion(page, 'Can I change my study schedule?')).toHaveCount(0);
  });

  test('clearing the search restores the full topic and FAQ lists', async ({ page }) => {
    await openHelpCenter(page);

    await searchInput(page).fill('XP');
    await expect(topicRow(page, 'Learning Paths')).toHaveCount(0);

    await clearSearchButton(page).click();

    await expect(searchInput(page)).toHaveValue('');
    await expect(searchCount(page)).toHaveCount(0);
    await expect(topicRow(page, 'Learning Paths')).toBeVisible();
    await expect(faqQuestion(page, 'Can I change my study schedule?')).toBeVisible();
  });

  test('a query matching nothing shows both empty states with the real copy', async ({ page }) => {
    await openHelpCenter(page);

    await searchInput(page).fill('zzz-no-such-topic-or-faq-zzz');

    await expect(noTopicsMessage(page, 'zzz-no-such-topic-or-faq-zzz')).toBeVisible();
    await expect(noFaqsMessage(page, 'zzz-no-such-topic-or-faq-zzz')).toBeVisible();
    await expect(searchCount(page)).toHaveText('0 topics · 0 FAQs');
  });
});

test.describe('Student Help Center - Aivorah 24/7 chat (mocked, deterministic)', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('opens with the seeded greeting and all 5 quick-suggestion chips', async ({ page }) => {
    await openHelpCenter(page);
    await chatCard(page).click();

    await expect(chatModalHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Your AI support assistant', { exact: true })).toBeVisible();
    await expect(page.getByText(/Hi! I'm your Aivorah 24\/7/)).toBeVisible();
    for (const label of ['About XP', 'About badges', 'Learning paths', 'How XP works?', 'Daily streaks']) {
      await expect(chatSuggestionChip(page, label)).toBeVisible();
    }
    await expect(chatInput(page)).toBeVisible();
  });

  test('clicking a suggestion chip sends its exact label as a user message and renders the mocked reply', async ({ page }) => {
    await mockChat(page, { reply: 'XP is earned by completing lessons, assignments, and challenges.' });
    await openHelpCenter(page);
    await chatCard(page).click();
    await expect(chatModalHeading(page)).toBeVisible({ timeout: 10000 });

    await chatSuggestionChip(page, 'About XP').click();

    await expect(chatBubbleText(page, 'About XP')).toBeVisible();
    await expect(chatBubbleText(page, 'XP is earned by completing lessons, assignments, and challenges.')).toBeVisible();
  });

  test('typing a message and clicking Send posts it and renders the mocked reply', async ({ page }) => {
    await mockChat(page, { reply: 'Streaks reset if you miss a day.' });
    await openHelpCenter(page);
    await chatCard(page).click();
    await expect(chatModalHeading(page)).toBeVisible({ timeout: 10000 });

    await chatInput(page).fill('What happens to my streak if I miss a day?');
    await sendChatButton(page).click();

    await expect(chatBubbleText(page, 'What happens to my streak if I miss a day?')).toBeVisible();
    await expect(chatBubbleText(page, 'Streaks reset if you miss a day.')).toBeVisible();
    // Input clears after sending.
    await expect(chatInput(page)).toHaveValue('');
  });

  test('pressing Enter submits the message the same way as Send', async ({ page }) => {
    await mockChat(page, { reply: 'Badges are earned at milestones.' });
    await openHelpCenter(page);
    await chatCard(page).click();
    await expect(chatModalHeading(page)).toBeVisible({ timeout: 10000 });

    await chatInput(page).fill('How do badges work?');
    await chatInput(page).press('Enter');

    await expect(chatBubbleText(page, 'How do badges work?')).toBeVisible();
    await expect(chatBubbleText(page, 'Badges are earned at milestones.')).toBeVisible();
  });

  test('Send is disabled with empty input and enabled once text is typed', async ({ page }) => {
    await openHelpCenter(page);
    await chatCard(page).click();
    await expect(chatModalHeading(page)).toBeVisible({ timeout: 10000 });

    await expect(sendChatButton(page)).toBeDisabled();
    await chatInput(page).fill('a');
    await expect(sendChatButton(page)).toBeEnabled();
    await chatInput(page).fill('');
    await expect(sendChatButton(page)).toBeDisabled();
  });

  test('shows a loading indicator while waiting for the reply, then resolves', async ({ page }) => {
    await page.route('**/help/chat', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply: 'Delayed reply.' }) });
    });
    await openHelpCenter(page);
    await chatCard(page).click();
    await expect(chatModalHeading(page)).toBeVisible({ timeout: 10000 });

    await chatInput(page).fill('Trigger the loading state');
    await sendChatButton(page).click();

    await expect(page.getByRole('progressbar').first()).toBeVisible({ timeout: 3000 });
    await expect(chatBubbleText(page, 'Delayed reply.')).toBeVisible({ timeout: 5000 });
  });

  test('a network-level failure (fetch rejects) shows the fixed "could not reach support" fallback', async ({ page }) => {
    await page.route('**/help/chat', (route) => route.abort());
    await openHelpCenter(page);
    await chatCard(page).click();
    await expect(chatModalHeading(page)).toBeVisible({ timeout: 10000 });

    await chatInput(page).fill('This will fail at the network level');
    await sendChatButton(page).click();

    await expect(chatBubbleText(page, 'Could not reach support. Please try again.')).toBeVisible({ timeout: 10000 });
    // Chat stays usable - not stuck loading, input still accepts text.
    await expect(chatInput(page)).toBeEnabled();
  });

  test('a 500 response with an error field renders that error text (not the network fallback)', async ({ page }) => {
    await mockChat(page, { error: 'Support chat unavailable. Please try again.' }, { status: 500 });
    await openHelpCenter(page);
    await chatCard(page).click();
    await expect(chatModalHeading(page)).toBeVisible({ timeout: 10000 });

    await chatInput(page).fill('Trigger a backend error');
    await sendChatButton(page).click();

    // res.json() still succeeds on a 500 with a JSON body - the code reads
    // data.error since data.reply is absent, per source.
    await expect(chatBubbleText(page, 'Support chat unavailable. Please try again.')).toBeVisible({ timeout: 10000 });
  });

  test('closing and reopening the chat keeps the conversation history (state lives outside the modal)', async ({ page }) => {
    await mockChat(page, { reply: 'This should still be here after reopening.' });
    await openHelpCenter(page);
    await chatCard(page).click();
    await expect(chatModalHeading(page)).toBeVisible({ timeout: 10000 });

    await chatInput(page).fill('Remember this message');
    await sendChatButton(page).click();
    await expect(chatBubbleText(page, 'This should still be here after reopening.')).toBeVisible();

    await closeChatButton(page).click();
    await expect(chatModalHeading(page)).toHaveCount(0);

    await chatCard(page).click();
    await expect(chatModalHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(chatBubbleText(page, 'Remember this message')).toBeVisible();
    await expect(chatBubbleText(page, 'This should still be here after reopening.')).toBeVisible();
  });
});

test.describe('Student Help Center - Aivorah 24/7 chat (real backend)', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('a real message gets a real, non-empty AI reply with no error class shown', async ({ page }) => {
    await openHelpCenter(page);
    await chatCard(page).click();
    await expect(chatModalHeading(page)).toBeVisible({ timeout: 10000 });

    await chatInput(page).fill('How does XP work on this platform?');
    await sendChatButton(page).click();

    await expect(chatBubbleText(page, 'How does XP work on this platform?')).toBeVisible();
    // Never assert on the LLM's exact wording - only that a reply landed
    // and neither of the two known failure-copy strings appeared instead.
    await expect(page.getByRole('progressbar').first()).toBeHidden({ timeout: 20000 });
    await expect(page.getByText('Could not reach support. Please try again.', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Something went wrong.', { exact: true })).toHaveCount(0);
  });
});

test.describe('Student Help Center - Submit Support Ticket (mocked, deterministic)', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('opens with the real submitter email and empty fields', async ({ page }) => {
    await openHelpCenter(page);
    await ticketCard(page).click();

    await expect(ticketModalHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`Submitting as: ${accountFor(ACCOUNT).email}`, { exact: false })).toBeVisible();
    await expect(ticketSubjectInput(page)).toHaveValue('');
    await expect(ticketMessageInput(page)).toHaveValue('');
  });

  test('Cancel closes the modal without submitting, and reopening keeps what was typed', async ({ page }) => {
    let ticketCalled = false;
    await page.route('**/help/ticket', (route) => {
      ticketCalled = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await openHelpCenter(page);
    await ticketCard(page).click();
    await expect(ticketModalHeading(page)).toBeVisible({ timeout: 10000 });

    await ticketSubjectInput(page).fill('Draft subject not yet sent');
    await ticketMessageInput(page).fill('Draft message not yet sent');
    await cancelTicketButton(page).click();

    await expect(ticketModalHeading(page)).toHaveCount(0);
    expect(ticketCalled).toBe(false);

    await ticketCard(page).click();
    await expect(ticketModalHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(ticketSubjectInput(page)).toHaveValue('Draft subject not yet sent');
    await expect(ticketMessageInput(page)).toHaveValue('Draft message not yet sent');
  });

  test('a successful submission closes the modal and clears the fields (independent of the no-op web alert)', async ({ page }) => {
    let requestBody = null;
    await page.route('**/help/ticket', (route) => {
      requestBody = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'Support ticket submitted successfully.' }) });
    });
    await openHelpCenter(page);
    await ticketCard(page).click();
    await expect(ticketModalHeading(page)).toBeVisible({ timeout: 10000 });

    await ticketSubjectInput(page).fill('Cannot access my assignments');
    await ticketMessageInput(page).fill('The Assignments tab shows a blank screen after login.');
    await submitTicketButton(page).click();

    // Real, observable success signal: the modal closes (state cleared
    // BEFORE Alert.alert() runs, per source) - not the confirmation text,
    // which Alert.alert() no-ops on web (KNOWN BUG, see file header).
    await expect(ticketModalHeading(page)).toHaveCount(0, { timeout: 10000 });
    expect(requestBody).toMatchObject({
      email: accountFor(ACCOUNT).email,
      subject: 'Cannot access my assignments',
      message: 'The Assignments tab shows a blank screen after login.',
    });

    // Fields were cleared - reopening shows a blank form again.
    await ticketCard(page).click();
    await expect(ticketModalHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(ticketSubjectInput(page)).toHaveValue('');
    await expect(ticketMessageInput(page)).toHaveValue('');
  });

  test('a failed submission (mocked 500) leaves the modal open with the typed values intact', async ({ page }) => {
    await mockTicket(page, { success: false, error: 'Failed to submit support ticket. Please try again.' }, { status: 500 });
    await openHelpCenter(page);
    await ticketCard(page).click();
    await expect(ticketModalHeading(page)).toBeVisible({ timeout: 10000 });

    await ticketSubjectInput(page).fill('Retry-worthy issue');
    await ticketMessageInput(page).fill('This submission will fail once.');
    await submitTicketButton(page).click();

    // The real, observable failure signal: modal stays open with the
    // student's own text still there (matches source - catch block never
    // clears state). The Alert.alert("Submission Failed", ...) text itself
    // is a KNOWN BUG (no-op on web) and is not asserted on here.
    await expect(ticketModalHeading(page)).toBeVisible();
    await expect(ticketSubjectInput(page)).toHaveValue('Retry-worthy issue');
    await expect(ticketMessageInput(page)).toHaveValue('This submission will fail once.');

    // Not stuck in a permanent loading state - Submit is clickable again.
    await expect(submitTicketButton(page)).toBeVisible();
  });

  test('KNOWN BUG: submitting an empty ticket shows no visible validation error at all (Alert.alert is a no-op on web)', async ({ page }) => {
    let ticketCalled = false;
    await page.route('**/help/ticket', (route) => {
      ticketCalled = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await openHelpCenter(page);
    await ticketCard(page).click();
    await expect(ticketModalHeading(page)).toBeVisible({ timeout: 10000 });

    await submitTicketButton(page).click();

    // Expected (correct) behavior would be a visible "subject is required"
    // message. Real (buggy) behavior: nothing happens at all - no request
    // fires, the modal stays open, and there is no error text anywhere.
    await expect(ticketModalHeading(page)).toBeVisible();
    expect(ticketCalled).toBe(false);
    await expect(page.getByText(/subject/i)).toHaveCount(1); // only the field label itself, no error copy
  });

  test('Close (X) button closes the ticket modal the same way as Cancel', async ({ page }) => {
    await openHelpCenter(page);
    await ticketCard(page).click();
    await expect(ticketModalHeading(page)).toBeVisible({ timeout: 10000 });

    await closeTicketModalButton(page).click();

    await expect(ticketModalHeading(page)).toHaveCount(0);
  });
});

test.describe('Student Help Center - Submit Support Ticket (real backend)', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('a real submission reaches the real backend and closes the modal (sends one real support email)', async ({ page }) => {
    await openHelpCenter(page);
    await ticketCard(page).click();
    await expect(ticketModalHeading(page)).toBeVisible({ timeout: 10000 });

    // Tagged so a human skimming the support inbox can tell this is the
    // automated suite, not a real student issue.
    await ticketSubjectInput(page).fill('[E2E TEST - ignore] Automated Help Center suite run');
    await ticketMessageInput(page).fill('This ticket was submitted by the Help Center Playwright suite to prove POST /help/ticket is wired correctly end-to-end. No action needed.');

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/help/ticket')),
      submitTicketButton(page).click(),
    ]);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    await expect(ticketModalHeading(page)).toHaveCount(0, { timeout: 10000 });
  });
});

test.describe('Student Help Center - Browse Topics', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('opening a topic shows its heading, description, and its own articles (not another topic\'s)', async ({ page }) => {
    await openHelpCenter(page);
    await topicRow(page, 'Learning Paths').click();

    await expect(topicModalHeading(page, 'Learning Paths')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Courses, levels, subjects', { exact: true })).toBeVisible();
    for (const article of [
      'Starting a new learning path',
      'Understanding levels (locked, active, complete)',
      'Switching between subjects',
      'Weekly focus and milestones',
    ]) {
      await expect(articleRow(page, article)).toBeVisible();
    }
    // None of AI Coach's articles leak into this topic.
    await expect(articleRow(page, 'What the AI Coach can do')).toHaveCount(0);
  });

  test('clicking an article expands its content inline, clicking again collapses it', async ({ page }) => {
    await openHelpCenter(page);
    await topicRow(page, 'XP & Streaks').click();
    await expect(topicModalHeading(page, 'XP & Streaks')).toBeVisible({ timeout: 10000 });

    const article = articleRow(page, 'How XP points are calculated');
    await article.click();
    await expect(page.getByText('You earn XP for every activity: +10 per correct answer, +25 per lesson, +50 per level, +100 per challenge.', { exact: true })).toBeVisible();

    await article.click();
    await expect(page.getByText('You earn XP for every activity: +10 per correct answer, +25 per lesson, +50 per level, +100 per challenge.', { exact: true })).toHaveCount(0);
  });

  test('BUG FIX VERIFIED: Billing & Plans no longer shows AI Coach\'s articles - it shows the real empty state', async ({ page }) => {
    await openHelpCenter(page);
    await topicRow(page, 'Billing & Plans').click();

    await expect(topicModalHeading(page, 'Billing & Plans')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Subscriptions, upgrades', { exact: true })).toBeVisible();
    await expect(noArticlesMessage(page)).toBeVisible();
    // The bug this replaces: these four AI Coach articles must NOT appear.
    for (const wrongArticle of [
      'What the AI Coach can do',
      'Getting personalized suggestions',
      'AI Coach limitations',
    ]) {
      await expect(articleRow(page, wrongArticle)).toHaveCount(0);
    }
  });

  test('Close button closes the topic modal without navigating away', async ({ page }) => {
    await openHelpCenter(page);
    await topicRow(page, 'Badges').click();
    await expect(topicModalHeading(page, 'Badges')).toBeVisible({ timeout: 10000 });

    await closeTopicModalButton(page).click();

    await expect(topicModalHeading(page, 'Badges')).toHaveCount(0);
    await expect(page.getByText('How can we', { exact: false })).toBeVisible();
  });

  test('"Go to Account & Profile" closes the modal and navigates to the real Settings screen', async ({ page }) => {
    await openHelpCenter(page);
    await topicRow(page, 'Account & Profile').click();
    await expect(topicModalHeading(page, 'Account & Profile')).toBeVisible({ timeout: 10000 });

    await goToTopicButton(page, 'Account & Profile').click();

    await expect(topicModalHeading(page, 'Account & Profile')).toHaveCount(0);
    // Settings screen's own heading proves real navigation happened, not
    // just the modal closing.
    await expect(page.getByText('Settings', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  });

  test('"Go to Learning Paths" navigates to a DIFFERENT real screen, proving the mapping is per-topic not hardcoded', async ({ page }) => {
    await openHelpCenter(page);
    await topicRow(page, 'Learning Paths').click();
    await expect(topicModalHeading(page, 'Learning Paths')).toBeVisible({ timeout: 10000 });

    await goToTopicButton(page, 'Learning Paths').click();

    await expect(topicModalHeading(page, 'Learning Paths')).toHaveCount(0);
    await expect(page).toHaveURL(/learning-paths/i, { timeout: 15000 });
  });
});

test.describe('Student Help Center - FAQ accordion', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('clicking a question expands its answer, clicking again collapses it', async ({ page }) => {
    await openHelpCenter(page);
    const q = faqQuestion(page, 'How does the AI Coach work?');
    await q.scrollIntoViewIfNeeded();
    await q.click();

    await expect(faqAnswer(page, 'The AI Coach uses your progress data to suggest topics, answer questions, and provide personalised learning help. Just type your question in the chat.')).toBeVisible();

    await q.click();
    await expect(faqAnswer(page, 'The AI Coach uses your progress data to suggest topics, answer questions, and provide personalised learning help. Just type your question in the chat.')).toHaveCount(0);
  });

  test('only one FAQ is open at a time - opening a second closes the first', async ({ page }) => {
    await openHelpCenter(page);
    const first = faqQuestion(page, 'How do I start a new learning path?');
    const third = faqQuestion(page, 'Can I change my study schedule?');

    await first.click();
    await expect(faqAnswer(page, 'Go to "My Learning Paths" in the sidebar, then select a subject. Tap "Start" on any available level to begin.')).toBeVisible();

    await third.scrollIntoViewIfNeeded();
    await third.click();
    await expect(faqAnswer(page, 'Yes! Go to Schedule and tap the "+" button to add a new study session. You can set the title, time, duration, and color.')).toBeVisible();
    // The first FAQ's answer closed when the third one opened.
    await expect(faqAnswer(page, 'Go to "My Learning Paths" in the sidebar, then select a subject. Tap "Start" on any available level to begin.')).toHaveCount(0);
  });

  test('scrolling reaches the last FAQ ("How do I contact a human support agent?")', async ({ page }) => {
    await openHelpCenter(page);
    const lastFaq = faqQuestion(page, 'How do I contact a human support agent?');

    await lastFaq.scrollIntoViewIfNeeded();

    await expect(lastFaq).toBeVisible();
  });
});
