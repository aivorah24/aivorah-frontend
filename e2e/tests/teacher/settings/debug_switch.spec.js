import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { openTeacherSettings } from '../../helpers/teacherSettingsLocators.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';

test.use({ storageState: statePath('teacher-b') });
test('debug switch dom', async ({ page, context }) => {
  await applySession(context, 'teacher-b');
  await openTeacherSettings(page);
  await dismissAnnouncementIfPresent(page);
  const html = await page.getByTestId('teacher-settings-notif-toggle-teacherMessages').evaluate(el => el.outerHTML);
  console.log('OUTERHTML_START' + html + 'OUTERHTML_END');
});
