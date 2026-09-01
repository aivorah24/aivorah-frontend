// Teacher Learning Paths — professional-development content viewer.
//
// Fully static content (src/data/teacherCourses.ts), zero backend calls —
// the only thing worth proving is: a teacher navigates here and sees the
// real page (2 course videos, then the course list below). No seed/cleanup
// or account isolation needed; any read-only teacher account works.
//
// Real finding fixed alongside writing this spec (2026-08-26): the screen
// existed on disk and its sidebar link ("Learning Paths" under TEACHING
// DEVELOPMENT) was already wired, but TeacherNavigator.tsx never registered
// a Drawer.Screen for it — the route 404'd. Fixed in the same change (see
// TeacherNavigator.tsx diff), not a pre-existing "known" gap.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  openTeacherLearningPaths,
  courseCard,
  courseModal,
  videoSection,
} from '../../helpers/teacherLearningPathsLocators.js';

const ACCOUNT = 'teacher-a';

test.describe('Teacher Learning Paths', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test('a teacher opening Learning Paths sees both course videos and the course list below', async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await openTeacherLearningPaths(page);
    await expect(page.getByText('Learning Paths', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    // The 2 course videos.
    await expect(videoSection(page, 'course-1')).toBeVisible();
    await expect(page.getByText('From Average Prompts to Outstanding Teaching')).toBeVisible();
    await expect(videoSection(page, 'course-2')).toBeVisible();
    await expect(page.getByText('Create Engaging Learning Experiences with AI')).toBeVisible();

    // The course list below.
    await expect(page.getByText('Learning Path Overview')).toBeVisible();
    await expect(courseCard(page, 'meet-ai')).toBeVisible();
    await expect(courseCard(page, 'chatgpt')).toBeVisible();

    // Tapping a course opens its real lesson content.
    await courseCard(page, 'claude').click();
    await expect(courseModal(page)).toBeVisible();
    await expect(courseModal(page).getByText('Claude for Teachers', { exact: true })).toBeVisible();
  });
});
