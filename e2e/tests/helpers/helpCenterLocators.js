// Shared locators for HelpCenterScreen.tsx (screens/student/helpCenter/).
// Icon-only buttons (chat close, chat send, topic-modal close, ticket-modal
// close, search-clear) now carry real accessibilityRole="button" +
// accessibilityLabel props (added alongside this test suite, matching the
// same a11y fix already applied to AICoachScreen.tsx's send/mic/clear-chat
// buttons - see aiCoachLocators.js's header comment). Everything else on
// this screen is plain visible text, so exact-text lookups are used there.

export function searchInput(page) {
  return page.getByPlaceholder('Search topics, questions...');
}

export function clearSearchButton(page) {
  return page.getByRole('button', { name: 'Clear search' });
}

export function chatCard(page) {
  return page.getByText('Chat with Aivorah 24/7', { exact: true });
}

export function ticketCard(page) {
  return page.getByText('Submit a Ticket', { exact: true });
}

// The chat MODAL heading - distinct from the launcher card's "Chat with
// Aivorah 24/7" text (this is just "Aivorah 24/7").
export function chatModalHeading(page) {
  return page.getByText('Aivorah 24/7', { exact: true });
}

export function closeChatButton(page) {
  return page.getByRole('button', { name: 'Close chat' });
}

export function chatInput(page) {
  return page.getByPlaceholder('Ask about XP, streaks, badges...');
}

export function sendChatButton(page) {
  return page.getByRole('button', { name: 'Send message' });
}

export function chatSuggestionChip(page, label) {
  return page.getByText(label, { exact: true });
}

// A chat bubble's text, scoped to the message list (both user and AI
// bubbles render as exact-text nodes with a timestamp beneath).
export function chatBubbleText(page, text) {
  return page.getByText(text, { exact: true });
}

export function topicRow(page, label) {
  return page.getByText(label, { exact: true });
}

export function topicModalHeading(page, label) {
  // The modal header repeats the topic label - scope past the Browse
  // Topics row underneath by taking the last match (modal renders after
  // the topics list in DOM order).
  return page.getByText(label, { exact: true }).last();
}

export function closeTopicModalButton(page) {
  return page.getByRole('button', { name: 'Close topic details' });
}

export function goToTopicButton(page, label) {
  return page.getByText(`Go to ${label}`, { exact: true });
}

export function articleRow(page, articleTitle) {
  return page.getByText(articleTitle, { exact: true });
}

export function noArticlesMessage(page) {
  return page.getByText('No articles for this topic yet.', { exact: true });
}

export function ticketModalHeading(page) {
  return page.getByText('Submit Support Ticket', { exact: true });
}

export function closeTicketModalButton(page) {
  return page.getByRole('button', { name: 'Close ticket form' });
}

export function ticketSubjectInput(page) {
  return page.getByPlaceholder('Brief summary of your issue');
}

export function ticketMessageInput(page) {
  return page.getByPlaceholder('Please provide as much detail as possible...');
}

export function cancelTicketButton(page) {
  return page.getByText('Cancel', { exact: true });
}

export function submitTicketButton(page) {
  return page.getByText('Submit Ticket', { exact: true });
}

export function faqQuestion(page, question) {
  return page.getByText(question, { exact: true });
}

export function faqAnswer(page, answer) {
  return page.getByText(answer, { exact: true });
}

export function noTopicsMessage(page, query) {
  return page.getByText(`No topics match "${query}"`, { exact: true });
}

export function noFaqsMessage(page, query) {
  return page.getByText(`No FAQs match "${query}"`, { exact: true });
}

export function searchCount(page) {
  // e.g. "3 topics · 2 FAQs" - dynamic, matched by pattern not exact text.
  return page.getByText(/^\d+ topics? · \d+ FAQs?$/);
}
