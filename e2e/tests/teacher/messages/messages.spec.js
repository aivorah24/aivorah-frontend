// Teacher Messages — real teacher-persona flow, per the user's explicit scope:
// "they come to Messages, tap New, see a contact list of student parents, tap a
// contact, type + send a message, can also send files (verified sent AND
// received), and there's a New group channel option to create a group and
// interact in it." No voice/audio-message feature exists anywhere in
// MessagesScreen.tsx (confirmed via search) — nothing to test there.
//
// src/screens/shared/MessagesScreen.tsx is SHARED across 4 personas (student,
// parent, school_admin, teacher) — this suite only exercises it through the
// teacher (and, for the "received" half of the file-send test, parent)
// persona, per today's plan. Refactoring the shared file is a separately-
// scoped follow-up task, not part of this E2E pass.
//
// Every "send" assertion here goes through the REAL UI (type -> tap Send) and
// hits the REAL /messages POST endpoint on the live monolith - nothing in
// this file is mocked. The "received" assertion in the attachment test opens
// the SAME conversation as the real linked parent account and confirms the
// attachment is visible there too, not just in the sender's own view.
//
// Dedicated fixture setup: teacher-b had no real linked PARENT contact at
// all (verified directly against the DB - its contacts list only ever
// returned staff colleagues). Also verified directly: parent-b/student-e are
// NOT actually linked via parent_children right now either, despite the
// accounts.js comment describing that pairing for screen-time tests - that
// link is apparently created and torn down by those tests themselves, not a
// standing fixture. So this suite creates BOTH real links itself:
//   1. teacher-b -> student-e via the real aivorah-students-service
//      link-existing endpoint (same one the Students E2E suite uses).
//   2. parent-b -> student-e via a direct parent_children row (no standalone
//      public "link an existing parent to an existing student" endpoint
//      exists outside the larger school-admin bulk-create flow - same class
//      of problem seedHabitStreak.js/resetProfile.js already solve this way).
// Both are undone in afterAll so teacher-b's roster and parent-b's children
// aren't left permanently changed.

import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import { getStudentIdByEmail } from '../../helpers/api.js';
import { linkParentToChild, unlinkParentFromChild } from '../../helpers/linkParentChild.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  openTeacherMessages,
  newButton,
  newDmOption,
  newChannelOption,
  contactsModal,
  contactRow,
  messageInput,
  sendButton,
  attachButton,
  createChannelModal,
  channelScopeStaff,
  channelNameInput,
  createChannelSubmit,
  channelInput,
  channelSendButton,
} from '../../helpers/teacherMessagesLocators.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEACHER = 'teacher-b';
const PARENT = 'parent-b';
const STUDENT_EMAIL = accountFor('student-e').email;
const PARENT_EMAIL = accountFor(PARENT).email;

const STUDENTS_SERVICE = 'https://aivorah-students-service.onrender.com';
const AVATAR_FIXTURE = path.join(__dirname, '..', '..', 'fixtures', 'test-avatar.jpg');

function uniqueText(base) {
  return `${base} ${Date.now()}`;
}

test.describe('Teacher Messages', () => {
  test.use({ storageState: statePath(TEACHER) });
  test.describe.configure({ mode: 'serial' });

  let studentId;

  test.beforeAll(async ({ request }) => {
    const teacherEmail = accountFor(TEACHER).email;

    // 1. teacher-b -> student-e
    const linkRes = await request.post(
      `${STUDENTS_SERVICE}/teacher/${encodeURIComponent(teacherEmail)}/students/link-existing`,
      { data: { studentEmail: STUDENT_EMAIL } }
    );
    if (!linkRes.ok()) {
      const body = await linkRes.json().catch(() => ({}));
      if (!/already|exists/i.test(body?.error || '')) {
        throw new Error(`Could not link ${STUDENT_EMAIL} to ${teacherEmail}: ${linkRes.status()} ${JSON.stringify(body)}`);
      }
    }

    // 2. parent-b -> student-e (real parent_children row, no public endpoint for this)
    studentId = await getStudentIdByEmail(request, { teacherEmail, studentEmail: STUDENT_EMAIL });
    await linkParentToChild(PARENT_EMAIL, studentId);
  });

  test.afterAll(async ({ request }) => {
    const teacherEmail = accountFor(TEACHER).email;
    if (studentId) {
      await unlinkParentFromChild(PARENT_EMAIL, studentId).catch(() => {});
      await request.delete(`${STUDENTS_SERVICE}/teacher/${encodeURIComponent(teacherEmail)}/students/${studentId}`).catch(() => {});
    }
  });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, TEACHER);
    await openTeacherMessages(page);
    await expect(page.getByText('Conversations', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);
  });

  test('New -> New direct message shows the real contacts list, including the linked parent', async ({ page }) => {
    await newButton(page).click();
    await newDmOption(page).click();
    await expect(contactsModal(page)).toBeVisible();
    await expect(contactRow(page, PARENT_EMAIL)).toBeVisible({ timeout: 10000 });
  });

  test('picking the parent contact opens a real conversation, and a typed message is sent through the real API and appears in the thread', async ({ page }) => {
    await newButton(page).click();
    await newDmOption(page).click();
    await expect(contactsModal(page)).toBeVisible();

    await contactRow(page, PARENT_EMAIL).click();
    await expect(contactsModal(page)).toBeHidden();

    const text = uniqueText('E2E teacher message');
    await messageInput(page).fill(text);
    await sendButton(page).click();

    // Real network call, real response, real render — the same text can
    // legitimately appear twice (thread bubble + conversation-list preview).
    await expect(page.getByText(text, { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });

  test('attaching a real sample file sends it, and the linked parent genuinely receives it in their own view of the same thread', async ({ browser, page }) => {
    // ── Sender side (teacher) ──
    await newButton(page).click();
    await newDmOption(page).click();
    await contactRow(page, PARENT_EMAIL).click();
    await expect(messageInput(page)).toBeVisible();

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      attachButton(page).click(),
    ]);
    await chooser.setFiles(AVATAR_FIXTURE);

    // Attachment preview row appears pre-send, naming the real file.
    await expect(page.getByText('test-avatar.jpg', { exact: false })).toBeVisible({ timeout: 10000 });
    await sendButton(page).click();

    // Attachments never render as an inline <img> — every type (including
    // images) renders as a filename+size+type "attachment bubble" you tap to
    // open in a new tab (see MessagesScreen.tsx's renderMessage). Assert on
    // that real bubble content in the sender's own thread.
    await expect(page.getByText('test-avatar.jpg', { exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/JPG|JPEG/i).first()).toBeVisible();

    // ── Receiver side (real parent account, real separate browser session) ──
    const parentContext = await browser.newContext({ storageState: statePath(PARENT) });
    const parentPage = await parentContext.newPage();
    try {
      await applySession(parentContext, PARENT);
      await parentPage.goto('/parent/messages');
      await expect(parentPage.getByText('Conversations', { exact: true })).toBeVisible({ timeout: 15000 });
      await dismissAnnouncementIfPresent(parentPage);

      const teacherEmail = accountFor(TEACHER).email;
      const teacherConvo = parentPage.getByTestId(`messages-convo-${teacherEmail}`);
      await expect(teacherConvo).toBeVisible({ timeout: 10000 });
      await teacherConvo.click();

      // The parent's own thread view shows the same real attachment bubble -
      // proof it was actually received, not just optimistically rendered for
      // the sender.
      await expect(parentPage.getByText('test-avatar.jpg', { exact: false }).first()).toBeVisible({ timeout: 10000 });
    } finally {
      await parentContext.close();
    }
  });

  test('New -> New group channel creates a real Staff Room channel, and it appears in the inbox (proves a teacher can create a channel/group)', async ({ page }) => {
    const channelName = uniqueText('E2E Staff Room');

    await newButton(page).click();
    await newChannelOption(page).click();
    await expect(createChannelModal(page)).toBeVisible();

    await channelScopeStaff(page).click();
    await channelNameInput(page).fill(channelName);
    await createChannelSubmit(page).click();

    await expect(createChannelModal(page)).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(channelName, { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('opening a newly created channel and sending a message shows it in the thread (interacting in the group)', async ({ page }) => {
    const channelName = uniqueText('E2E Interact Room');

    await newButton(page).click();
    await newChannelOption(page).click();
    await expect(createChannelModal(page)).toBeVisible();
    await channelScopeStaff(page).click();
    await channelNameInput(page).fill(channelName);
    await createChannelSubmit(page).click();
    await expect(createChannelModal(page)).toBeHidden({ timeout: 10000 });

    await page.getByText(channelName, { exact: true }).click();
    await expect(channelInput(page)).toBeVisible({ timeout: 10000 });

    const text = uniqueText('E2E channel message');
    await channelInput(page).fill(text);
    await channelSendButton(page).click();

    await expect(page.getByText(text, { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });
});
